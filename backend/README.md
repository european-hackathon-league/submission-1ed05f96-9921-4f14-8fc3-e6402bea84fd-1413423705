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
│   ├── scoring/             three-layer score: layer weights × source weights × market volume, principle gate
│   ├── models/              Pydantic data contracts (Evidence, Requirement, Decision, Principle, Gap, …)
│   └── db/                  Supabase client, migrations
├── tests/
└── pyproject.toml           managed with uv
```

## Rules
- Customer data is never committed. Load it from Supabase or a local, git-ignored folder.
- Secrets come from the repo-root `.env` (git-ignored).
- Every agent output is typed and stored with its inputs, so each requirement can be traced back to its evidence.
