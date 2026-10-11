# Dixi docs

**New here? Start with [`requirements.md`](requirements.md)**: accounts, tools (Supabase CLI, Vercel, Entire) and first-time setup.

Architecture and design of the Dixi app. Each file in `architecture/` is a Markdown page with one [Mermaid](https://mermaid.js.org) diagram: GitHub renders it directly, and so does VS Code's Markdown preview (`Cmd+Shift+V`) with the *Markdown Preview Mermaid Support* extension.

## `architecture/`
| File | What it shows |
|---|---|
| [`01-system-overview.md`](architecture/01-system-overview.md) | The whole system: L1 BMW principles + L2 market evidence (incl. the research agent) → AI analysis → PM gate (keep / reject with reason / priority / wishlist) → 3 car profiles → generations → L3 social test after profiles |
| [`02-feedback-loop.md`](architecture/02-feedback-loop.md) | Target-state scenario, as a sequence: "Should the next 7 Series be bigger?" with engineering check, postpone and a memory edit (gates G1–G4 are planned, not built) |
| [`03-data-model.md`](architecture/03-data-model.md) | Entities as built: series, markets, feature requests, option items, market signals, principles, decisions (who · when · reason), generations, profiles, profile requirements, social-test campaigns; what lives in localStorage today vs planned Supabase |
| [`04-build-plan.md`](architecture/04-build-plan.md) | The original hackathon build plan, prioritised by the judging criteria |
| [`05-hitl-map.md`](architecture/05-hitl-map.md) | Where the human sits in the target pipeline (gates G1–G4), and why |
| [`06-web-app.md`](architecture/06-web-app.md) | The current Next.js app: routes, components, shared globe, data modules, planned backend |
| [`07-pm-workflow.md`](architecture/07-pm-workflow.md) | The product manager's path, as built in `/dashboard/[market]/[series]`: market → series → AI analysis + research agent (competitors, trends) → keep / reject with a required reason / reorder priority / wishlist → profiles that follow the PM's priority → optional social test (L3) |
| [`08-decision-audit.md`](architecture/08-decision-audit.md) | How one decision is made and audited: reject → required reason → decision {by, at, reason} → decision log, profile decision trail, PDF → snapshot in the next generation |
| [`09-scoring-and-memory.md`](architecture/09-scoring-and-memory.md) | The Dixi score (demand · market backing · principle fit) and decision memory: past rejects lower a request in later generations, fading with a half-life, unless demand grew ("resurfaced"); weights set in Dashboard → Settings, with sliders or in plain words (AI proposes, manager applies, change logged); backend plan for the AI agent |
| [`10-backend-agents.md`](architecture/10-backend-agents.md) | The backend agents as built: research run step by step (lead researcher + competitor and trend scout sub-agents on Tavily MCP, source check, gaps), which data goes where (BMW data stays local; only our request titles reach OpenAI), designed vs built, the frontend parts that use it |

## Core ideas in one paragraph
Dixi helps a BMW product manager turn what each market says into car profiles for the next 1, 5 or 7 Series, and keeps the reason for every decision. Inputs sit in three layers: **L1 BMW principles** (the fundamentals of each series, owned by managers), **L2 market evidence** (customer feedback and feature requests, customer studies, sales, today's option list, plus a research agent that adds competitor features people like and market trends, each with sources) and **L3 social test** (runs only after profiles exist: which profile tracks better on social media; low weight per series: 7 Series 2 %, 5 Series 8 %, 1 Series 20 %). The PM picks a market and a series; AI clusters the evidence into feature requests by category and urgency; the PM keeps or rejects each one (a reject needs a reason), drags them into priority order and wishlists competitor or trend features. Dixi then builds three profiles that follow that priority (score = L1 principles + priority fit, plus L2 coverage) and saves the build as a **generation** with its profiles, decisions and priority. Every decision records who made it (name and role, from a simple local identity until there is a login) and when, and shows up in the decision log, the profile's decision trail and its PDF. Today decisions, priority and generations live in the browser (localStorage); BMW-derived data stays local and git-ignored, and the public deployment runs on example data. Supabase tables are planned.

See also: [`tech-stack/`](tech-stack/README.md) (technology choices, versions, alternatives) and `../backend/` (FastAPI API; research agents live, more agents planned).
