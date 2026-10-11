"""Principles, decisions, generations, scoring settings and decision memory, stored in Supabase."""
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from app.api.deps import store_of
from app.models.core import (
    SCOPE_PRINCIPLE_MARKETS,
    Decision,
    DecisionIn,
    Generation,
    Principle,
    PrincipleEdit,
    Scope,
    SeriesId,
    SettingsState,
    SettingsUpdate,
)
from app.scoring import build_memory

router = APIRouter(tags=["store"])


@router.get("/principles", response_model=list[Principle])
async def principles(request: Request, market: Scope, series: SeriesId | None = None) -> list[Principle]:
    """L1 principles that apply here: the series' fundamentals, the market's principles (Europe includes the UK), the Group's."""
    return await store_of(request).list_principles(SCOPE_PRINCIPLE_MARKETS[market], series)


@router.put("/principles/{pid}", response_model=Principle)
async def edit_principle(pid: str, body: PrincipleEdit, request: Request) -> Principle:
    """Owners edit a principle; the version goes up and who/when is recorded."""
    p = await store_of(request).edit_principle(pid, body)
    if not p:
        raise HTTPException(404, detail=f"Unknown principle {pid}")
    return p


@router.post("/decisions", response_model=Decision, status_code=201)
async def add_decision(body: DecisionIn, request: Request) -> Decision:
    """Append one decision. Rejects need a reason (also enforced by the database)."""
    if body.action == "reject" and not (body.reason or "").strip():
        raise HTTPException(422, detail="A reject needs a reason")
    try:
        return await store_of(request).add_decision(body)
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc)) from exc


@router.get("/decisions", response_model=list[Decision])
async def list_decisions(request: Request, series: SeriesId, market: Scope | None = None) -> list[Decision]:
    """Full decision history (oldest first), including undos."""
    return await store_of(request).list_decisions(series, market)


@router.put("/generations/{gid}", status_code=204)
async def save_generation(gid: str, body: Generation, request: Request) -> None:
    if body.id != gid:
        raise HTTPException(422, detail="id mismatch")
    await store_of(request).save_generation(body)


@router.get("/generations", response_model=list[Generation])
async def list_generations(request: Request, series: SeriesId | None = None) -> list[Generation]:
    return await store_of(request).list_generations(series)


@router.delete("/generations/{gid}", status_code=204)
async def delete_generation(gid: str, request: Request) -> None:
    await store_of(request).delete_generation(gid)


@router.get("/settings", response_model=SettingsState)
async def get_settings(request: Request) -> SettingsState:
    return await store_of(request).get_settings()


@router.put("/settings", response_model=SettingsState)
async def save_settings(body: SettingsUpdate, request: Request) -> SettingsState:
    """Apply scoring settings (the manager clicked Apply) and log the change with who, source and instruction."""
    return await store_of(request).save_settings(body)


@router.get("/settings/changes")
async def setting_changes(request: Request, limit: int = Query(50, le=200)) -> list[dict[str, Any]]:
    return await store_of(request).list_setting_changes(limit)


@router.get("/memory")
async def memory(request: Request, series: SeriesId, market: Scope) -> list[dict[str, Any]]:
    """Decision memory as the next generation sees it: latest keep/reject per request from earlier generations."""
    store = store_of(request)
    state = await store.get_settings()
    gens = [g.payload for g in await store.list_generations(series)]
    mem = build_memory(gens, series, market, state.settings)
    return [{"title": k.split(":", 1)[1], **m.__dict__} for k, m in mem.items()]
