"""Research agent: L2 market signals (competitor features people like, market trends), with sources.

    orchestrator (strong model)
      └─ delegate_task ─┬─ competitor_scout (fast model + Tavily MCP)
                        └─ trend_scout      (fast model + Tavily MCP)

Sub-agents come from the Pydantic AI Harness `SubAgents` capability. Each scout runs in its own isolated context with
its own tool budget; the orchestrator never searches itself. It merges, de-duplicates, links signals to the PM's
feature requests and lists what it could not find (gaps). Afterwards `verify_sources` drops every source URL that
Tavily never returned in this run, so a hallucinated link cannot reach the dashboard.
"""
from dataclasses import dataclass
from datetime import UTC, datetime

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.toolsets import AbstractToolset
from pydantic_ai.usage import UsageLimits
from pydantic_ai_harness import SubAgent, SubAgents

from app.agents.deps import ResearchDeps
from app.config import Settings
from app.models.signals import (
    MARKET_NAMES,
    SERIES_NAMES,
    MarketSignal,
    ResearchRequest,
    ResearchResult,
    ScoutFinding,
)

SCOUT_RULES = """\
Use tavily_search (and tavily_extract only when a snippet is too thin). Prefer sources from the last 24 months:
manufacturer press releases, regulators, established motoring press, market research. No forums, no AI content farms.
Every signal needs at least one source whose URL you copied exactly from a tool result. Never invent or edit a URL.
title ≤ 6 words, detail ≤ 20 words with one concrete fact (number, date, model). strength = "strong" when two
independent sources agree or a regulator/manufacturer states it, otherwise "emerging".
If you searched for something and found no solid source, put it in gaps instead of guessing.
Leave id as "S00" and relatesTo empty; the lead researcher fills them."""

COMPETITOR_SCOUT = f"""\
You find competitor features that customers in a given market like, for a given BMW series and its direct rivals
(e.g. Mercedes, Audi, Tesla, Lexus, NIO, Li Auto, BYD, Xpeng, Genesis). kind = "competitor", set competitor to the model.
{SCOUT_RULES}"""

TREND_SCOUT = f"""\
You find market trends that will shape what customers in a given market expect from a car of this class in 3–5 years:
regulation (e.g. Euro NCAP, China MIIT, US NHTSA), technology adoption, usage patterns, pricing. kind = "trend".
{SCOUT_RULES}"""

ORCHESTRATOR = """\
You are Dixi's lead market researcher for BMW product managers. You never search yourself: delegate exactly one task
to competitor_scout and one to trend_scout, each with the series, market, focus and the time window.
Then merge their findings: drop duplicates and weak or off-topic signals, keep the best ones up to the requested
maximum, renumber ids S01, S02, …, and fill relatesTo with the exact titles from the PM's feature-request list that a
signal supports (empty when none fits; never invent titles). Keep every source exactly as the scouts gave it.
gaps: the scouts' gaps plus anything the PM's focus asked for that no signal covers. Be honest: an empty list of
signals with clear gaps is better than a weak signal."""


class LeadOutput(BaseModel):
    signals: list[MarketSignal]
    gaps: list[str] = Field(default_factory=list)


@dataclass
class ResearchModels:
    fast: Model | str
    strong: Model | str


def openai_models(settings: Settings) -> ResearchModels:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    provider = OpenAIProvider(api_key=settings.openai_api_key)
    return ResearchModels(
        fast=OpenAIResponsesModel(settings.openai_model_fast, provider=provider),
        strong=OpenAIResponsesModel(settings.openai_model_strong, provider=provider),
    )


def build_research_agent(
    models: ResearchModels, search: AbstractToolset[ResearchDeps], scout_tool_calls: int = 6
) -> Agent[ResearchDeps, LeadOutput]:
    def scout(name: str, description: str, instructions: str) -> SubAgent[ResearchDeps]:
        agent = Agent(
            models.fast,
            name=name,
            description=description,
            instructions=instructions,
            deps_type=ResearchDeps,
            output_type=ScoutFinding,
            toolsets=[search],
        )
        return SubAgent(
            agent,
            # Safety net only; the real budget is ResearchDeps.search_budget (soft, see deps.py).
            usage_limits=UsageLimits(tool_calls_limit=40, request_limit=scout_tool_calls + 6),
            timeout_seconds=180,
            max_calls=1,
            on_failure="Report the scout as failed in gaps and continue with what you have.",
        )

    return Agent(
        models.strong,
        name="lead_researcher",
        instructions=ORCHESTRATOR,
        deps_type=ResearchDeps,
        output_type=LeadOutput,
        capabilities=[
            SubAgents(
                agents=[
                    scout("competitor_scout", "Competitor features customers like, with sources", COMPETITOR_SCOUT),
                    scout("trend_scout", "Market trends and regulation, with sources", TREND_SCOUT),
                ],
                agent_folders=None,  # roster is fixed in code; no Markdown agents from disk
                forward_usage=False,  # each scout keeps its own tool budget
                contain_errors=True,
            )
        ],
    )


def _norm(url: str) -> str:
    return url.rstrip("/").lower()


def verify_sources(signals: list[MarketSignal], seen_urls: set[str]) -> tuple[list[MarketSignal], list[str]]:
    """Keep only sources Tavily returned in this run; drop signals left without any source."""
    seen = {_norm(u) for u in seen_urls}
    kept: list[MarketSignal] = []
    gaps: list[str] = []
    for s in signals:
        sources = [src for src in s.sources if _norm(str(src.url)) in seen]
        if sources:
            kept.append(s.model_copy(update={"sources": sources}))
        else:
            gaps.append(f"Dropped \"{s.title}\": its source could not be traced to a search result.")
    for i, s in enumerate(kept, start=1):
        s.id = f"S{i:02d}"
    return kept, gaps


def prompt_for(req: ResearchRequest, today: str) -> str:
    lines = [
        f"Series: BMW {SERIES_NAMES[req.series]} ({req.series}). Market: {MARKET_NAMES[req.market]} ({req.market}).",
        f"Today: {today}. Horizon: what customers will expect in 3–5 years.",
        f"Return at most {req.maxSignals} signals.",
    ]
    if req.focus:
        lines.append(f"PM focus: {req.focus}")
    if req.categories:
        lines.append(f"Only categories: {', '.join(req.categories)}. Search and report nothing outside them.")
    if req.featureRequests:
        lines.append("PM feature-request titles (for relatesTo):\n" + "\n".join(f"- {t}" for t in req.featureRequests))
    return "\n".join(lines)


async def run_research(
    agent: Agent[ResearchDeps, LeadOutput], req: ResearchRequest, model_label: str, search_budget: int = 6
) -> ResearchResult:
    now = datetime.now(UTC)
    deps = ResearchDeps(search_budget=search_budget)
    result = await agent.run(prompt_for(req, now.date().isoformat()), deps=deps)
    proposed = [s for s in result.output.signals if not req.categories or s.category in req.categories]
    signals, dropped = verify_sources(proposed[: req.maxSignals], deps.seen_urls)
    for s in signals:  # the request defines scope; scouts sometimes widen it
        if req.series not in s.series:
            s.series.append(req.series)
        if req.market not in s.markets:
            s.markets.append(req.market)
    return ResearchResult(
        series=req.series,
        market=req.market,
        signals=signals,
        gaps=result.output.gaps + dropped,
        model=model_label,
        searches=deps.searches,
        generatedAt=now.isoformat(timespec="seconds"),
    )
