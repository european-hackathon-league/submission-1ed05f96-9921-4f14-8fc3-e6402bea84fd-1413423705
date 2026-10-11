"""Principle assessment (L1): how well each feature request fits BMW's principles, with assumptions kept separate."""
from pydantic import BaseModel, Field

from app.models.core import Category, Scope, SeriesId


class RequestInput(BaseModel):
    id: str
    title: str
    category: Category
    mentions: int = Field(description="Unique customer mentions in this market (aggregate count, no customer text)")
    backing: list[str] = Field(default_factory=list, description="Titles of competitor/trend signals that support it")


class AssessRequest(BaseModel):
    series: SeriesId
    market: Scope
    requests: list[RequestInput] = Field(min_length=1, max_length=40)
    basis: str | None = Field(default=None, description="Client key of this input (ids + backing); echoed so a stored run can be reused")
    dataset: str = Field(default="bmw", description="'bmw' (local data) or 'example' (public demo): keeps the two data sets' runs apart")


class RequestFit(BaseModel):
    requestId: str
    fit: float = Field(ge=0, le=1, description="0 = conflicts with the principles, 0.5 = neutral, 1 = strongly supported")
    supports: list[str] = Field(default_factory=list, description="Principle ids this request serves")
    tensions: list[str] = Field(default_factory=list, description="Principle ids it strains or conflicts with")
    rationale: str = Field(description="≤ 30 words, plain English")
    evidence: list[str] = Field(default_factory=list, description="Facts used: from principle evidence, mentions, signals")
    assumptions: list[str] = Field(default_factory=list, description="What is assumed, not shown by the evidence")
    memory: str | None = Field(default=None, description="Past decision on this request, if any, and how it was weighed")


class AssessorOutput(BaseModel):
    fits: list[RequestFit]
    conflicts: list[str] = Field(default_factory=list, description="Principle-vs-demand or cross-market conflicts, shown not averaged")
    gaps: list[str] = Field(default_factory=list, description="What the principles or data do not cover")


class AssessResult(AssessorOutput):
    id: str | None = None
    series: SeriesId
    market: Scope
    principleIds: list[str]
    requestIds: list[str] = Field(default_factory=list, description="The request set that was assessed")
    basis: str | None = None
    model: str
    generatedAt: str
