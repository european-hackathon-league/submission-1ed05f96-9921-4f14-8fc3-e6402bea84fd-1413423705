"""Monthly refresh: label new customer comments, count demand per request and market, compare with last month,
optionally re-run research and the principle assessor, and report what changed for the PM.

    load comments ─▶ label (taxonomy rules | OpenAI Decisions API) ─▶ aggregate ─▶ compare with last run
                 ─▶ [research agent per series × market] ─▶ [principle assessor] ─▶ report (+ store in Supabase)

Labels, per comment (Decisions API question types):
  request    choice    which existing feature request it belongs to, or "other" (new / unclear)
  category   choice    Exterior · Interior · Digital · Powertrain
  type       choice    want · difficult · defect · praise
  severity   score     cosmetic … safety (0–4, probability-weighted)
Each choice comes with a confidence; low confidence or "other" puts the comment in the review queue. The job proposes;
the PM decides. Comment text is used only to label and is never stored (feedback_labels holds ids and labels).
CLI: backend/scripts/monthly_refresh.py · docs: docs/architecture/10-backend-agents.md §0.
"""
import asyncio
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Awaitable, Callable, Protocol

from pydantic import BaseModel, Field

from app.models.core import ScoringSettings
from app.scoring import build_memory

CATEGORIES = ["Exterior", "Interior", "Digital", "Powertrain"]
TYPES = {
    "want": "Asks for something that is missing or should be better",
    "difficult": "Says something is hard or confusing to use",
    "defect": "Reports something broken, faulty or unreliable",
    "praise": "Says something is good; no request",
}
SEVERITY = [
    ("cosmetic", "Looks or feels slightly off; no effect on use"),
    ("annoying", "Irritates regularly but the car works"),
    ("hinders use", "Makes a feature hard to use or avoid"),
    ("breakdown", "A function fails or the car must go to the workshop"),
    ("safety", "Could affect safety"),
]
OTHER = "other"


@dataclass
class Comment:
    id: str
    series: str
    market: str
    text: str
    #: Request id from BMW's taxonomy mapping (data script), when known: used by the rules labeler and to compare.
    taxonomy_request: str | None = None
    #: Feedback type from the BMW export, when known.
    taxonomy_type: str | None = None


@dataclass
class RequestDef:
    id: str
    series: str
    title: str
    category: str
    summary: str = ""


class Label(BaseModel):
    comment_id: str
    series: str
    market: str
    request_id: str | None
    request_conf: float | None = None
    category: str | None = None
    category_conf: float | None = None
    feedback_type: str | None = None
    type_conf: float | None = None
    severity: float | None = None
    severity_label: str | None = None
    needs_review: bool = False


class Labeler(Protocol):
    name: str

    async def label(self, comments: list[Comment], catalog: list[RequestDef]) -> list[Label]: ...


# ------------------------------------------------------------------ labelers


class TaxonomyLabeler:
    """Today's rules: the request comes from BMW's taxonomy mapping. No network; the dry-run default."""

    name = "taxonomy"

    async def label(self, comments, catalog):
        by_id = {r.id: r for r in catalog}
        out = []
        for c in comments:
            r = by_id.get(c.taxonomy_request or "")
            out.append(Label(comment_id=c.id, series=c.series, market=c.market, request_id=r.id if r else None,
                             request_conf=1.0 if r else None, category=r.category if r else None,
                             category_conf=1.0 if r else None, feedback_type=c.taxonomy_type,
                             type_conf=1.0 if c.taxonomy_type else None, needs_review=r is None))
        return out


class DecisionsLabeler:
    """OpenAI Decisions API (POST /v1/decisions): typed answers with confidences. Sends each comment's text to OpenAI,
    so it runs only when the operator passes --send (BMW must have agreed)."""

    def __init__(self, client: Any, model: str = "gpt-6-luna", review_below: float = 0.6, concurrency: int = 8):
        self.client, self.model, self.review_below = client, model, review_below
        self.sem = asyncio.Semaphore(concurrency)
        self.name = f"decisions:{model}"
        self.calls = 0

    def questions(self, catalog: list[RequestDef]) -> list[dict[str, Any]]:
        return [
            {"type": "choice", "name": "request",
             "instructions": "Which of these existing BMW feature requests does the customer comment belong to? "
                             "Choose 'other' if none fits or the comment asks for something new.",
             "choices": [{"value": r.id, "description": f"{r.title}. {r.summary}".strip()} for r in catalog]
             + [{"value": OTHER, "description": "None of the above, or a new topic"}]},
            {"type": "choice", "name": "category", "instructions": "Which part of the car is the comment about?",
             "choices": [{"value": c, "description": c} for c in CATEGORIES]},
            {"type": "choice", "name": "type", "instructions": "What kind of feedback is it?",
             "choices": [{"value": k, "description": v} for k, v in TYPES.items()]},
            {"type": "score", "name": "severity", "instructions": "How severe is the issue for the customer?",
             "levels": [{"label": k, "description": v} for k, v in SEVERITY]},
        ]

    async def _one(self, c: Comment, catalog: list[RequestDef]) -> Label:
        series_catalog = [r for r in catalog if r.series == c.series] or catalog
        async with self.sem:
            self.calls += 1
            d = await self.client.decisions.create(model=self.model, input=c.text, questions=self.questions(series_catalog))
        a = {x.name: x for x in d.answers}

        def choice(name: str) -> tuple[str | None, float | None]:
            x = a.get(name)
            return (str(x.choice), x.confidence) if x is not None and x.type == "choice" else (None, None)

        req, req_conf = choice("request")
        cat, cat_conf = choice("category")
        typ, typ_conf = choice("type")
        sev = a.get("severity")
        sev_val = sev.score if sev is not None and sev.type == "score" else None
        sev_label = max(sev.probabilities, key=lambda p: p.probability).label if sev_val is not None else None
        refused = any(x.type == "refusal" for x in d.answers)
        unsure = req in (None, OTHER) or (req_conf or 0) < self.review_below or refused
        return Label(comment_id=c.id, series=c.series, market=c.market, request_id=None if req in (None, OTHER) else req,
                     request_conf=req_conf, category=cat, category_conf=cat_conf, feedback_type=typ, type_conf=typ_conf,
                     severity=sev_val, severity_label=sev_label, needs_review=unsure)

    async def label(self, comments, catalog):
        return list(await asyncio.gather(*(self._one(c, catalog) for c in comments)))


# ------------------------------------------------------------------ aggregate, compare, report


def aggregate(labels: list[Label]) -> dict[str, dict[str, Any]]:
    """Mentions per request: total, per market, per feedback type, mean severity."""
    out: dict[str, dict[str, Any]] = {}
    sev: dict[str, list[float]] = defaultdict(list)
    for lab in labels:
        if not lab.request_id:
            continue
        row = out.setdefault(lab.request_id, {"series": lab.series, "mentions": 0, "byMarket": Counter(), "types": Counter()})
        row["mentions"] += 1
        row["byMarket"][lab.market] += 1
        if lab.feedback_type:
            row["types"][lab.feedback_type] += 1
        if lab.severity is not None:
            sev[lab.request_id].append(lab.severity)
    for rid, row in out.items():
        row["byMarket"], row["types"] = dict(row["byMarket"]), dict(row["types"])
        row["severity"] = round(sum(sev[rid]) / len(sev[rid]), 2) if sev[rid] else None
    return out


def compare(prev: dict[str, dict[str, Any]] | None, now: dict[str, dict[str, Any]], grow_at: float = 0.3) -> dict[str, list]:
    prev = prev or {}
    new = sorted(r for r in now if r not in prev)
    grown = sorted(
        ({"request": r, "before": prev[r]["mentions"], "now": now[r]["mentions"],
          "growth": round((now[r]["mentions"] - prev[r]["mentions"]) / prev[r]["mentions"], 2)}
         for r in now if r in prev and prev[r]["mentions"] and (now[r]["mentions"] - prev[r]["mentions"]) / prev[r]["mentions"] >= grow_at),
        key=lambda x: -x["growth"])
    dropped = sorted(r for r in prev if r not in now)
    return {"new": new, "grown": grown, "dropped": dropped}


def resurfaced(generations: list[dict[str, Any]], counts: dict[str, dict[str, Any]], catalog: list[RequestDef],
               settings: ScoringSettings) -> list[dict[str, Any]]:
    """Rejected requests whose demand in that market grew past the team's resurface threshold since the reject."""
    titles = {r.id: r for r in catalog}
    out = []
    for (series, market) in {(g.get("series"), g.get("scope")) for g in generations}:
        mem = build_memory(generations, series, market, settings)
        for rid, row in counts.items():
            r = titles.get(rid)
            if not r or r.series != series:
                continue
            m = mem.get(f"{series}:{r.title.lower()}")
            n = row["byMarket"].get(market, 0)
            if m and m.action == "reject" and m.mentionsAt and (n - m.mentionsAt) / m.mentionsAt >= settings.resurfaceAt:
                out.append({"request": r.title, "series": series, "market": market, "rejected_at": m.at,
                            "reason": m.reason, "mentions_then": m.mentionsAt, "mentions_now": n})
    return out


class RefreshReport(BaseModel):
    month: str
    labeler: str
    source: str
    comments: int
    labelled: int
    needs_review: int
    review_queue: list[str] = Field(description="Comment ids to check by hand (low confidence or no fitting request)")
    agreement_with_taxonomy: float | None = Field(default=None, description="Share of comments where the labeler picked the taxonomy's request")
    counts: dict[str, dict[str, Any]]
    changes: dict[str, list]
    resurfaced: list[dict[str, Any]]
    research_runs: list[str] = Field(default_factory=list)
    assessments: list[str] = Field(default_factory=list)
    generatedAt: str


@dataclass
class RefreshDeps:
    store: Any | None = None
    #: async (series, market, request_titles) -> research run id
    research: Callable[[str, str, list[str]], Awaitable[str | None]] | None = None
    #: async (series, market, counts for that series) -> assessment id
    assess: Callable[[str, str, list[dict[str, Any]]], Awaitable[str | None]] | None = None
    markets: list[str] = field(default_factory=lambda: ["EU", "US", "CN"])


async def run_refresh(comments: list[Comment], catalog: list[RequestDef], labeler: Labeler, *, month: str, source: str,
                      deps: RefreshDeps | None = None, store_results: bool = False) -> tuple[RefreshReport, list[Label]]:
    deps = deps or RefreshDeps()
    labels = await labeler.label(comments, catalog)
    counts = aggregate(labels)

    prev = await deps.store.latest_refresh() if deps.store else None
    changes = compare(prev["report"]["counts"] if prev else None, counts)
    res: list[dict[str, Any]] = []
    if deps.store:
        settings = (await deps.store.get_settings()).settings
        gens = [g.payload for g in await deps.store.list_generations()]
        res = resurfaced(gens, counts, catalog, settings)

    known = [c for c in comments if c.taxonomy_request]
    agree = None
    if known and labeler.name != "taxonomy":
        by = {lab.comment_id: lab for lab in labels}
        agree = round(sum(1 for c in known if by[c.id].request_id == c.taxonomy_request) / len(known), 3)

    research_ids, assessment_ids = [], []
    titles = {r.id: r.title for r in catalog}
    for series in sorted({r.series for r in catalog}):
        for market in deps.markets:
            if deps.research:
                rid = await deps.research(series, market, [r.title for r in catalog if r.series == series])
                if rid:
                    research_ids.append(rid)
            if deps.assess:
                cats = {r.id: r.category for r in catalog}
                rows = [{"id": rid, "title": titles[rid], "category": cats[rid], "mentions": row["byMarket"].get(market, 0)}
                        for rid, row in counts.items() if row["series"] == series and row["byMarket"].get(market)]
                if rows:
                    aid = await deps.assess(series, market, rows)
                    if aid:
                        assessment_ids.append(aid)

    report = RefreshReport(
        month=month, labeler=labeler.name, source=source, comments=len(comments),
        labelled=sum(1 for lab in labels if lab.request_id), needs_review=sum(1 for lab in labels if lab.needs_review),
        review_queue=[lab.comment_id for lab in labels if lab.needs_review], agreement_with_taxonomy=agree,
        counts=counts, changes=changes, resurfaced=res, research_runs=research_ids, assessments=assessment_ids,
        generatedAt=datetime.now(UTC).isoformat(timespec="seconds"),
    )
    if store_results and deps.store:
        await deps.store.save_refresh({"month": month, "labeler": labeler.name, "source": source,
                                       "report": report.model_dump(mode="json")},
                                      [lab.model_dump() for lab in labels])
    return report, labels
