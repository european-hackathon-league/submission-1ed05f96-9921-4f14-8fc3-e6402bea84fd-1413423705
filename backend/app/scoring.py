"""Dixi score and decision memory: a line-by-line port of web/src/lib/pipeline/scoring.ts.

    base     = 100 × (wD·demand + wB·backing + wF·fit) / (wD + wB + wF)
    strength = 0.5 ^ (days since the decision / half-life)
    rejected → base × (1 − penalty × strength), unless demand grew ≥ resurfaceAt since ("resurfaced")
    kept     → base + 10 × bonus × strength (max 100)

The web app ranks with the TypeScript version; the backend uses this one to give the agents the same memory the PM sees.
tests/test_scoring.py pins both to the same numbers.
"""
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from app.models.core import ScoringSettings


def memory_key(series: str, title: str) -> str:
    return f"{series}:{title.lower()}"


@dataclass
class MemoryEntry:
    action: Literal["keep", "reject"]
    reason: str | None
    by: str
    role: str | None
    at: str
    mentionsAt: int | None
    generationId: str
    scopeLabel: str


def build_memory(generations: list[dict[str, Any]], series: str, scope: str, s: ScoringSettings) -> dict[str, MemoryEntry]:
    """Latest keep/reject per request from earlier generations (web Session payloads) of this series and market."""
    mem: dict[str, MemoryEntry] = {}
    relevant = sorted(
        (g for g in generations if g.get("series") == series and (s.memoryScope == "all" or g.get("scope") == scope)),
        key=lambda g: g.get("createdAt", ""),
    )
    for g in relevant:
        for d in (g.get("decisions") or {}).values():
            if d.get("action") not in ("keep", "reject"):
                continue
            k = memory_key(series, d["title"])
            prev = mem.get(k)
            if prev is None or prev.at <= d["at"]:
                mem[k] = MemoryEntry(
                    action=d["action"], reason=d.get("reason"), by=d.get("by", ""), role=d.get("role"), at=d["at"],
                    mentionsAt=d.get("mentionsAt"), generationId=g["id"], scopeLabel=g.get("scopeLabel", g.get("scope", "")),
                )
    return mem


@dataclass
class Scored:
    score: int
    base: int
    demand: float
    backing: float
    fit: float
    state: Literal["rejected", "resurfaced", "kept"] | None
    strength: float
    growth: float | None
    hidden: bool


def _days_since(iso: str, now: datetime) -> float:
    at = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return max(0.0, (now - at).total_seconds() / 86_400)


def score_request(
    series: str, title: str, category: str, scoped: int, max_scoped: int, backing_count: int,
    focus: list[str], memory: dict[str, MemoryEntry], s: ScoringSettings,
    now: datetime | None = None, fit: float | None = None,
) -> Scored:
    """`fit` = principle fit from the principle assessor (0–1); without one, the series-focus fallback is used."""
    now = now or datetime.now(UTC)
    demand = math.log1p(scoped) / math.log1p(max_scoped) if max_scoped > 0 else 0.0
    backing = min(1.0, backing_count / 2)
    fit = fit if fit is not None else (1.0 if category in focus else 0.4)
    w_sum = (s.wDemand + s.wBacking + s.wFit) or 1
    base = 100 * (s.wDemand * demand + s.wBacking * backing + s.wFit * fit) / w_sum

    m = memory.get(memory_key(series, title))
    state, strength, growth, score = None, 0.0, None, base
    if m:
        strength = 0.5 ** (_days_since(m.at, now) / max(1, s.halfLifeDays))
        growth = (scoped - m.mentionsAt) / m.mentionsAt if m.mentionsAt else None
        if m.action == "reject":
            resurfaced = growth is not None and growth >= s.resurfaceAt
            state = "resurfaced" if resurfaced else "rejected"
            if not resurfaced:
                score = base * (1 - s.rejectPenalty * strength)
        else:
            state = "kept"
            score = min(100.0, base + 10 * s.keepBonus * strength)
    return Scored(
        score=_round(score), base=_round(base), demand=demand, backing=backing, fit=fit, state=state,
        strength=strength, growth=growth, hidden=s.hideRejected and state == "rejected",
    )


def _round(x: float) -> int:
    """JavaScript Math.round (half up), not Python's banker's rounding."""
    return math.floor(x + 0.5)
