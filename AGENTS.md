# AGENTS.md: Dixi · EHL Hackathon 2026 · BMW "AI for Product Decision Making"

This is the single source of instructions for every coding agent (Claude Code, Codex, Cursor, …). `CLAUDE.md` only imports this file, so edit this file and nothing else.

## 0. First thing every session: personal memory
- Read `memory.md` in the repo root. It holds **this user's** saved context: decisions, preferences, open threads. It is git-ignored and personal, so each teammate has their own.
- **If `memory.md` does not exist, create it** from the template below before doing anything else.
- When the user tells you something worth keeping (a decision, preference, credential *location* (never the secret), deadline or contact), append it to `memory.md` with the date. Keep entries short. Update stale entries instead of duplicating them.

```markdown
# memory.md (personal, git-ignored, never commit)
_Owner: <name> · created <YYYY-MM-DD>_

## Preferences
- 

## Decisions
- 

## Open threads / todo
- 

## Useful facts
- 
```

## 1. Log important prompts
- Save every substantial instruction from the user (a new feature, direction change or product idea) **verbatim** as a new file in `prompts/`, named `NN-short-slug.md`, numbered after the last file. **Redact secrets** (API keys) before saving.
- Add one line at the end: **Result:** what was produced.
- `prompts/` is local only (git-ignored).

## 1b. Every source document gets an overview
- Put each new document (PDF, slides, report, link, transcript) in `data/sources/` and write `data/sources/overviews/<slug>-overview.md`: what it is, why it matters, key facts with page/slide numbers, how to use it in the product, gaps.
- `data/` is local only (git-ignored).

## 2. Project context
- **Challenge:** derive, justify and prioritise customer requirements for a BMW successor vehicle (1/5/7 Series; Europe, China, USA; 3–5 years ahead). The product manager stays in control, every decision is traceable, evidence and assumptions stay separate, and conflicts are shown, not averaged away.
- **Judging rubric:** decision and scoring logic · workflow and human decisions · traceability and auditability (incl. postponements) · quality, usability and feasibility · innovation, scale and business impact · plus "we reward honesty" (surface missing evidence, conflicts and uncertainty). Logic, workflow and traceability come first when deciding what to build.
- **Product: Dixi**, named after the Dixi 3/15, BMW's first car (1928). A principled, weighted, traceable requirement engine: three layers (L1 principles, L2 evidence, L3 signals), source weights per model, human gates G1–G4, an editable decision memory, lineage from comment to requirement, and "what we don't know" gap cards. Architecture: `docs/architecture/`.
- **Mandatory:** the repo must use **Entire** (entire.io): `entire enable --agent claude-code`, connect the repo on entire.io, turn on Runners and Trails. Submissions without Entire are rejected. If the repo is public, agent transcripts are public too: never paste secrets into a session.

## 3. Repo map
**Only these paths are committed.** `.gitignore` is an allow-list: everything else at the root stays local.

| Path | In git | What |
|---|---|---|
| `web/` | ✅ | **The Dixi app**: Next.js 16 (App Router), light mode. `/` landing (globe hero with market highlights and popping comments, process, product, contact), `/dashboard` (globe market picker), `/dashboard/[market]`. **Read `web/AGENTS.md`**: Next 16 has breaking changes; check `web/node_modules/next/dist/docs/` before using an API. Shared globe: `web/src/components/globe/MarketGlobe.tsx`. Data modules: `web/src/lib/markets.ts`, `web/src/lib/dashboard-data.ts` (example data, no real BMW data) |
| `backend/` | ✅ | Planned API + agents (FastAPI, Pydantic AI, Supabase). See its README |
| `docs/` | ✅ | `docs/requirements.md` (developer setup: tools, accounts, Supabase CLI, Vercel, Entire) and architecture/design only: `docs/architecture/*.mmd` (Mermaid) + `docs/README.md` |
| `tech-stack/` | ✅ | Technology choices, versions, alternatives, sources |
| `branding/` | ✅ | Dixi brand: logos (light/dark/mark), `tokens.css` (mirrors `web/src/app/globals.css`), `brand-sheet.html`, guide |
| `scripts/` | ✅ | `generate-image.mjs`: OpenAI image generation; key from `.env`; each image gets an AI-generated `.json` sidecar |
| `AGENTS.md`, `CLAUDE.md`, `.gitignore` | ✅ | Agent instructions and ignore rules |
| `.env` | ❌ | `OPENAI_API_KEY`. Never print, log or commit it |
| `data/` | ❌ | Everything received: BMW dataset, source documents + overviews, transcripts, media, pages that quote BMW data |
| `memory.md`, `prompts/` | ❌ | Personal memory and prompt log |
| everything else (`product/`, `reports/`, `dashboard-demo/`, `story/`, `assets/`, `README.md`, …) | ❌ | Local research and earlier drafts |

## 4. Rules
- **Data stays private.** Never commit `data/`, `.env`, `memory.md` or `prompts/`. Never put real BMW data, customer quotes or private conversation content into tracked files; the app uses example data. Before committing, grep tracked files for secrets and dataset IDs.
- **New top-level folders are ignored by default.** If a new folder must be committed, add a `!/<folder>/` line to `.gitignore` on purpose.
- **Facts:** every external claim gets a checked source URL; mark inferences as *inferred*.
- **Images:** only images with a clear licence; AI-generated images get a visible "AI-generated" label in the UI (EU AI Act Art. 50) and a `.json` sidecar. Never generate BMW logos or real people.
- **Stack:** Next.js + TypeScript + Tailwind (web), FastAPI + Pydantic AI + Supabase/pgvector + OpenAI (backend). Details: `tech-stack/README.md`.
- **Python:** `uv run --with <pkgs> python -I …`; don't install packages globally. **Node:** pnpm in `web/`.
- **Output:** HTML deliverables are local files by default; publish claude.ai artifacts only when the user asks.
- **Research:** prefer the exa MCP, tavily as a second opinion; keep query counts modest.
