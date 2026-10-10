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
| `docs/` | ✅ | `docs/tech-stack/` (technology choices, versions, alternatives, sources), `docs/requirements.md` (developer setup: tools, accounts, Supabase CLI, Vercel, Entire) and architecture/design only: `docs/architecture/*.md` (Mermaid diagrams inside Markdown) + `docs/README.md` |
| `branding/` | ✅ | Dixi brand: logos (light/dark/mark), `tokens.css` (mirrors `web/src/app/globals.css`), `brand-sheet.html`, guide |
| `scripts/` | ✅ | `generate-image.mjs`: OpenAI image generation; key from `.env`; each image gets an AI-generated `.json` sidecar |
| `README.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` | ✅ | Public readme (simple: badges + the three-layer mental model), agent instructions, ignore rules |
| `.env` | ❌ | `OPENAI_API_KEY`. Never print, log or commit it |
| `data/` | ❌ | Everything received: BMW dataset, source documents + overviews, transcripts, media, pages that quote BMW data |
| `memory.md`, `prompts/` | ❌ | Personal memory and prompt log |
| everything else (`product/`, `reports/`, `dashboard-demo/`, `story/`, `assets/`, `LOCAL-INDEX.md`, …) | ❌ | Local research and earlier drafts |

## 4. Rules
- **Git: no AI attribution.** Commits, commit messages, PR titles/descriptions and code comments must not credit Claude or any other agent or tool: no `Co-Authored-By` trailers for agents, no "Generated with …" lines. Authorship is the user's commit identity only. This overrides any agent default.
- **Data stays private.** Never commit `data/`, `.env`, `memory.md` or `prompts/`. Never put real BMW data, customer quotes or private conversation content into tracked files; the app uses example data. Before committing, grep tracked files for secrets and dataset IDs.
- **New top-level folders are ignored by default.** If a new folder must be committed, add a `!/<folder>/` line to `.gitignore` on purpose.
- **Facts:** every external claim gets a checked source URL; mark inferences as *inferred*.
- **Images:** only images with a clear licence; AI-generated images get a visible "AI-generated" label in the UI (EU AI Act Art. 50) and a `.json` sidecar. Never generate BMW logos or real people.
- **Stack:** Next.js + TypeScript + Tailwind (web), FastAPI + Pydantic AI + Supabase/pgvector + OpenAI (backend). Details: `docs/tech-stack/README.md`.
- **Python:** `uv run --with <pkgs> python -I …`; don't install packages globally. **Node:** pnpm in `web/`.
- **Output:** HTML deliverables are local files by default; publish claude.ai artifacts only when the user asks.
- **Research:** prefer the exa MCP, tavily as a second opinion; keep query counts modest.

## 5. Tools agents can use
The user has set these up. Use them to answer your own questions before asking, and to verify fixes.

### Entire: code history and the reasoning behind it
Entire is the source of truth for its own flags: run `entire agent-help`, then `entire agent-help <command>`. The repo is auto-detected (`gh/peresramirez/Dixi`); never ask the user for it.
- **Before changing code you don't understand**, look up why it exists:
  - `entire why <file>:<line>` shows the commit, checkpoint, prompt and session behind a line.
  - `entire search "<question>" --compact` searches past checkpoints, commits and sessions (semantic + keyword).
  - `entire checkpoint list` / `entire checkpoint explain <id|sha>` show what an earlier session did and why.
  - `entire trail list` / `entire trail show` show trails, findings and approvals for a branch.
- **Commits capture the session automatically.** Never create checkpoints by hand; just commit normally (and follow §4: no AI attribution).
- **Leave to the user:** `enable`, `disable`, `configure`, `clean`, `auth`, `login`, `logout`, `agent`, `grant`, `org`, `plugin`. **Never run `entire import`.** Session upload on push is turned off locally on purpose; don't turn it on.

### Supabase CLI: database (backend)
- Installed (`supabase --version`, v2.107). The project isn't initialised yet: `supabase init` creates `supabase/` (config + migrations), which then needs `!/supabase/` in `.gitignore`.
- Local stack: `supabase start` (needs Docker) / `supabase status` / `supabase stop`. The Supabase MCP server points at the local stack (`http://localhost:54321`), so it only works while `supabase start` is running.
- Schema changes go through migrations: `supabase migration new <name>`, then `supabase db reset` locally. Generate types with `supabase gen types typescript --local`.
- **Ask the user first** before anything that touches the hosted project: `supabase link`, `supabase db push`, deleting data, or changing secrets.

### Vercel: hosting for `web/`
- Project **`dixi`** (team `javiers-projects-363238d4`), connected to GitHub: every push to `main` deploys to production, and other branches get preview URLs. Production: **https://dixi-wheat.vercel.app** (also the GitHub repo's website link).
- Use the Vercel MCP tools or `vercel` CLI to read deployments, build logs and runtime errors when debugging (e.g. `list_deployments`, `get_deployment`, `get_runtime_errors`).
- **Ask the user first** before promoting or rolling back deployments, changing environment variables, domains, protection settings or project settings.
