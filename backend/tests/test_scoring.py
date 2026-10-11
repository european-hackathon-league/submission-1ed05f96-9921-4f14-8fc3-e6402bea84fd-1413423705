"""The Python score must give the same numbers as web/src/lib/pipeline/scoring.ts.

Expected values were produced by running the TypeScript functions (node, same inputs) on 2026-10-11.
"""
from datetime import UTC, datetime

import pytest

from app.models.core import ScoringSettings
from app.scoring import build_memory, score_request

NOW = datetime(2026, 10, 11, tzinfo=UTC)
GENS = [
    {"id": "G-1", "series": "G60", "scope": "EU", "scopeLabel": "Europe", "createdAt": "2025-10-11T00:00:00Z", "decisions": {
        "a": {"requestId": "a", "title": "Rear fridge", "action": "reject", "reason": "Not core", "by": "Ana", "at": "2025-10-11T00:00:00Z", "mentionsAt": 10},
        "b": {"requestId": "b", "title": "Simpler iDrive", "action": "keep", "by": "Ana", "at": "2025-10-11T00:00:00Z", "mentionsAt": 5}}},
    {"id": "G-2", "series": "G60", "scope": "US", "scopeLabel": "USA", "createdAt": "2026-04-11T00:00:00Z", "decisions": {
        "c": {"requestId": "c", "title": "Spare wheel", "action": "reject", "reason": "Weight", "by": "Bo", "at": "2026-04-11T00:00:00Z", "mentionsAt": 4}}},
]
S = ScoringSettings()
FOCUS = ["Digital", "Interior"]


def score(title, category, scoped, back, mem, fit=None):
    return score_request("G60", title, category, scoped, 40, back, FOCUS, mem, S, now=NOW, fit=fit)


def test_memory_scope_market_vs_all():
    assert len(build_memory(GENS, "G60", "EU", S)) == 2
    assert len(build_memory(GENS, "G60", "EU", S.model_copy(update={"memoryScope": "all"}))) == 3


@pytest.mark.parametrize(
    "title,category,scoped,back,expected",
    [
        ("Rear fridge", "Interior", 12, 1, (48, 69, "rejected", 0.5)),   # +20 % demand: penalty at half strength
        ("Rear fridge", "Interior", 13, 1, (70, 70, "resurfaced", 0.5)),  # +30 % = resurfaceAt: penalty lifted
        ("Simpler iDrive", "Digital", 20, 2, (92, 89, "kept", 0.5)),     # keep bonus 10 × 0.5 × 0.5
        ("Range", "Powertrain", 40, 0, (66, 66, None, 0.0)),             # no memory, category outside focus
    ],
)
def test_score_matches_typescript(title, category, scoped, back, expected):
    r = score(title, category, scoped, back, build_memory(GENS, "G60", "EU", S))
    assert (r.score, r.base, r.state, round(r.strength, 4)) == expected


def test_cross_market_reject_with_scope_all():
    mem = build_memory(GENS, "G60", "EU", S.model_copy(update={"memoryScope": "all"}))
    r = score("Spare wheel", "Exterior", 4, 0, mem)
    assert (r.score, r.base, r.state, round(r.strength, 4)) == (18, 32, "rejected", 0.7064)


def test_principle_fit_from_assessor_replaces_focus_fallback():
    mem = {}
    assert score("Range", "Powertrain", 40, 0, mem).fit == 0.4
    r = score("Range", "Powertrain", 40, 0, mem, fit=0.9)
    assert r.fit == 0.9 and r.base == round(100 * (0.6 * 1 + 0.15 * 0.9) / 1.0)
