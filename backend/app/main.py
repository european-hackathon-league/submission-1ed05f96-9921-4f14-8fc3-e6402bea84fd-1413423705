"""Dixi API. Run locally: `uv run fastapi dev` · deploy: `fastapi deploy` (FastAPI Cloud)."""
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.agents.chat import build_chat_agent
from app.agents.principles import build_assessor
from app.agents.research import build_research_agent, openai_models
from app.agents.tavily import tavily_toolset
from app.api import assess, chat, research, store
from app.config import get_settings
from app.db import StoreError, make_store

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = make_store(settings)
    app.state.research_agent = None
    app.state.assessor = None
    app.state.chat_agent = None
    app.state.strong_model = settings.openai_model_strong
    app.state.fast_model = settings.openai_model_fast
    app.state.search_budget = settings.scout_tool_calls
    async with AsyncExitStack() as stack:
        try:
            models = openai_models(settings)
            app.state.assessor = build_assessor(models.strong)
            app.state.chat_agent = build_chat_agent(models.fast)
            search = tavily_toolset(settings)
            app.state.research_agent = build_research_agent(models, search, settings.scout_tool_calls)
            # One MCP session to Tavily for the app's lifetime instead of a reconnect per run.
            await stack.enter_async_context(search)
        except Exception as exc:  # missing key or Tavily unreachable: the API stays up, agent routes answer 503
            app.state.research_agent = None
            app.state.agents_unavailable = f"Agents unavailable: {exc}"
        yield
        if hasattr(app.state.store, "aclose"):
            await app.state.store.aclose()


app = FastAPI(title="Dixi API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origin_list, allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["*"]
)
@app.exception_handler(StoreError)
async def store_error(_: Request, exc: StoreError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})


app.include_router(research.router)
app.include_router(assess.router)
app.include_router(chat.router)
app.include_router(store.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "environment": settings.environment,
        "store": app.state.store.kind,
        "research": app.state.research_agent is not None,
        "assessor": app.state.assessor is not None,
        "chat": app.state.chat_agent is not None,
        "openai_key": bool(settings.openai_api_key),
        "tavily_key": bool(settings.tavily_api_key),
    }
