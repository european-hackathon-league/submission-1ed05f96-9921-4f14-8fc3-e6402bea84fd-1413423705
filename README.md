<p align="center">
  <img src="branding/logo.svg" alt="Dixi" height="56">
</p>

<p align="center"><b>Hear every market. Decide with a reason.</b></p>

<p align="center">
  <a href="https://dixi-wheat.vercel.app"><img alt="Live: dixi-wheat.vercel.app" src="https://img.shields.io/badge/Live-dixi--wheat.vercel.app-1c69d4?logo=vercel&logoColor=white&style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.143-009688?logo=fastapi&logoColor=white">
  <img alt="Pydantic AI" src="https://img.shields.io/badge/Pydantic_AI-2.55_+_Harness-E92063">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white">
  <img alt="Tavily MCP" src="https://img.shields.io/badge/Tavily-MCP-1c69d4">
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-API-412991?logo=openai&logoColor=white">
  <img alt="Built at the EHL Hackathon 2026" src="https://img.shields.io/badge/EHL_Hackathon-Munich_2026-1c69d4">
</p>

---

**Dixi** helps BMW product managers decide what the next 1, 5 or 7 Series should offer in Europe, the USA and China. It reads what customers in a market ask for, checks it against BMW's principles and what competitors and trends show, and lets the product manager decide. Every decision keeps who made it, when and why. The next generation remembers it.

*Named after the Dixi 3/15, BMW's first car (1928).*

## How Dixi thinks: three layers

| | Layer | What goes in | How it counts |
|---|---|---|---|
| 🟦 | **L1 · BMW principles** | 53 principles in Supabase: 9 series fundamentals (3 per series, owned by named teams), 34 market principles (Europe, UK, China, USA) and 10 BMW Group principles, each with evidence, boundary, confidence and sources. | The **principle assessor** rates every request against them. Its fit is the score's *principle fit*. |
| 🔵 | **L2 · Market evidence** | BMW's customer feedback (as feature requests with mention counts per market), customer studies, sales, today's option list, plus competitor features and trends from the **research agent**. | The main engine: *demand* and *market backing* in the score. |
| 🩵 | **L3 · Social test** | After profiles exist: which profile would track better on social media. **Simulated** (no social-media integration). | Weakest, fixed per series: 7 Series 2 %, 5 Series 8 %, 1 Series 20 %. |

**Dixi score** (0–100, per feature request): `100 × (wD·demand + wB·market backing + wF·principle fit) / (wD + wB + wF)`, then **decision memory**. A past reject lowers it by `penalty × 0.5^(days / half-life)` unless demand grew past the resurface threshold. A past keep adds a small bonus. The team sets the weights in *Dashboard → Settings*, with sliders or in plain words: the AI proposes, the manager applies, and every change is logged. Code: [`web/src/lib/pipeline/scoring.ts`](web/src/lib/pipeline/scoring.ts), mirrored in [`backend/app/scoring.py`](backend/app/scoring.py) and pinned to the same numbers by tests.

## The workflow, end to end

```mermaid
sequenceDiagram
  autonumber
  actor PM as Product manager
  participant Web as Dixi web (Next.js)
  participant API as Dixi API (FastAPI)
  participant AI as Agents (Pydantic AI · OpenAI)
  participant TV as Tavily MCP (web search)
  participant DB as Supabase

  PM->>Web: market + series (e.g. Europe · 5 Series)
  Web->>Web: feature requests from BMW data<br/>(built locally by scripts/build-pipeline-data.py)
  Web->>API: GET /principles
  API->>DB: series + market + Group principles
  Web->>API: POST /assess/principles (titles, categories, mention counts)
  API->>AI: principle assessor + get_decision_memory tool
  AI-->>API: fit · principle ids · evidence vs assumptions · conflicts · gaps
  API->>DB: principle_assessments
  opt PM clicks "Run research agent"
    Web->>API: POST /research/signals
    API->>AI: lead researcher → competitor scout + trend scout
    AI->>TV: tavily_search / tavily_extract
    API->>API: drop sources Tavily never returned
    API->>DB: research_runs
  end
  Web->>API: GET /generations · GET /decisions
  API->>DB: earlier generations = decision memory
  Web->>PM: one ranked list (Dixi score) + principles panel + competitors & trends
  PM->>Web: keep · reject with reason · priority · wishlist
  Web->>API: POST /decisions (append-only, undo is its own row)
  PM->>Web: Build profiles
  Web->>API: PUT /generations/{id} (profiles, decisions, priority, run ids)
  Note over Web,DB: The next analysis of this series + market reads this generation:<br/>rejected requests rank lower ("Rejected · reason · who"), kept ones get a bonus,<br/>a reject comes back as "Resurfaced" when demand grew ≥ 30 %.
```

## What works today, and where

| Claim | Status | Code |
|---|---|---|
| BMW data → feature requests per market (taxonomy clusters, mention counts, studies, sales, option list) | ✅ deterministic script, no LLM, no network | [`scripts/build-pipeline-data.py`](scripts/build-pipeline-data.py) → `web/data-local/pipeline.json` (git-ignored) |
| L1 principles stored and served per series + market (Europe includes the UK) | ✅ Supabase | [`supabase/migrations`](supabase/migrations), [`backend/scripts/seed_principles.py`](backend/scripts/seed_principles.py), `GET /principles` |
| Principle assessor: fit per request, cited ids, evidence vs assumptions, conflicts, gaps | ✅ runs in the analysis step; unknown ids dropped | [`backend/app/agents/principles.py`](backend/app/agents/principles.py), [`web/src/components/pipeline/PrinciplesPanel.tsx`](web/src/components/pipeline/PrinciplesPanel.tsx) |
| Research agent: competitors + trends with checked sources and gaps | ✅ lead + 2 scout sub-agents on Tavily MCP | [`backend/app/agents/research.py`](backend/app/agents/research.py), [`web/src/components/pipeline/SignalsPanel.tsx`](web/src/components/pipeline/SignalsPanel.tsx) |
| Dixi score with decision memory, settings by sliders or plain words, change log | ✅ | [`scoring.ts`](web/src/lib/pipeline/scoring.ts), [`WeightsAssistant.tsx`](web/src/components/dashboard/WeightsAssistant.tsx), `PUT /settings` |
| Decisions with who · when · reason; reject needs a reason (UI, API and database) | ✅ append-only history | [`decision-log.ts`](web/src/lib/pipeline/decision-log.ts), `POST /decisions` |
| Generations saved and read back as memory by the next generation | ✅ | [`sessions.ts`](web/src/lib/pipeline/sessions.ts), `PUT /generations`, `GET /memory` |
| 3 car profiles, L1 = principle fit + PM priority, tensions listed, PDF via print | ✅ | [`profiles.ts`](web/src/lib/pipeline/profiles.ts), [`Profiles.tsx`](web/src/components/pipeline/Profiles.tsx) |
| L3 social test | 🟡 simulated, labelled in the UI | [`analytics.ts`](web/src/lib/pipeline/analytics.ts) |
| Gates G1–G4, engineering/BOM check, Codebeamer export, postpone, side-by-side generation compare | ⚪ target design only | [`docs/architecture/05-hitl-map.md`](docs/architecture/05-hitl-map.md) |

**Honest by design.** Each agent returns what it could not find (`gaps`), and the principle assessor lists conflicts instead of averaging them away. Markets without comments fall back to all markets with a lower-confidence note. Every step of the analysis screen says where its data comes from.

**Data boundary.** BMW customer data never leaves the machine: no verbatims or quotes go to OpenAI, Tavily or Supabase. The agents get our own request titles, categories and mention counts. Details: [`docs/architecture/10-backend-agents.md`](docs/architecture/10-backend-agents.md).

## Run it

**Web only** (example data, everything stored in the browser):
```bash
cd web && pnpm install && pnpm dev            # http://localhost:3000
```

**Full stack** (agents + Supabase):
```bash
# 1. keys in the repo-root .env (git-ignored): OPENAI_API_KEY, TAVILY_API_KEY
#    and backend/.env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (see backend/.env.example)
supabase link --project-ref <ref> && supabase db push        # schema (supabase/migrations)
cd backend && uv sync
uv run python -I scripts/seed_principles.py                  # L1 principles (reads data/L1_Files locally)
uv run fastapi dev                                           # http://127.0.0.1:8000/docs
# 2. web: web/.env.local → NEXT_PUBLIC_API_URL=http://localhost:8000
cd ../web && pnpm dev
```
Tests: `cd backend && uv run pytest -q` (offline: fake models, fake search, in-memory store) · `cd web && pnpm lint && pnpm exec tsc --noEmit`. The live site **https://dixi-wheat.vercel.app** runs on example data without the backend. Setup details: [`docs/requirements.md`](docs/requirements.md); deploy: [`backend/README.md`](backend/README.md).

## What's in the repo

| Folder | What |
|---|---|
| [`web/`](web/) | The app: landing page with a market globe, the requirement pipeline, generations dashboard, settings |
| [`backend/`](backend/) | FastAPI API: research agent, principle assessor, store for principles, decisions, generations, settings |
| [`supabase/`](supabase/) | Database schema (migrations) |
| [`docs/`](docs/) | Setup, architecture diagrams (Mermaid), tech stack |
| [`scripts/`](scripts/) | Local BMW data build for the pipeline, image generation |
| [`branding/`](branding/) | Logo, colours, brand guide |

---

<sub>Built for the BMW challenge "AI for Product Decision Making" at the EHL Hackathon, Munich, October 2026. Dixi is a hackathon project and is not affiliated with BMW. Market principles come from the team's public-source research; series fundamentals and competitor notes are example content.</sub>
