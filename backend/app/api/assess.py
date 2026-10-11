from fastapi import APIRouter, HTTPException, Request

from app.agents.principles import run_assessment
from app.api.deps import agent_or_503, store_of
from app.models.assess import AssessRequest, AssessResult
from app.models.core import Scope, SeriesId

router = APIRouter(prefix="/assess", tags=["agents"])


@router.post("/principles", response_model=AssessResult)
async def assess_principles(body: AssessRequest, request: Request) -> AssessResult:
    """L1 principle fit per feature request (AI proposes; the score uses it, the PM decides). Stored with its inputs."""
    agent = agent_or_503(request, "assessor")
    try:
        return await run_assessment(agent, store_of(request), body, request.app.state.strong_model)
    except LookupError as exc:
        raise HTTPException(409, detail=str(exc)) from exc


@router.get("/principles/latest", response_model=AssessResult | None)
async def latest_assessment(request: Request, series: SeriesId, market: Scope) -> AssessResult | None:
    row = await store_of(request).latest_run("principle_assessments", series, market)
    return AssessResult.model_validate({**row["result"], "id": row["id"]}) if row else None
