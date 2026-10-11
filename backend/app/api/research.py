from fastapi import APIRouter, HTTPException, Request

from app.agents.research import run_research
from app.models.signals import ResearchRequest, ResearchResult

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/signals", response_model=ResearchResult)
async def research_signals(body: ResearchRequest, request: Request) -> ResearchResult:
    """Competitor features and market trends for one series and market, each with traced sources (L2 evidence).

    The result is a proposal: the PM keeps or rejects signals in the dashboard; nothing is stored here yet.
    """
    agent = request.app.state.research_agent
    if agent is None:
        raise HTTPException(503, detail=request.app.state.research_unavailable)
    return await run_research(agent, body, request.app.state.research_model, request.app.state.search_budget)
