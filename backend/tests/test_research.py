"""Offline tests: fake models (FunctionModel) and a fake Tavily search. No keys, no credits."""
import json

from fastapi.testclient import TestClient
from pydantic_ai import RunContext
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.toolsets import FunctionToolset

from app.agents.deps import ResearchDeps
from app.agents.research import ResearchModels, build_research_agent, run_research, verify_sources
from app.agents.tavily import record_urls
from app.models.signals import MarketSignal, ResearchRequest

REAL = "https://www.euroncap.com/press/2026-protocol"
FAKE = "https://example.com/made-up"


def fake_search() -> FunctionToolset[ResearchDeps]:
    ts = FunctionToolset[ResearchDeps]()

    @ts.tool
    def tavily_search(ctx: RunContext[ResearchDeps], query: str) -> str:
        out = f"Title: Euro NCAP 2026\nURL: {REAL}\nContent: physical buttons rewarded ({query})"
        record_urls(ctx.deps, out)
        return out

    return ts


def signal(title: str, url: str, kind: str = "trend") -> dict:
    return {
        "id": "S00", "kind": kind, "series": ["G60"], "markets": ["EU"], "title": title, "category": "Interior",
        "detail": "Euro NCAP 2026 rewards physical controls.", "relatesTo": [], "strength": "strong",
        "sources": [{"label": "Euro NCAP", "url": url}],
    }


def final_tool(info: AgentInfo) -> str:
    return info.output_tools[0].name


def scout_model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    if len(messages) == 1:  # first turn: search
        return ModelResponse(parts=[ToolCallPart("tavily_search", {"query": "physical buttons EU"})])
    out = {"signals": [signal("Physical buttons are back", REAL), signal("Invented trend", FAKE)], "gaps": []}
    return ModelResponse(parts=[ToolCallPart(final_tool(info), out)])


def lead_model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    returns = [p for m in messages for p in getattr(m, "parts", []) if isinstance(p, ToolReturnPart)]
    if not returns:
        return ModelResponse(parts=[
            ToolCallPart("delegate_task", {"agent_name": "competitor_scout", "task": "EU 5 Series competitors"}),
            ToolCallPart("delegate_task", {"agent_name": "trend_scout", "task": "EU 5 Series trends"}),
        ])
    found = [s for r in returns for s in json.loads(r.content).get("signals", [])]
    out = {"signals": found[:2] + found[1:2], "gaps": ["No China data asked for"]}
    out["signals"][0]["relatesTo"] = ["Simpler iDrive menus"]
    return ModelResponse(parts=[ToolCallPart(final_tool(info), out)])


def agent():
    return build_research_agent(ResearchModels(fast=FunctionModel(scout_model), strong=FunctionModel(lead_model)), fake_search())


async def test_sub_agents_search_and_hallucinated_sources_are_dropped():
    req = ResearchRequest(series="G60", market="EU", featureRequests=["Simpler iDrive menus"])
    res = await run_research(agent(), req, "test")
    assert res.searches == 2  # one search per scout
    assert [s.title for s in res.signals] == ["Physical buttons are back"]
    assert res.signals[0].id == "S01" and res.signals[0].relatesTo == ["Simpler iDrive menus"]
    assert any("Invented trend" in g for g in res.gaps)


def test_verify_sources_matches_trailing_slash_and_case():
    s = MarketSignal.model_validate(signal("A", REAL + "/"))
    kept, gaps = verify_sources([s], {REAL.upper()})
    assert len(kept) == 1 and not gaps


def test_api_returns_503_without_keys(monkeypatch):
    from app.main import app

    with TestClient(app) as client:
        app.state.research_agent = None
        app.state.research_unavailable = "Research agent unavailable: TAVILY_API_KEY is not set"
        assert client.get("/health").json()["status"] == "ok"
        r = client.post("/research/signals", json={"series": "G60", "market": "EU"})
        assert r.status_code == 503


def test_api_runs_agent(monkeypatch):
    from app.main import app

    with TestClient(app) as client:
        app.state.research_agent = agent()
        r = client.post("/research/signals", json={"series": "G60", "market": "EU", "maxSignals": 5})
        assert r.status_code == 200, r.text
        assert r.json()["signals"][0]["sources"][0]["url"] == REAL
