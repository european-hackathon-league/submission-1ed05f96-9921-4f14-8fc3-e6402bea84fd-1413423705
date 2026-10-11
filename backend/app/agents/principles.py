"""Principle assessor (L1): rates each feature request against BMW's principles for this series and market.

Inputs: the principles from Supabase (series fundamentals, market principles, Group principles), aggregate request data
(title, category, mention count, backing signal titles: no customer text) and, via a tool, the decision memory from
earlier generations. Output: a fit 0–1 per request with the principle ids it rests on, evidence and assumptions listed
separately, conflicts shown rather than averaged away. `verify` drops principle ids the agent was never given.
The fit replaces the series-focus fallback in the Dixi score's "principle fit" part (web/src/lib/pipeline/scoring.ts).
"""
from dataclasses import dataclass, field
from datetime import UTC, datetime

from pydantic_ai import Agent, RunContext
from pydantic_ai.models import Model

from app.db import Store
from app.models.assess import AssessRequest, AssessResult, AssessorOutput, RequestFit
from app.models.core import Principle
from app.models.signals import MARKET_NAMES, SERIES_NAMES
from app.scoring import build_memory

INSTRUCTIONS = """\
You are Dixi's principle assessor for BMW product managers. For every feature request, judge how well it fits the L1
principles you are given, in this order of weight: series fundamentals (they define the car), then market principles,
then Group principles. Principles are mostly about strategy, brand and market approach; say so when one only touches a
request indirectly instead of stretching it.

For each request return: fit (0 = conflicts, 0.5 = neutral / no principle speaks to it, 1 = strongly supported),
supports and tensions (principle ids only from the list), a rationale of at most 30 words, evidence (facts you used:
a principle's evidence, the mention count, a backing signal) and assumptions (anything you infer that the evidence
does not show). Never present an assumption as evidence. Respect each principle's boundary.

Call get_decision_memory once. If a request was rejected before, mention the reason and whether demand grew since
(state "resurfaced") in `memory`; do not lower the fit for it, the score applies memory separately.
conflicts: cases where strong customer demand meets a principle tension, or markets pull in different directions.
gaps: what the principles do not cover for this series and market. Assess every request id you are given."""


@dataclass
class AssessDeps:
    store: Store
    series: str
    market: str
    memory_calls: int = 0
    memory: dict = field(default_factory=dict)


def build_assessor(model: Model | str) -> Agent[AssessDeps, AssessorOutput]:
    agent = Agent(model, name="principle_assessor", instructions=INSTRUCTIONS, deps_type=AssessDeps, output_type=AssessorOutput)

    @agent.tool
    async def get_decision_memory(ctx: RunContext[AssessDeps]) -> list[dict]:
        """Past keep/reject decisions on this series (and market) from earlier generations, with who, when and why."""
        ctx.deps.memory_calls += 1
        store = ctx.deps.store
        state = await store.get_settings()
        gens = [g.payload for g in await store.list_generations(ctx.deps.series)]
        mem = build_memory(gens, ctx.deps.series, ctx.deps.market, state.settings)
        ctx.deps.memory = mem
        return [{"title": k.split(":", 1)[1], "action": m.action, "reason": m.reason, "by": m.by, "at": m.at,
                 "mentionsAt": m.mentionsAt, "generation": m.generationId} for k, m in mem.items()]

    return agent


def principles_block(principles: list[Principle]) -> str:
    def line(p: Principle) -> str:
        bits = [f"[{p.id}] ({p.level}{'/' + p.market if p.market else ''}) {p.title}: {p.statement}"]
        if p.boundary:
            bits.append(f"  boundary: {p.boundary}")
        if p.evidence:
            bits.append(f"  evidence: {p.evidence[:400]}")
        if p.confidence:
            bits.append(f"  confidence: {p.confidence}")
        return "\n".join(bits)

    order = {"series": 0, "market": 1, "group": 2}
    return "\n".join(line(p) for p in sorted(principles, key=lambda p: (order[p.level], p.id)))


def prompt_for(req: AssessRequest, principles: list[Principle]) -> str:
    rows = "\n".join(
        f"- id={r.id} | {r.title} | {r.category} | {r.mentions} mentions"
        + (f" | backed by: {'; '.join(r.backing)}" if r.backing else "")
        for r in req.requests
    )
    return (
        f"Series: BMW {SERIES_NAMES[req.series]} ({req.series}). Market scope: {MARKET_NAMES.get(req.market, req.market)}.\n\n"
        f"L1 principles:\n{principles_block(principles)}\n\nFeature requests:\n{rows}"
    )


def verify(out: AssessorOutput, req: AssessRequest, principle_ids: set[str]) -> AssessorOutput:
    """Keep only known principle ids and known requests; report what was dropped or missing."""
    known_req = {r.id for r in req.requests}
    gaps = list(out.gaps)
    fits: list[RequestFit] = []
    for f in out.fits:
        if f.requestId not in known_req or any(x.requestId == f.requestId for x in fits):
            continue
        bad = [p for p in f.supports + f.tensions if p not in principle_ids]
        if bad:
            gaps.append(f"Dropped unknown principle ids {', '.join(sorted(set(bad)))} from \"{f.requestId}\".")
        fits.append(f.model_copy(update={"supports": [p for p in f.supports if p in principle_ids],
                                         "tensions": [p for p in f.tensions if p in principle_ids]}))
    missing = [r.title for r in req.requests if r.id not in {f.requestId for f in fits}]
    if missing:
        gaps.append(f"Not assessed (score keeps the series-focus fallback): {', '.join(missing)}.")
    return AssessorOutput(fits=fits, conflicts=out.conflicts, gaps=gaps)


async def run_assessment(agent: Agent[AssessDeps, AssessorOutput], store: Store, req: AssessRequest, model_label: str) -> AssessResult:
    from app.models.core import SCOPE_PRINCIPLE_MARKETS

    principles = await store.list_principles(SCOPE_PRINCIPLE_MARKETS[req.market], req.series)
    if not principles:
        raise LookupError("No L1 principles stored for this series and market (run scripts/seed_principles.py)")
    ids = {p.id for p in principles}
    deps = AssessDeps(store=store, series=req.series, market=req.market)
    result = await agent.run(prompt_for(req, principles), deps=deps)
    checked = verify(result.output, req, ids)
    out = AssessResult(**checked.model_dump(), series=req.series, market=req.market, principleIds=sorted(ids),
                       requestIds=sorted(r.id for r in req.requests), basis=req.basis, model=model_label, generatedAt=datetime.now(UTC).isoformat(timespec="seconds"))
    out.id = await store.save_run("principle_assessments", {
        "series": req.series, "market": req.market, "principle_ids": sorted(ids),
        "request": req.model_dump(mode="json"), "result": out.model_dump(mode="json", exclude={"id"}), "model": model_label})
    return out
