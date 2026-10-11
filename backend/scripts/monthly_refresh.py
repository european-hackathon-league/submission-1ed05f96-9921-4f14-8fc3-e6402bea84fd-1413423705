"""Monthly refresh job: label customer comments, count demand, compare with last month, report for the PM.

Safe by default: the dry run uses today's taxonomy rules, sends nothing anywhere and only prints the report.

  # dry run on the local BMW export (rules, no network; needs the jobs group for pandas)
  uv run --group jobs python -I scripts/monthly_refresh.py --source bmw --limit 300

  # label a file of comments with the OpenAI Decisions API (sends the comment text to OpenAI)
  uv run python -I scripts/monthly_refresh.py --source file tests/fixtures/synthetic_feedback.json \\
      --catalog tests/fixtures/synthetic_catalog.json --labeler decisions --send

  # production (scheduled monthly): label, re-run research + principle assessor, store everything in Supabase
  uv run --group jobs python -I scripts/monthly_refresh.py --source bmw --labeler decisions --send \\
      --research --assess --store

--send is required for the Decisions labeler: comment text goes to OpenAI only when BMW has agreed to it.
--store writes refresh_runs + feedback_labels (labels only, never the text) to Supabase.
"""
import argparse
import asyncio
import importlib.util
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.jobs.refresh import Comment, DecisionsLabeler, RefreshDeps, RequestDef, TaxonomyLabeler, run_refresh  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PIPELINE = ROOT / "web" / "data-local" / "pipeline.json"
TYPE_MAP = {"wants": "want", "difficult": "difficult", "defect": "defect"}


def load_catalog(path: Path) -> list[RequestDef]:
    """Feature requests from the last data build (pipeline.json) or a catalog file with the same fields."""
    data = json.loads(path.read_text())
    items = [r for s in data["series"] for r in s["requests"]] if "series" in data else data
    return [RequestDef(id=r["id"], series=r["series"], title=r["title"], category=r["category"], summary=r.get("summary", ""))
            for r in items]


def load_file(path: Path) -> list[Comment]:
    """[{id, series, market, text, taxonomy_request?, taxonomy_type?}, …] or {"comments": [...]}"""
    data = json.loads(path.read_text())
    items = data["comments"] if isinstance(data, dict) else data
    return [Comment(id=str(c["id"]), series=c["series"], market=c["market"], text=c["text"],
                    taxonomy_request=c.get("taxonomy_request"), taxonomy_type=c.get("taxonomy_type"))
            for c in items]


def load_bmw(catalog: list[RequestDef], limit: int | None) -> list[Comment]:
    """The BMW export in data/bmw/feedback (local only), with the data script's own taxonomy mapping."""
    spec = importlib.util.spec_from_file_location("pipeline_build", ROOT / "scripts" / "build-pipeline-data.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    by_title = {(r.series, r.title): r.id for r in catalog}
    out: list[Comment] = []
    for series in mod.SERIES:
        rows = mod.negative_rows(mod.load_feedback(series)).drop_duplicates("ID")
        for _, r in rows.iterrows():
            key = r["cluster"]
            group = mod.GROUPS.get(key)
            title = group["title"] if group else f"Improve {key.split(':', 1)[1].lower()}"
            text = mod.clean_quote(r["Customer Feedback"])
            if not text:
                continue
            out.append(Comment(id=str(r["ID"]), series=series, market=r["market"], text=text,
                               taxonomy_request=by_title.get((series, title)), taxonomy_type=TYPE_MAP.get(r["type"])))
    out.sort(key=lambda c: c.id)
    return out[:limit] if limit else out


async def agents(store):
    """Research agent + principle assessor wired to the real app settings (for --research / --assess)."""
    from app.agents.principles import build_assessor, run_assessment
    from app.agents.research import build_research_agent, openai_models, run_research
    from app.agents.tavily import tavily_toolset
    from app.config import get_settings
    from app.models.assess import AssessRequest
    from app.models.signals import ResearchRequest

    s = get_settings()
    models = openai_models(s)
    search = tavily_toolset(s)
    researcher = build_research_agent(models, search, s.scout_tool_calls)
    assessor = build_assessor(models.strong)

    async def research(series, market, titles):
        req = ResearchRequest(series=series, market=market, featureRequests=titles)
        out = await run_research(researcher, req, s.openai_model_strong, s.scout_tool_calls)
        return await store.save_run("research_runs", {"series": series, "market": market, "request": req.model_dump(mode="json"),
                                                      "result": out.model_dump(mode="json", exclude={"id"}),
                                                      "model": out.model, "searches": out.searches})

    async def assess(series, market, rows):
        req = AssessRequest(series=series, market=market, requests=[
            {"id": r["id"], "title": r["title"], "category": r["category"], "mentions": r["mentions"]} for r in rows][:40])
        return (await run_assessment(assessor, store, req, s.openai_model_strong)).id

    return search, research, assess


async def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", choices=["bmw", "file"], required=True)
    ap.add_argument("path", nargs="?", help="comments JSON for --source file")
    ap.add_argument("--catalog", type=Path, default=PIPELINE, help="feature requests to label against (default: pipeline.json)")
    ap.add_argument("--labeler", choices=["taxonomy", "decisions"], default="taxonomy")
    ap.add_argument("--send", action="store_true", help="allow sending comment text to OpenAI (Decisions labeler)")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--month", default=datetime.now(UTC).strftime("%Y-%m"))
    ap.add_argument("--store", action="store_true", help="write the report and labels to Supabase")
    ap.add_argument("--research", action="store_true", help="re-run the research agent for every series × market")
    ap.add_argument("--assess", action="store_true", help="re-run the principle assessor on the new counts")
    ap.add_argument("--out", type=Path, help="also write the report (and labels) as JSON here")
    a = ap.parse_args()

    catalog = load_catalog(a.catalog)
    comments = load_bmw(catalog, a.limit) if a.source == "bmw" else load_file(Path(a.path))[: a.limit or None]

    if a.labeler == "decisions":
        if not a.send:
            sys.exit("The Decisions labeler sends each comment's text to OpenAI. Pass --send to confirm this is allowed.")
        from openai import AsyncOpenAI

        from app.config import get_settings

        labeler = DecisionsLabeler(AsyncOpenAI(api_key=get_settings().openai_api_key))
    else:
        labeler = TaxonomyLabeler()

    store = None
    if a.store or a.research or a.assess:
        from app.config import get_settings
        from app.db import SupabaseStore, make_store

        store = make_store(get_settings())
        if a.store and not isinstance(store, SupabaseStore):
            sys.exit("--store needs Supabase (SUPABASE_URL + key in backend/.env)")
    deps = RefreshDeps(store=store)
    search = None
    if a.research or a.assess:
        search, research, assess = await agents(store)
        deps.research = research if a.research else None
        deps.assess = assess if a.assess else None

    source = "bmw:data/bmw/feedback" if a.source == "bmw" else Path(a.path).name
    if search is not None:
        async with search:
            report, labels = await run_refresh(comments, catalog, labeler, month=a.month, source=source, deps=deps, store_results=a.store)
    else:
        report, labels = await run_refresh(comments, catalog, labeler, month=a.month, source=source, deps=deps, store_results=a.store)

    top = sorted(report.counts.items(), key=lambda kv: -kv[1]["mentions"])[:8]
    print(f"refresh {report.month} · {report.labeler} · {report.comments} comments · {report.labelled} labelled · "
          f"{report.needs_review} to review" + (f" · agreement with taxonomy {report.agreement_with_taxonomy:.0%}"
                                                 if report.agreement_with_taxonomy is not None else ""))
    titles = {r.id: r.title for r in catalog}
    for rid, row in top:
        print(f"  {row['mentions']:4d}  {titles.get(rid, rid)}  {row['byMarket']}  severity {row['severity']}")
    print("changes:", {k: len(v) for k, v in report.changes.items()}, "· resurfaced:", len(report.resurfaced),
          "· research runs:", len(report.research_runs), "· assessments:", len(report.assessments))
    if a.out:
        a.out.write_text(json.dumps({"report": report.model_dump(mode="json"), "labels": [lab.model_dump() for lab in labels]}, indent=1))
        print("wrote", a.out)
    if store is not None and hasattr(store, "aclose"):
        await store.aclose()


if __name__ == "__main__":
    asyncio.run(main())
