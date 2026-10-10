# Dixi docs

**New here? Start with [`requirements.md`](requirements.md)**: accounts, tools (Supabase CLI, Vercel, Entire) and first-time setup.

Architecture and design of the Dixi app. Diagrams are [Mermaid](https://mermaid.js.org); GitHub renders `.mmd` content when it is pasted in a ```` ```mermaid ```` block, and VS Code / mermaid.live preview the files directly.

## `architecture/`
| File | What it shows |
|---|---|
| `01-system-overview.mmd` | The whole pipeline: sources → three layers (principles, evidence, signals) → scoring → SMART requirements → human gates G1–G4 → decision memory and lineage → hand-off to engineering |
| `02-feedback-loop.mmd` | One decision end to end, as a sequence: "Should the next 7 Series be bigger?" including postpone and a memory edit |
| `03-data-model.mmd` | Entities and relations: markets, models, layers, sources and per-model weights, principles, evidence, requirements, scores, lineage, decisions, lessons, gaps |
| `04-build-plan.mmd` | The hackathon build plan, prioritised by the judging criteria |
| `05-hitl-map.mmd` | Where the human sits in the pipeline, and why |
| `06-web-app.mmd` | The current Next.js app: routes, components, shared globe, data modules, planned backend |

## Core ideas in one paragraph
Dixi turns customer feedback from every market into requirements for the next BMW, and keeps the reason for every decision. Signals sit in three layers: **L1 principles** (hard rules per market, owned by people), **L2 evidence** (customer studies, owner feedback, sales, quality data) and **L3 signals** (social media, search trends, concept tests). Each model has its own weights: social signals count more for an entry model than for a flagship. AI drafts most requirements as SMART targets; a product manager keeps, edits, postpones or rejects each one at defined gates. Every decision is stored with its evidence snapshot, so anyone can trace a requirement back to the comments behind it. Dixi also shows what it doesn't know: missing markets, thin samples and conflicting signals.

See also: [`tech-stack/`](tech-stack/README.md) (technology choices, versions, alternatives) and `../backend/` (planned API and agents).
