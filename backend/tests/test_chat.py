"""Generation chat: the agent retrieves facts through tools; `sources` is recorded by code."""
import json

from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agents.chat import build_chat_agent
from app.models.core import Generation, Principle

PAYLOAD = {
    "id": "G-1", "series": "G60", "scope": "EU", "scopeLabel": "Europe", "seriesName": "5 Series",
    "createdAt": "2026-10-11T09:05:00Z",
    "profiles": [{"id": "fix", "name": "Fix the basics", "score": {"l1": 0.8, "l2": 0.6, "l3": None, "total": 0.7},
                  "requests": [{"title": "More real-world electric range", "category": "Powertrain", "priority": 1, "scoped": 13, "quotes": []}],
                  "wishes": [], "backing": [], "why": ["Covers 13 customer mentions."], "principles": None}],
    "decisions": {"r9": {"requestId": "r9", "title": "More storage and luggage space", "action": "reject",
                         "reason": "Boot space is fixed by the platform", "by": "Marco Rossi", "at": "2026-10-11T09:05:00Z"}},
    "campaigns": None, "assessmentId": None, "researchRunId": None,
}


def test_chat_answers_from_retrieved_facts_and_lists_sources():
    seen: dict = {}

    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        returns = [p for m in messages for p in getattr(m, "parts", []) if isinstance(p, ToolReturnPart)]
        if not returns:
            return ModelResponse(parts=[ToolCallPart("get_generation", {}), ToolCallPart("get_principles", {"ids": ["G60-P1"]})])
        gen = next(r for r in returns if r.tool_name == "get_generation").content
        seen["decision"] = gen["decisions"][0]
        out = {"answer": f"It was rejected by {gen['decisions'][0]['by']}: {gen['decisions'][0]['reason']}.",
               "cited": ["More storage and luggage space", "G60-P1"]}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, out)])

    from app.main import app

    with TestClient(app) as c:
        store = app.state.store
        store.principles = {"G60-P1": Principle(id="G60-P1", level="series", series="G60", title="Comfort first",
                                                 statement="Business sedan first.", owner="PM 5 Series")}
        store.generations["G-1"] = Generation(id="G-1", series="G60", market="EU", createdAt=PAYLOAD["createdAt"],
                                              createdBy="Marco Rossi", payload=PAYLOAD)
        app.state.chat_agent = build_chat_agent(FunctionModel(model))
        r = c.post("/chat/generation", json={"generationId": "G-1", "question": "Why was luggage space rejected?", "profileId": "fix"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "Boot space is fixed" in body["answer"]
        assert body["sources"] == ["generation G-1", "principles G60-P1"]
        assert seen["decision"]["by"] == "Marco Rossi"
        assert "quotes" not in json.dumps(seen)  # the chat never sees customer text

        assert c.post("/chat/generation", json={"generationId": "G-missing", "question": "?"}).status_code == 404
