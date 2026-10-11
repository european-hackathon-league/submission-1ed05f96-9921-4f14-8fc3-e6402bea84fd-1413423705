"""Monthly refresh job, offline: a fake Decisions client, the synthetic fixtures, the in-memory store."""
import sys
from pathlib import Path
from types import SimpleNamespace as NS

import pytest

from app.db import MemoryStore
from app.jobs.refresh import Comment, DecisionsLabeler, RefreshDeps, TaxonomyLabeler, aggregate, compare, run_refresh

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from monthly_refresh import load_catalog, load_file  # noqa: E402

FIX = Path(__file__).parent / "fixtures"
CATALOG = load_catalog(FIX / "synthetic_catalog.json")
COMMENTS = load_file(FIX / "synthetic_feedback.json")
KEYWORDS = {"T-R01": "range", "T-R02": "menu", "T-R03": "back hurts|ventilated", "T-R04": "key", "T-R05": "wiper|mirror"}


class FakeDecisions:
    """Answers like the Decisions API would: choice + confidence, score + probabilities."""

    def __init__(self):
        self.requests = []
        self.decisions = self

    async def create(self, model, input, questions):
        import re

        self.requests.append({"model": model, "input": input, "questions": questions})
        rid = next((r for r, k in KEYWORDS.items() if re.search(k, input, re.I)), "other")
        conf = 0.9 if rid != "other" else 0.4
        sev = 3.0 if re.search("not recognise|stopped working|streak", input) else 1.0
        return NS(answers=[
            NS(type="choice", name="request", choice=rid, confidence=conf),
            NS(type="choice", name="category", choice="Digital", confidence=0.8),
            NS(type="choice", name="type", choice="defect" if sev >= 3 else "want", confidence=0.7),
            NS(type="score", name="severity", score=sev, confidence=0.6,
               probabilities=[NS(label="breakdown" if sev >= 3 else "annoying", probability=0.7, value=int(sev))]),
        ])


async def test_decisions_labeler_asks_four_typed_questions_and_flags_unsure():
    client = FakeDecisions()
    labels = await DecisionsLabeler(client).label(COMMENTS, CATALOG)
    q = client.requests[0]["questions"]
    assert [x["type"] for x in q] == ["choice", "choice", "choice", "score"]
    assert {c["value"] for c in q[0]["choices"]} == {r.id for r in CATALOG} | {"other"}
    assert client.requests[0]["model"] == "gpt-6-luna"
    by = {lab.comment_id: lab for lab in labels}
    assert by["S-07"].request_id == "T-R04" and by["S-07"].severity_label == "breakdown"
    assert by["S-11"].request_id is None and by["S-11"].needs_review  # rear fridge: no existing request


async def test_refresh_report_counts_agreement_changes_and_store():
    store = MemoryStore()
    deps = RefreshDeps(store=store)
    first, _ = await run_refresh(COMMENTS[:6], CATALOG, TaxonomyLabeler(), month="2026-09", source="t", deps=deps, store_results=True)
    assert first.counts["T-R01"]["mentions"] == 2 and first.counts["T-R01"]["byMarket"] == {"EU": 1, "US": 1}

    report, labels = await run_refresh(COMMENTS, CATALOG, DecisionsLabeler(FakeDecisions()), month="2026-10", source="t",
                                       deps=deps, store_results=True)
    assert report.comments == 12 and report.labelled == 10
    assert set(report.review_queue) == {"S-11", "S-12"}
    assert report.agreement_with_taxonomy == 1.0
    assert set(report.changes["new"]) == {"T-R04", "T-R05"}  # not in September's run
    assert len(store.runs["refresh_runs"]) == 2 and len(store.labels) == 6 + 12
    assert all("text" not in lab for lab in store.labels)  # labels only, never the comment


async def test_resurfaced_reject_is_reported():
    store = MemoryStore()
    gen = {"id": "G-1", "series": "G60", "scope": "EU", "scopeLabel": "Europe", "createdAt": "2026-09-01T00:00:00Z",
           "decisions": {"x": {"requestId": "x", "title": "More real-world electric range", "action": "reject",
                               "reason": "Battery cost", "by": "PM", "at": "2026-09-01T00:00:00Z", "mentionsAt": 1}}}
    from app.models.core import Generation

    await store.save_generation(Generation(id="G-1", series="G60", market="EU", createdAt=gen["createdAt"], payload=gen))
    extra = [Comment(id=f"X-{i}", series="G60", market="EU", text="range in winter", taxonomy_request="T-R01") for i in range(2)]
    report, _ = await run_refresh(COMMENTS + extra, CATALOG, TaxonomyLabeler(), month="2026-10", source="t", deps=RefreshDeps(store=store))
    assert report.resurfaced and report.resurfaced[0]["request"] == "More real-world electric range"
    assert report.resurfaced[0]["mentions_then"] == 1 and report.resurfaced[0]["mentions_now"] == 3


async def test_research_and_assess_hooks_run_per_series_and_market():
    calls = []

    async def research(s, m, titles):
        calls.append(("r", s, m))
        return f"run-{s}-{m}"

    async def assess(s, m, rows):
        calls.append(("a", s, m, len(rows)))
        assert all({"id", "title", "category", "mentions"} <= set(r) for r in rows)
        return f"as-{s}-{m}"

    report, _ = await run_refresh(COMMENTS, CATALOG, TaxonomyLabeler(), month="2026-10", source="t",
                                  deps=RefreshDeps(research=research, assess=assess))
    assert report.research_runs == ["run-G60-EU", "run-G60-US", "run-G60-CN"]
    assert len(report.assessments) == 3 and ("a", "G60", "CN", 2) in calls


def test_compare_flags_growth_over_threshold():
    prev = {"A": {"mentions": 10}, "B": {"mentions": 10}, "C": {"mentions": 4}}
    now = {"A": {"mentions": 13}, "B": {"mentions": 11}, "D": {"mentions": 2}}
    ch = compare(prev, now)
    assert ch["new"] == ["D"] and ch["dropped"] == ["C"] and [g["request"] for g in ch["grown"]] == ["A"]


def test_cli_refuses_decisions_without_send(monkeypatch, capsys):
    import monthly_refresh

    monkeypatch.setattr(sys, "argv", ["x", "--source", "file", str(FIX / "synthetic_feedback.json"),
                                      "--catalog", str(FIX / "synthetic_catalog.json"), "--labeler", "decisions"])
    import asyncio

    with pytest.raises(SystemExit) as e:
        asyncio.run(monthly_refresh.main())
    assert "--send" in str(e.value)


def test_aggregate_ignores_unlabelled():
    from app.jobs.refresh import Label

    out = aggregate([Label(comment_id="1", series="G60", market="EU", request_id=None)])
    assert out == {}
