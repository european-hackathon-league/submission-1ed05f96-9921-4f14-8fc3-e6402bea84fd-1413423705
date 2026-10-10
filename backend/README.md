# Dixi backend (planned)

Not built yet. This folder will hold the API and the AI agents behind the dashboard. Today the web app runs on typed sample data in `web/src/lib/`.

## Planned stack
Python · **FastAPI** · **Pydantic AI** (agents with typed outputs) · **Supabase** (Postgres + pgvector) · **OpenAI**. Details and alternatives: `../docs/tech-stack/README.md`. Architecture: `../docs/architecture/`.

## Planned layout
```
backend/
├── app/
│   ├── main.py              FastAPI app, routes
│   ├── api/                 /markets, /requirements, /decisions, /lineage, /weights, /principles, /gaps
│   ├── agents/              labeller, clusterer, requirement writer, prioritiser, scribe (Pydantic AI)
│   ├── scoring/             Dixi score (demand · market backing · principle fit) + decision memory (see docs/architecture/09)
│   ├── models/              Pydantic data contracts (Evidence, Requirement, Decision, Principle, Gap, …)
│   └── db/                  Supabase client, migrations
├── tests/
└── pyproject.toml           managed with uv
```

## Decision memory (must-have for the agents)
Before the requirement agent proposes feature requests for a series and market, it calls `get_decision_memory(series, market)`:
past decisions with who, when, reason and the customer count at the time. A request that was rejected before is **not proposed again**
at full strength. It comes back only when demand has grown past the team's threshold ("resurfaced"), and then the agent quotes the old
reason and the change. Matching uses the request title plus pgvector similarity, so a reworded request is still recognised. The rules and
weights match `web/src/lib/pipeline/scoring.ts` and the team's settings (`scoring_settings` table).

## Rules
- Customer data is never committed. Load it from Supabase or a local, git-ignored folder.
- Secrets come from the repo-root `.env` (git-ignored).
- Every agent output is typed and stored with its inputs, so each requirement can be traced back to its evidence.
