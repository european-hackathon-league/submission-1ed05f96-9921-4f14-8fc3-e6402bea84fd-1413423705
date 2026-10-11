"""Data contracts shared with the web app (web/src/lib/pipeline/*.ts) and the Supabase schema (supabase/migrations)."""
from typing import Any, Literal

from pydantic import BaseModel, Field

SeriesId = Literal["F70", "G60", "G70"]
Scope = Literal["EU", "US", "CN", "JP", "ALL"]
Category = Literal["Exterior", "Interior", "Digital", "Powertrain"]

# Which principle markets apply to an app scope. Europe includes the UK: most European 1 Series feedback is British.
SCOPE_PRINCIPLE_MARKETS: dict[str, list[str]] = {
    "EU": ["GLOBAL", "EU", "UK"],
    "US": ["GLOBAL", "US"],
    "CN": ["GLOBAL", "CN"],
    "JP": ["GLOBAL"],
    "ALL": ["GLOBAL"],
}


class Source(BaseModel):
    ref: str
    label: str
    url: str | None = None


class Principle(BaseModel):
    id: str
    level: Literal["group", "market", "series"]
    market: str | None = None
    series: SeriesId | None = None
    title: str
    statement: str
    evidence: str | None = None
    boundary: str | None = None
    classification: str | None = None
    confidence: str | None = None
    sources: list[Source] = Field(default_factory=list)
    owner: str
    version: int = 1
    active: bool = True
    updated_at: str | None = None
    updated_by: str = "seed"


class PrincipleEdit(BaseModel):
    statement: str
    boundary: str | None = None
    by: str = Field(description="Who changed it (must be the owner's team in a real deployment)")


class DecisionIn(BaseModel):
    """One PM decision. Mirrors `Decision` in web/src/lib/pipeline/profiles.ts, plus series + market."""

    series: SeriesId
    market: Scope
    requestId: str
    title: str
    action: Literal["keep", "reject", "wish", "undo"]
    reason: str | None = None
    mentionsAt: int | None = None
    by: str
    role: str | None = None
    at: str | None = None
    generationId: str | None = None


class Decision(DecisionIn):
    id: int


class Generation(BaseModel):
    """A saved build. `payload` is the web app's Session object, stored as-is."""

    id: str
    series: SeriesId
    market: Scope
    createdAt: str
    createdBy: str | None = None
    createdByRole: str | None = None
    payload: dict[str, Any]


class ScoringSettings(BaseModel):
    """Mirrors ScoringSettings in web/src/lib/pipeline/scoring.ts (same ranges as clampSettings)."""

    wDemand: float = Field(0.6, ge=0, le=1)
    wBacking: float = Field(0.25, ge=0, le=1)
    wFit: float = Field(0.15, ge=0, le=1)
    rejectPenalty: float = Field(0.6, ge=0, le=1)
    keepBonus: float = Field(0.5, ge=0, le=1)
    halfLifeDays: float = Field(365, ge=30, le=1095)
    resurfaceAt: float = Field(0.3, ge=0.1, le=1.5)
    hideRejected: bool = False
    memoryScope: Literal["market", "all"] = "market"


class SettingsUpdate(BaseModel):
    settings: ScoringSettings
    by: str
    role: str | None = None
    instruction: str | None = None
    source: str = "sliders"
    changes: list[str] = Field(default_factory=list)


class SettingsState(BaseModel):
    settings: ScoringSettings
    updatedAt: str | None = None
    updatedBy: str | None = None
