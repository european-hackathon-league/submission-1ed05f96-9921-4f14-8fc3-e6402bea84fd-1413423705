from fastapi import HTTPException, Request

from app.db import Store


def store_of(request: Request) -> Store:
    return request.app.state.store


def agent_or_503(request: Request, name: str):
    agent = getattr(request.app.state, name, None)
    if agent is None:
        raise HTTPException(503, detail=getattr(request.app.state, "agents_unavailable", "Agents unavailable"))
    return agent
