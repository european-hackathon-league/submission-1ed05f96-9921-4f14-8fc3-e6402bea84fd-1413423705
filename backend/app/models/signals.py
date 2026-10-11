"""L2 market signals: the research agent's output.

Mirrors `MarketSignal` in web/src/lib/pipeline/types.ts, so the dashboard can show backend results as they are.
Public sources only; every signal carries the URLs it was built from.
"""
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

SeriesId = Literal["F70", "G60", "G70"]
Market = Literal["EU", "US", "CN"]
Category = Literal["Exterior", "Interior", "Digital", "Powertrain"]

SERIES_NAMES: dict[str, str] = {"F70": "1 Series", "G60": "5 Series", "G70": "7 Series"}
MARKET_NAMES: dict[str, str] = {"EU": "Europe", "US": "USA", "CN": "China"}


class Source(BaseModel):
    label: str = Field(description="Publisher and headline, e.g. 'Euro NCAP: 2026 protocol changes'")
    url: HttpUrl = Field(description="Exact URL returned by the search tool. Never invent one.")


class MarketSignal(BaseModel):
    id: str = Field(description="S01, S02, … (renumbered by the orchestrator)")
    kind: Literal["competitor", "trend"]
    series: list[SeriesId]
    markets: list[Market]
    title: str = Field(description="At most 6 words")
    competitor: str | None = Field(default=None, description="Competitor model, only for kind 'competitor'")
    category: Category
    detail: str = Field(description="At most 20 words, one concrete fact")
    relatesTo: list[str] = Field(default_factory=list, description="Exact feature-request titles this signal supports")
    strength: Literal["strong", "emerging"]
    sources: list[Source] = Field(min_length=1)


class ScoutFinding(BaseModel):
    """What one scout sub-agent returns before the orchestrator merges and links it."""

    signals: list[MarketSignal]
    gaps: list[str] = Field(default_factory=list, description="What the scout looked for but could not back with a source")

    def __str__(self) -> str:
        # The harness hands a sub-agent's output to the parent as str(output); send JSON, not a Python repr.
        return self.model_dump_json()


class ResearchRequest(BaseModel):
    series: SeriesId
    market: Market
    focus: str | None = Field(default=None, description="Optional PM question, e.g. 'rear-seat comfort'")
    featureRequests: list[str] = Field(
        default_factory=list, description="Current feature-request titles, so signals can be linked via relatesTo"
    )
    categories: list[Category] | None = Field(
        default=None, description="Only research these categories (None = all four)"
    )
    maxSignals: int = Field(default=8, ge=1, le=20)
    dataset: str = Field(default="bmw", description="Which request data the run was made for: 'bmw' (local) or 'example' (public demo)")


class ResearchResult(BaseModel):
    id: str | None = Field(default=None, description="Stored run id (research_runs)")
    series: SeriesId
    market: Market
    signals: list[MarketSignal]
    gaps: list[str] = Field(description="Honesty panel: what we looked for and could not find evidence for")
    model: str
    searches: int = Field(description="Tavily tool calls made across all sub-agents")
    generatedAt: str
