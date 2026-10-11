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


@router.get("/principles/run/{rid}", response_model=AssessResult)
async def assessment_by_id(rid: str, request: Request) -> AssessResult:
    """One stored assessment, e.g. the one a generation was built with (its assessmentId)."""
    row = await store_of(request).get_run("principle_assessments", rid)
    if not row:
        raise HTTPException(404, detail=f"Unknown assessment {rid}")
    return AssessResult.model_validate({**row["result"], "id": row["id"]})


@router.get("/principles/latest", response_model=AssessResult | None)
async def latest_assessment(request: Request, series: SeriesId, market: Scope, dataset: str | None = None) -> AssessResult | None:
    """The last assessment for this series + market (and dataset, so example and BMW runs never mix)."""
    row = await store_of(request).latest_run("principle_assessments", series, market, dataset)
    return AssessResult.model_validate({**row["result"], "id": row["id"]}) if row else None
