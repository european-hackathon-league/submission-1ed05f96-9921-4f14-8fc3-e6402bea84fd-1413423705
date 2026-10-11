from fastapi import APIRouter, Request

from app.agents.research import run_research
from app.api.deps import agent_or_503, store_of
from app.models.core import Scope, SeriesId
from app.models.signals import ResearchRequest, ResearchResult

router = APIRouter(prefix="/research", tags=["agents"])


@router.post("/signals", response_model=ResearchResult)
async def research_signals(body: ResearchRequest, request: Request) -> ResearchResult:
    """Competitor features and market trends for one series and market, each with traced sources (L2 evidence).

    A proposal: the PM stars or ignores signals in the dashboard. The run is stored with its inputs (research_runs).
    """
    agent = agent_or_503(request, "research_agent")
    out = await run_research(agent, body, request.app.state.strong_model, request.app.state.search_budget)
    out.id = await store_of(request).save_run("research_runs", {
        "series": body.series, "market": body.market, "request": body.model_dump(mode="json"),
        "result": out.model_dump(mode="json", exclude={"id"}), "model": out.model, "searches": out.searches})
    return out


@router.get("/signals/latest", response_model=ResearchResult | None)
async def latest_research(request: Request, series: SeriesId, market: Scope) -> ResearchResult | None:
    row = await store_of(request).latest_run("research_runs", series, market)
    return ResearchResult.model_validate({**row["result"], "id": row["id"]}) if row else None
