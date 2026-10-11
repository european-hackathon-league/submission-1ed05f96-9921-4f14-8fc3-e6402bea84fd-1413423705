"""Storage for principles, decisions, generations, agent runs and scoring settings.

SupabaseStore talks to the hosted project through its REST API (PostgREST) with the backend-only secret key;
schema in supabase/migrations. MemoryStore has the same interface for tests and for running without Supabase.
"""
from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.config import Settings
from app.models.core import Decision, DecisionIn, Generation, Principle, PrincipleEdit, ScoringSettings, SettingsState, SettingsUpdate


def strip_customer_text(payload: Any) -> Any:
    """Defence in depth: BMW customer quotes never go into Supabase, whatever a client sends."""
    if isinstance(payload, dict):
        return {k: ([] if k == "quotes" else strip_customer_text(v)) for k, v in payload.items()}
    if isinstance(payload, list):
        return [strip_customer_text(v) for v in payload]
    return payload


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class StoreError(RuntimeError):
    """The database refused or failed a request; the API answers 502 with this message."""


class Store(Protocol):
    kind: str

    async def list_principles(self, markets: list[str], series: str | None) -> list[Principle]: ...
    async def upsert_principles(self, rows: list[Principle]) -> int: ...
    async def edit_principle(self, pid: str, edit: PrincipleEdit) -> Principle | None: ...
    async def add_decision(self, d: DecisionIn) -> Decision: ...
    async def list_decisions(self, series: str, market: str | None) -> list[Decision]: ...
    async def save_generation(self, g: Generation) -> None: ...
    async def list_generations(self, series: str | None = None) -> list[Generation]: ...
    async def delete_generation(self, gid: str) -> None: ...
    async def save_run(self, table: str, row: dict[str, Any]) -> str: ...
    async def latest_run(self, table: str, series: str, market: str) -> dict[str, Any] | None: ...
    async def get_settings(self) -> SettingsState: ...
    async def save_settings(self, u: SettingsUpdate) -> SettingsState: ...
    async def list_setting_changes(self, limit: int = 50) -> list[dict[str, Any]]: ...


def _principle_filter(p: Principle, markets: list[str], series: str | None) -> bool:
    if not p.active:
        return False
    if p.level == "series":
        return series is not None and p.series == series
    return p.market in markets


# ---------------------------------------------------------------- in memory


class MemoryStore:
    kind = "memory"

    def __init__(self) -> None:
        self.principles: dict[str, Principle] = {}
        self.decisions: list[Decision] = []
        self.generations: dict[str, Generation] = {}
        self.runs: dict[str, list[dict[str, Any]]] = {"research_runs": [], "principle_assessments": []}
        self.settings = SettingsState(settings=ScoringSettings())
        self.changes: list[dict[str, Any]] = []

    async def list_principles(self, markets, series):
        return sorted((p for p in self.principles.values() if _principle_filter(p, markets, series)), key=lambda p: p.id)

    async def upsert_principles(self, rows):
        for p in rows:
            self.principles[p.id] = p
        return len(rows)

    async def edit_principle(self, pid, edit):
        p = self.principles.get(pid)
        if not p:
            return None
        p = p.model_copy(update={"statement": edit.statement, "boundary": edit.boundary, "version": p.version + 1,
                                 "updated_by": edit.by, "updated_at": _now()})
        self.principles[pid] = p
        return p

    async def add_decision(self, d):
        if d.action == "reject" and not (d.reason or "").strip():
            raise ValueError("A reject needs a reason")
        row = Decision(id=len(self.decisions) + 1, **d.model_dump(exclude={"at"}), at=d.at or _now())
        self.decisions.append(row)
        return row

    async def list_decisions(self, series, market):
        return [d for d in self.decisions if d.series == series and (market is None or d.market == market)]

    async def save_generation(self, g):
        self.generations[g.id] = g.model_copy(update={"payload": strip_customer_text(g.payload)})

    async def list_generations(self, series=None):
        gs = [g for g in self.generations.values() if series is None or g.series == series]
        return sorted(gs, key=lambda g: g.createdAt, reverse=True)

    async def delete_generation(self, gid):
        self.generations.pop(gid, None)

    async def save_run(self, table, row):
        rid = f"{table}-{len(self.runs[table]) + 1}"
        self.runs[table].append({"id": rid, "created_at": _now(), **row})
        return rid

    async def latest_run(self, table, series, market):
        rows = [r for r in self.runs[table] if r["series"] == series and r["market"] == market]
        return rows[-1] if rows else None

    async def get_settings(self):
        return self.settings

    async def save_settings(self, u):
        before = self.settings.settings
        self.settings = SettingsState(settings=u.settings, updatedAt=_now(), updatedBy=u.by)
        self.changes.append({"instruction": u.instruction, "source": u.source, "changes": u.changes,
                             "before": before.model_dump(), "after": u.settings.model_dump(),
                             "by_name": u.by, "by_role": u.role, "at": _now()})
        return self.settings

    async def list_setting_changes(self, limit=50):
        return list(reversed(self.changes))[:limit]


# ---------------------------------------------------------------- Supabase


class SupabaseStore:
    kind = "supabase"

    def __init__(self, url: str, key: str) -> None:
        headers = {"apikey": key, "Content-Type": "application/json"}
        if key.startswith("eyJ"):  # legacy service_role JWT also goes in Authorization; new sb_secret_ keys do not
            headers["Authorization"] = f"Bearer {key}"
        self.http = httpx.AsyncClient(base_url=f"{url.rstrip('/')}/rest/v1", headers=headers, timeout=20)

    async def aclose(self) -> None:
        await self.http.aclose()

    async def _get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        r = await self.http.get(f"/{table}", params=params)
        if r.status_code >= 400:
            raise StoreError(f"Supabase {table}: {r.status_code} {r.text[:300]}")
        return r.json()

    async def _post(self, table: str, rows: Any, upsert: bool = False) -> list[dict[str, Any]]:
        prefer = "return=representation" + (",resolution=merge-duplicates" if upsert else "")
        r = await self.http.post(f"/{table}", json=rows, headers={"Prefer": prefer})
        if r.status_code >= 400:
            raise StoreError(f"Supabase {table}: {r.status_code} {r.text[:300]}")
        return r.json()

    async def list_principles(self, markets, series):
        rows = await self._get("principles", {"select": "*", "active": "eq.true", "order": "id"})
        return [p for p in (Principle.model_validate(r) for r in rows) if _principle_filter(p, markets, series)]

    async def upsert_principles(self, rows):
        out = await self._post("principles", [p.model_dump(exclude={"updated_at"}) for p in rows], upsert=True)
        return len(out)

    async def edit_principle(self, pid, edit):
        cur = await self._get("principles", {"select": "version", "id": f"eq.{pid}"})
        if not cur:
            return None
        r = await self.http.patch(
            "/principles", params={"id": f"eq.{pid}"}, headers={"Prefer": "return=representation"},
            json={"statement": edit.statement, "boundary": edit.boundary, "version": cur[0]["version"] + 1,
                  "updated_by": edit.by, "updated_at": _now()},
        )
        if r.status_code >= 400:
            raise StoreError(f"Supabase principles: {r.status_code} {r.text[:300]}")
        return Principle.model_validate(r.json()[0])

    async def add_decision(self, d):
        row = {"series": d.series, "market": d.market, "request_id": d.requestId, "title": d.title, "action": d.action,
               "reason": d.reason, "mentions_at": d.mentionsAt, "by_name": d.by, "by_role": d.role,
               "at": d.at or _now(), "generation_id": d.generationId}
        out = (await self._post("decisions", row))[0]
        return _decision(out)

    async def list_decisions(self, series, market):
        params = {"select": "*", "series": f"eq.{series}", "order": "at.asc"}
        if market:
            params["market"] = f"eq.{market}"
        return [_decision(r) for r in await self._get("decisions", params)]

    async def save_generation(self, g):
        await self._post("generations", {
            "id": g.id, "series": g.series, "market": g.market, "created_at": g.createdAt, "created_by": g.createdBy,
            "created_by_role": g.createdByRole, "payload": strip_customer_text(g.payload), "updated_at": _now()}, upsert=True)

    async def list_generations(self, series=None):
        params = {"select": "*", "order": "created_at.desc", "limit": "100"}
        if series:
            params["series"] = f"eq.{series}"
        return [Generation(id=r["id"], series=r["series"], market=r["market"], createdAt=r["created_at"],
                           createdBy=r["created_by"], createdByRole=r["created_by_role"], payload=r["payload"])
                for r in await self._get("generations", params)]

    async def delete_generation(self, gid):
        r = await self.http.delete("/generations", params={"id": f"eq.{gid}"})
        if r.status_code >= 400:
            raise StoreError(f"Supabase generations: {r.status_code} {r.text[:300]}")

    async def save_run(self, table, row):
        return (await self._post(table, row))[0]["id"]

    async def latest_run(self, table, series, market):
        rows = await self._get(table, {"select": "*", "series": f"eq.{series}", "market": f"eq.{market}",
                                       "order": "created_at.desc", "limit": "1"})
        return rows[0] if rows else None

    async def get_settings(self):
        rows = await self._get("scoring_settings", {"select": "*", "id": "eq.global"})
        if not rows:
            return SettingsState(settings=ScoringSettings())
        r = rows[0]
        return SettingsState(settings=ScoringSettings.model_validate(r["settings"]), updatedAt=r["updated_at"], updatedBy=r["updated_by"])

    async def save_settings(self, u):
        before = await self.get_settings()
        await self._post("scoring_settings", {"id": "global", "settings": u.settings.model_dump(), "updated_at": _now(),
                                              "updated_by": u.by}, upsert=True)
        await self._post("scoring_changes", {"instruction": u.instruction, "source": u.source, "changes": u.changes,
                                             "before": before.settings.model_dump(), "after": u.settings.model_dump(),
                                             "by_name": u.by, "by_role": u.role})
        return await self.get_settings()

    async def list_setting_changes(self, limit=50):
        return await self._get("scoring_changes", {"select": "*", "order": "at.desc", "limit": str(limit)})


def _decision(r: dict[str, Any]) -> Decision:
    return Decision(id=r["id"], series=r["series"], market=r["market"], requestId=r["request_id"], title=r["title"],
                    action=r["action"], reason=r["reason"], mentionsAt=r["mentions_at"], by=r["by_name"],
                    role=r["by_role"], at=r["at"], generationId=r["generation_id"])


def make_store(settings: Settings) -> Store:
    keys = [settings.supabase_secret_key, settings.supabase_service_role_key]
    key = next((k for k in keys if k and k.isascii()), None)  # a masked key copied from a listing is not ASCII
    if settings.supabase_url and key:  # hosted project or a local `supabase start` stack
        return SupabaseStore(settings.supabase_url, key)
    return MemoryStore()
