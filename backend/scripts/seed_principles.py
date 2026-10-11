"""Seed L1 principles into Supabase.

Sources (both read locally; nothing here is committed data):
- data/L1_Files/*_general_principles.md + bmw_global_principles_across_four_markets.md (team research, git-ignored):
  Group-wide principles GL-01…GL-10 and market principles EU-xx, UK-xx, CN-xx, US-xx, each with classification,
  confidence, evidence, the principle statement, its boundary and its sources.
- web/src/lib/pipeline/series.ts: the per-series product fundamentals (G60-P1 …), so web and backend share one source.

Run from backend/:  uv run python -I scripts/seed_principles.py [--dry-run]
"""
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.db import SupabaseStore, make_store  # noqa: E402
from app.models.core import Principle, Source  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
L1 = ROOT / "data" / "L1_Files"
SERIES_TS = ROOT / "web" / "src" / "lib" / "pipeline" / "series.ts"
MARKET_FILES = {"EU": "bmw_europe_general_principles.md", "UK": "bmw_uk_general_principles.md",
                "CN": "bmw_china_general_principles.md", "US": "bmw_us_general_principles.md"}
OWNERS = {"GLOBAL": "Group strategy", "EU": "Region Europe", "UK": "BMW UK", "CN": "BMW China", "US": "BMW of North America"}


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("**", "")).strip()


def sources_of(md: str) -> dict[str, Source]:
    """'- **[S1] Label:** description. https://…' lines of the source register."""
    out = {}
    for m in re.finditer(r"^- \*\*\[(S\d+)\]\s*(.+?):?\*\*:?(.*)$", md, re.M):
        ref, label, rest = m.group(1), m.group(2).rstrip(":"), m.group(3)
        url = re.search(r"https?://\S+", rest)
        out[ref] = Source(ref=ref, label=clean(label), url=url.group(0).rstrip(".,)") if url else None)
    return out


def field(block: str, name: str) -> str | None:
    m = re.search(rf"\*\*{name}:\*\*\s*(.+?)(?=\n\s*\n|\Z)", block, re.S)
    return clean(m.group(1)) if m else None


def cited(text: str, register: dict[str, Source]) -> list[Source]:
    refs = dict.fromkeys(re.findall(r"\[(S\d+)\]", text))
    return [register[r] for r in refs if r in register]


def market_principles(market: str, md: str) -> list[Principle]:
    register = sources_of(md)
    rows = []
    for m in re.finditer(r"^### ([A-Z]{2}-\d{2}) — (.+?)\n(.*?)(?=^### |^## |\Z)", md, re.S | re.M):
        pid, title, block = m.group(1), m.group(2).strip(), m.group(3)
        cls = re.search(r"\*\*Classification:\*\*\s*(.+?)\s*\*\*Confidence:\*\*\s*(\w+)", block)
        paras = [p for p in re.split(r"\n\s*\n", block.strip()) if p.strip() and not p.lstrip().startswith("**")]
        rows.append(Principle(
            id=pid, level="market", market=market, title=title,
            statement=field(block, "General principle") or clean(paras[0] if paras else title),
            evidence=clean(" ".join(paras)) or None, boundary=field(block, "Boundary"),
            classification=clean(cls.group(1)).rstrip(".") if cls else None, confidence=cls.group(2) if cls else None,
            sources=cited(block, register), owner=OWNERS[market],
        ))
    return rows


def group_principles(md: str) -> list[Principle]:
    register = sources_of(md)
    rows = []
    for m in re.finditer(r"^### (\d+)\. (.+?)\n(.*?)(?=^### |^## |\Z)", md, re.S | re.M):
        n, title, block = int(m.group(1)), m.group(2).strip(), m.group(3)
        paras = [p for p in re.split(r"\n\s*\n", block.strip()) if p.strip() and not p.lstrip().startswith("**")]
        applied = field(block, "Application pattern")
        evidence = clean(" ".join(paras)) + (f" Application by market: {applied}" if applied else "")
        rows.append(Principle(
            id=f"GL-{n:02d}", level="group", market="GLOBAL", title=title,
            statement=field(block, "Principle") or f"{title}.",
            evidence=evidence or None, boundary=None,
            classification="Explicit Group-level principle (BMW statements)", confidence=None,
            sources=cited(block, register), owner=OWNERS["GLOBAL"],
        ))
    return rows


def series_principles(ts: str) -> list[Principle]:
    rows = []
    for block in re.finditer(r'id: "(F70|G60|G70)",(.*?)l3Weight', ts, re.S):
        series, body = block.group(1), block.group(2)
        for p in re.finditer(r'\{ id: "(P\d)", text: "(.+?)", owner: "(.+?)" \}', body):
            rows.append(Principle(
                id=f"{series}-{p.group(1)}", level="series", series=series, title=p.group(2).rstrip("."),
                statement=p.group(2), classification="Series fundamental (example content, owned by the PM team)",
                owner=p.group(3),
            ))
    return rows


def load_all() -> list[Principle]:
    rows = group_principles((L1 / "bmw_global_principles_across_four_markets.md").read_text())
    for market, name in MARKET_FILES.items():
        rows += market_principles(market, (L1 / name).read_text())
    return rows + series_principles(SERIES_TS.read_text())


async def main() -> None:
    rows = load_all()
    by_level: dict[str, int] = {}
    for p in rows:
        by_level[p.market or p.series or ""] = by_level.get(p.market or p.series or "", 0) + 1
    print(f"parsed {len(rows)} principles:", by_level)
    if "--dry-run" in sys.argv:
        for p in rows[:3] + rows[-2:]:
            print(p.model_dump_json(indent=1)[:700])
        return
    store = make_store(get_settings())
    if not isinstance(store, SupabaseStore):
        sys.exit("Supabase is not configured (SUPABASE_URL + SUPABASE_SECRET_KEY in backend/.env)")
    print("upserted", await store.upsert_principles(rows))
    await store.aclose()


if __name__ == "__main__":
    asyncio.run(main())
