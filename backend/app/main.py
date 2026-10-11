"""Dixi API. Run locally: `uv run fastapi dev` · deploy: `fastapi deploy` (FastAPI Cloud)."""
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.research import build_research_agent, openai_models
from app.agents.tavily import tavily_toolset
from app.api import research
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.research_agent = None
    app.state.research_model = settings.openai_model_strong
    async with AsyncExitStack() as stack:
        try:
            search = tavily_toolset(settings)
            app.state.research_agent = build_research_agent(openai_models(settings), search, settings.scout_tool_calls)
            # One MCP session to Tavily for the app's lifetime instead of a reconnect per run.
            await stack.enter_async_context(search)
        except Exception as exc:  # missing key or Tavily unreachable: API stays up, /research answers 503
            app.state.research_agent = None
            app.state.research_unavailable = f"Research agent unavailable: {exc}"
        yield


app = FastAPI(title="Dixi API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origin_list, allow_methods=["GET", "POST"], allow_headers=["*"]
)
app.include_router(research.router)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "environment": settings.environment,
        "research": app.state.research_agent is not None,
        "openai_key": bool(settings.openai_api_key),
        "tavily_key": bool(settings.tavily_api_key),
    }
