"""Generation analyst: answers a PM's questions about one generation from retrieved facts only.

Tools fetch the facts on demand: the generation (profiles, decisions, priority, wishlist, social test), the L1
principles, the principle assessment and the research run the build used, and the decision memory. Every tool call
records what it retrieved in `deps.sources`; the response lists those, so the PM sees what an answer rests on.
No BMW customer text is available here: stored generations carry no quotes.
"""
from dataclasses import dataclass, field
from typing import Any

from pydantic_ai import Agent, RunContext
from pydantic_ai.models import Model

from app.db import Store
from app.models.chat import ChatOutput, ChatRequest
from app.models.core import SCOPE_PRINCIPLE_MARKETS, Generation
from app.scoring import build_memory

INSTRUCTIONS = """\
You answer a BMW product manager's questions about one Dixi generation (a saved build of car profiles).
Use the tools to look things up; never answer from general knowledge about BMW or cars. Call get_generation first.
Rules:
- Only state facts the tools returned. If the answer is not in them, say so plainly ("This generation does not record …").
- Name your evidence: request titles, principle ids (e.g. EU-03, G60-P1), decision who/when/reason, signal titles.
- Keep evidence and assumptions apart; label anything inferred as "inferred".
- The social test (L3) is simulated; say so when you use it.
- Short answers: a few sentences or a short list. Put the ids you used in `cited`."""


@dataclass
class ChatDeps:
    store: Store
    generation: Generation
    sources: list[str] = field(default_factory=list)

    def note(self, s: str) -> None:
        if s not in self.sources:
            self.sources.append(s)


def _profiles(p: dict[str, Any]) -> list[dict[str, Any]]:
    out = []
    for pr in p.get("profiles", []):
        s = pr.get("score", {})
        out.append({
            "id": pr.get("id"), "name": pr.get("name"), "tagline": pr.get("tagline"),
            "score": {k: round(v, 3) if isinstance(v, float) else v for k, v in s.items()},
            "requirements": [{"priority": r.get("priority"), "title": r.get("title"), "category": r.get("category"),
                              "mentions_in_market": r.get("scoped"), "summary": r.get("summary")} for r in pr.get("requests", [])],
            "wishlist": [w.get("title") for w in pr.get("wishes", [])],
            "backing_signals": [{"title": b.get("title"), "kind": b.get("kind"), "competitor": b.get("competitor"),
                                 "detail": b.get("detail"), "sources": [x.get("url") for x in b.get("sources", [])]}
                                for b in pr.get("backing", [])],
            "why": pr.get("why", []),
            "principles": pr.get("principles"),
        })
    return out


def build_chat_agent(model: Model | str) -> Agent[ChatDeps, ChatOutput]:
    agent = Agent(model, name="generation_analyst", instructions=INSTRUCTIONS, deps_type=ChatDeps, output_type=ChatOutput)

    @agent.tool
    async def get_generation(ctx: RunContext[ChatDeps]) -> dict[str, Any]:
        """The generation: who built it and when, the 3 profiles (scores, requirements in PM priority, wishlist,
        backing signals, why, principle tensions), every decision with reason, the social test if run."""
        g = ctx.deps.generation
        p = g.payload
        ctx.deps.note(f"generation {g.id}")
        decisions = sorted((p.get("decisions") or {}).values(), key=lambda d: d.get("at", ""))
        return {
            "id": g.id, "series": g.series, "series_name": p.get("seriesName"), "market": p.get("scopeLabel", g.market),
            "built_by": g.createdBy, "built_by_role": g.createdByRole, "built_at": g.createdAt,
            "profiles": _profiles(p),
            "decisions": [{"title": d.get("title"), "action": d.get("action"), "reason": d.get("reason"), "by": d.get("by"),
                           "role": d.get("role"), "at": d.get("at"), "mentions_at_decision": d.get("mentionsAt")} for d in decisions],
            "social_test": ("simulated; " + ", ".join(f"{c.get('profileId')}: L3 {round(c.get('l3', 0), 2)}" for c in p["campaigns"]))
            if p.get("campaigns") else "not run",
            "agent_runs": {"assessment": p.get("assessmentId"), "research": p.get("researchRunId")},
        }

    @agent.tool
    async def get_principles(ctx: RunContext[ChatDeps], ids: list[str] | None = None) -> list[dict[str, Any]]:
        """L1 principles for this series and market (all, or only the given ids): statement, boundary, owner, confidence, sources."""
        g = ctx.deps.generation
        rows = await ctx.deps.store.list_principles(SCOPE_PRINCIPLE_MARKETS.get(g.market, ["GLOBAL"]), g.series)
        if ids:
            rows = [p for p in rows if p.id in set(ids)]
        ctx.deps.note("principles " + (", ".join(p.id for p in rows) if ids else f"({len(rows)} for {g.series} · {g.market})"))
        return [{"id": p.id, "level": p.level, "title": p.title, "statement": p.statement, "boundary": p.boundary,
                 "owner": p.owner, "confidence": p.confidence, "sources": [s.label for s in p.sources]} for p in rows]

    @agent.tool
    async def get_assessment(ctx: RunContext[ChatDeps]) -> dict[str, Any]:
        """The principle assessment this build used (or the latest for its series + market): fit per request with
        supporting / strained principle ids, rationale, evidence, assumptions, plus conflicts and gaps."""
        g = ctx.deps.generation
        rid = g.payload.get("assessmentId")
        row = (await ctx.deps.store.get_run("principle_assessments", rid)) if rid else None
        row = row or await ctx.deps.store.latest_run("principle_assessments", g.series, g.market)
        if not row:
            return {"note": "No principle assessment is stored for this generation."}
        ctx.deps.note(f"principle assessment {row['id']}" + ("" if rid == row["id"] else " (latest, not linked to this build)"))
        titles = {r["id"]: r["title"] for r in row.get("request", {}).get("requests", [])}
        res = row["result"]
        return {
            "assessed_at": res.get("generatedAt"), "model": res.get("model"),
            "fits": [{"request": titles.get(f["requestId"], f["requestId"]), "fit": f["fit"], "supports": f["supports"],
                      "tensions": f["tensions"], "rationale": f["rationale"], "evidence": f["evidence"],
                      "assumptions": f["assumptions"], "memory": f.get("memory")} for f in res.get("fits", [])],
            "conflicts": res.get("conflicts", []), "gaps": res.get("gaps", []),
        }

    @agent.tool
    async def get_research(ctx: RunContext[ChatDeps]) -> dict[str, Any]:
        """The live research run (competitors and trends) this build used, or the latest for its series + market."""
        g = ctx.deps.generation
        rid = g.payload.get("researchRunId")
        row = (await ctx.deps.store.get_run("research_runs", rid)) if rid else None
        row = row or await ctx.deps.store.latest_run("research_runs", g.series, g.market)
        if not row:
            return {"note": "No live research run is stored; this build used the saved research. Its backing signals are in get_generation."}
        ctx.deps.note(f"research run {row['id']}" + ("" if rid == row["id"] else " (latest, not linked to this build)"))
        res = row["result"]
        return {"run_at": res.get("generatedAt"), "searches": res.get("searches"),
                "signals": [{"title": s["title"], "kind": s["kind"], "competitor": s.get("competitor"), "detail": s["detail"],
                             "strength": s["strength"], "relates_to": s.get("relatesTo", []),
                             "sources": [x["url"] for x in s.get("sources", [])]} for s in res.get("signals", [])],
                "gaps": res.get("gaps", [])}

    @agent.tool
    async def get_decision_memory(ctx: RunContext[ChatDeps]) -> list[dict[str, Any]]:
        """Decision memory for this series + market across all generations: latest keep/reject per request."""
        g = ctx.deps.generation
        state = await ctx.deps.store.get_settings()
        gens = [x.payload for x in await ctx.deps.store.list_generations(g.series)]
        mem = build_memory(gens, g.series, g.market, state.settings)
        ctx.deps.note(f"decision memory ({len(mem)} requests, {g.series} · {g.market})")
        return [{"request": k.split(":", 1)[1], "action": m.action, "reason": m.reason, "by": m.by, "at": m.at,
                 "generation": m.generationId} for k, m in mem.items()]

    return agent


def prompt_for(req: ChatRequest) -> str:
    lines = []
    if req.history:
        lines.append("Conversation so far:")
        lines += [f"{t.role}: {t.content}" for t in req.history[-8:]]
        lines.append("")
    if req.profileId:
        lines.append(f"The PM is looking at profile '{req.profileId}'.")
    lines.append(f"Question: {req.question}")
    return "\n".join(lines)
