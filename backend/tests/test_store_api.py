"""API + MemoryStore: principles by scope, append-only decisions, generations feed the next generation's memory."""
import json

import pytest
from fastapi.testclient import TestClient
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agents.principles import build_assessor
from app.models.core import Principle


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as c:
        store = app.state.store
        store.principles = {p.id: p for p in [
            Principle(id="GL-03", level="group", market="GLOBAL", title="Technology neutrality", statement="Keep drivetrain choice.", owner="Group"),
            Principle(id="EU-03", level="market", market="EU", title="Broad drivetrain", statement="Adoption differs.", owner="Region Europe"),
            Principle(id="UK-04", level="market", market="UK", title="Whole relationship", statement="Serve ownership.", owner="BMW UK"),
            Principle(id="CN-05", level="market", market="CN", title="Local software", statement="Localise digital.", owner="BMW China"),
            Principle(id="G60-P3", level="series", series="G60", title="Easy tech", statement="Easy without the manual.", owner="UX"),
        ]}
        yield c, app


def test_principles_by_scope_europe_includes_uk(client):
    c, _ = client
    ids = [p["id"] for p in c.get("/principles", params={"market": "EU", "series": "G60"}).json()]
    assert ids == ["EU-03", "G60-P3", "GL-03", "UK-04"]
    assert [p["id"] for p in c.get("/principles", params={"market": "CN"}).json()] == ["CN-05", "GL-03"]


def test_principle_edit_bumps_version(client):
    c, _ = client
    p = c.put("/principles/EU-03", json={"statement": "Adoption differs by country.", "by": "Region Europe"}).json()
    assert p["version"] == 2 and p["updated_by"] == "Region Europe"


def test_decisions_are_append_only_and_rejects_need_reason(client):
    c, _ = client
    base = {"series": "G60", "market": "EU", "requestId": "r1", "title": "Rear fridge", "by": "Ana", "role": "PM"}
    assert c.post("/decisions", json={**base, "action": "reject"}).status_code == 422
    assert c.post("/decisions", json={**base, "action": "reject", "reason": "Not core", "mentionsAt": 10}).status_code == 201
    assert c.post("/decisions", json={**base, "action": "undo"}).status_code == 201
    hist = c.get("/decisions", params={"series": "G60", "market": "EU"}).json()
    assert [d["action"] for d in hist] == ["reject", "undo"] and hist[0]["reason"] == "Not core"


def test_saved_generation_becomes_next_generations_memory(client):
    c, _ = client
    payload = {"id": "G-1", "series": "G60", "scope": "EU", "scopeLabel": "Europe", "createdAt": "2026-10-01T00:00:00Z",
               "decisions": {"r1": {"requestId": "r1", "title": "Rear fridge", "action": "reject", "reason": "Not core",
                                    "by": "Ana", "at": "2026-10-01T00:00:00Z", "mentionsAt": 10}}}
    gen = {"id": "G-1", "series": "G60", "market": "EU", "createdAt": payload["createdAt"], "createdBy": "Ana", "payload": payload}
    assert c.put("/generations/G-1", json=gen).status_code == 204
    assert [g["id"] for g in c.get("/generations", params={"series": "G60"}).json()] == ["G-1"]
    mem = c.get("/memory", params={"series": "G60", "market": "EU"}).json()
    assert mem[0]["title"] == "rear fridge" and mem[0]["action"] == "reject" and mem[0]["reason"] == "Not core"
    assert c.get("/memory", params={"series": "G60", "market": "US"}).json() == []  # memory scope: same market


def test_settings_are_saved_with_a_change_log(client):
    c, _ = client
    s = c.get("/settings").json()["settings"]
    r = c.put("/settings", json={"settings": {**s, "wDemand": 0.5}, "by": "Ana", "source": "sliders", "changes": ["wDemand 0.6 → 0.5"]})
    assert r.json()["settings"]["wDemand"] == 0.5
    log = c.get("/settings/changes").json()
    assert log[0]["before"]["wDemand"] == 0.6 and log[0]["after"]["wDemand"] == 0.5 and log[0]["by_name"] == "Ana"
    assert c.put("/settings", json={"settings": {**s, "wDemand": 3}, "by": "Ana"}).status_code == 422  # clamped by schema


def test_assessor_uses_memory_and_unknown_principles_are_dropped(client):
    c, app = client

    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        returns = [p for m in messages for p in getattr(m, "parts", []) if isinstance(p, ToolReturnPart)]
        if not returns:
            return ModelResponse(parts=[ToolCallPart("get_decision_memory", {})])
        prompt = messages[0].parts[-1].content
        assert "[G60-P3]" in prompt and "[UK-04]" in prompt and "[CN-05]" not in prompt  # only this scope's principles
        out = {"fits": [
            {"requestId": "r1", "fit": 0.8, "supports": ["G60-P3", "XX-99"], "tensions": [], "rationale": "Easy tech.",
             "evidence": ["12 mentions"], "assumptions": ["Buyers value simpler menus"], "memory": None},
        ], "conflicts": [], "gaps": []}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, out)])

    app.state.assessor = build_assessor(FunctionModel(model))
    body = {"series": "G60", "market": "EU", "requests": [
        {"id": "r1", "title": "Simpler iDrive menus", "category": "Digital", "mentions": 12},
        {"id": "r2", "title": "Rear fridge", "category": "Interior", "mentions": 3}]}
    res = c.post("/assess/principles", json=body).json()
    assert res["fits"][0]["supports"] == ["G60-P3"]
    assert any("XX-99" in g for g in res["gaps"]) and any("Rear fridge" in g for g in res["gaps"])
    assert set(res["principleIds"]) == {"EU-03", "G60-P3", "GL-03", "UK-04"}
    latest = c.get("/assess/principles/latest", params={"series": "G60", "market": "EU"}).json()
    assert latest["id"] == res["id"]


def test_assess_without_principles_is_a_clear_409(client):
    c, app = client
    app.state.store.principles = {}
    app.state.assessor = build_assessor(FunctionModel(lambda m, i: ModelResponse(parts=[])))
    r = c.post("/assess/principles", json={"series": "G70", "market": "JP", "requests": [
        {"id": "x", "title": "X", "category": "Digital", "mentions": 1}]})
    assert r.status_code == 409 and "seed_principles" in r.json()["detail"]


def test_l1_parser_on_inline_fixture():
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    from seed_principles import market_principles

    md = """### EU-03 — Use a broad drivetrain strategy

**Classification:** Explicit BMW strategy. **Confidence:** High.

BMW states the pace differs by market. [S1]

**General principle:** Manage the transition by adoption and infrastructure.

**Boundary:** Not proof that rules allow every drivetrain.

## Source register

- **[S1] BMW Group Report 2025:** strategy. https://www.bmwgroup.com/en/report/2025/index.html
"""
    [p] = market_principles("EU", md)
    assert (p.id, p.confidence, p.classification) == ("EU-03", "High", "Explicit BMW strategy")
    assert p.statement.startswith("Manage the transition") and p.boundary.startswith("Not proof")
    assert p.evidence == "BMW states the pace differs by market. [S1]"
    assert p.sources[0].url == "https://www.bmwgroup.com/en/report/2025/index.html"


def test_customer_quotes_never_reach_the_store(client):
    c, app = client
    req = {"id": "r1", "title": "Rear fridge", "quotes": ["a customer sentence"], "mentions": 3}
    payload = {"id": "G-Q", "series": "G60", "scope": "EU", "createdAt": "2026-10-01T00:00:00Z", "decisions": {},
               "profiles": [{"id": "fix", "requests": [req]}]}
    gen = {"id": "G-Q", "series": "G60", "market": "EU", "createdAt": payload["createdAt"], "payload": payload}
    assert c.put("/generations/G-Q", json=gen).status_code == 204
    stored = c.get("/generations").json()[0]["payload"]
    assert stored["profiles"][0]["requests"][0]["quotes"] == []
    assert "a customer sentence" not in json.dumps(stored)


def test_latest_research_run_is_kept_per_dataset(client):
    c, app = client
    import asyncio

    store = app.state.store
    base = {"series": "G60", "market": "EU", "model": "m", "searches": 1,
            "result": {"series": "G60", "market": "EU", "signals": [], "gaps": [], "model": "m", "searches": 1, "generatedAt": "t"}}
    asyncio.run(store.save_run("research_runs", {**base, "request": {"dataset": "bmw"}}))
    asyncio.run(store.save_run("research_runs", {**base, "request": {"dataset": "example"}}))
    bmw = c.get("/research/signals/latest", params={"series": "G60", "market": "EU", "dataset": "bmw"}).json()
    ex = c.get("/research/signals/latest", params={"series": "G60", "market": "EU", "dataset": "example"}).json()
    assert bmw["id"] != ex["id"] and bmw["id"].endswith("-1") and ex["id"].endswith("-2")
