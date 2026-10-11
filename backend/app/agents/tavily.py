"""Tavily remote MCP server as the agents' web search (https://docs.tavily.com/documentation/mcp).

Only search and extract are exposed: crawl, map and research cost far more credits and are not needed here.
Every URL Tavily returns is recorded in the run's deps, so the orchestrator can drop sources the model made up.
"""
import json
import re
from typing import Any

from pydantic_ai import RunContext
from pydantic_ai.mcp import CallToolFunc, MCPToolset
from pydantic_ai.toolsets import AbstractToolset

from app.agents.deps import BUDGET_USED_UP, ResearchDeps
from app.config import Settings

ALLOWED_TOOLS = {"tavily_search", "tavily_extract"}
URL_RE = re.compile(r"https?://[^\s\"'<>)\]]+")


def record_urls(deps: ResearchDeps, result: Any) -> None:
    text = result if isinstance(result, str) else json.dumps(result, default=str)
    deps.seen_urls.update(u.rstrip(".,;") for u in URL_RE.findall(text))
    deps.searches += 1


async def _record(ctx: RunContext[ResearchDeps], call_tool: CallToolFunc, name: str, args: dict[str, Any]) -> Any:
    if not ctx.deps.take_search(ctx):
        return BUDGET_USED_UP
    result = await call_tool(name, args)
    record_urls(ctx.deps, result)
    return result


def tavily_toolset(settings: Settings) -> AbstractToolset[ResearchDeps]:
    headers = {"DEFAULT_PARAMETERS": json.dumps({"search_depth": settings.tavily_search_depth})}
    if not settings.tavily_api_key:
        if not settings.tavily_keyless:
            raise RuntimeError("TAVILY_API_KEY is not set (or set TAVILY_KEYLESS=true for rate-limited dev use)")
        # Keyless mode: search + extract only, rate-limited (https://docs.tavily.com/documentation/keyless).
        headers["X-Tavily-Access-Mode"] = "keyless"
    server = MCPToolset(
        settings.tavily_mcp_url,
        # Bearer header, not ?tavilyApiKey=: URLs end up in logs and traces.
        auth=settings.tavily_api_key or None,
        headers=headers,
        process_tool_call=_record,
        read_timeout=60,
    )
    return server.filtered(lambda ctx, tool_def: tool_def.name in ALLOWED_TOOLS)
