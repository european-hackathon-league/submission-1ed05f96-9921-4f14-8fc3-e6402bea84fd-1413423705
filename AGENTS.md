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
- **Product: Dixi**, named after the Dixi 3/15, BMW's first car (1928). A principled, weighted, traceable requirement engine: three layers (L1 principles, L2 evidence, L3 social test). **Built:** principle assessor (L1, principles in Supabase), research agent (L2, Tavily), Dixi score with decision memory across generations, PM gate (keep / reject with reason / priority / wishlist), 3 profiles, append-only decision history. **Target design, not built:** gates G1–G4, Codebeamer export, postpone, lineage store, per-model source weights. Keep README and docs honest about this split. As built: `docs/architecture/10-backend-agents.md`; design: `docs/architecture/`.
- **Mandatory:** the repo must use **Entire** (entire.io): `entire enable --agent claude-code`, connect the repo on entire.io, turn on Runners and Trails. Submissions without Entire are rejected. Agent transcripts are uploaded on push (and are public if the repo is public): never paste secrets into a session. Work goes through trails (§5).

## 3. Repo map
**Only these paths are committed.** `.gitignore` is an allow-list: everything else at the root stays local.

| Path | In git | What |
|---|---|---|
| `web/` | ✅ | **The Dixi app**: Next.js 16 (App Router), light mode. `/` landing (globe hero with market highlights and popping comments, process, product, contact), `/dashboard` (globe market picker), `/dashboard/[market]`. **Read `web/AGENTS.md`**: Next 16 has breaking changes; check `web/node_modules/next/dist/docs/` before using an API. Shared globe: `web/src/components/globe/MarketGlobe.tsx`. Data modules: `web/src/lib/markets.ts`, `web/src/lib/dashboard-data.ts` (example data, no real BMW data) |
| `backend/` | ✅ | API + agents: FastAPI, Pydantic AI (research agent with Harness sub-agents on Tavily MCP; principle assessor), store for principles, decisions, generations, agent runs and settings in Supabase. `uv run pytest -q`, `uv run fastapi dev`, `uv run python -I scripts/seed_principles.py`. See its README |
| `.github/` | ✅ | `workflows/monthly-refresh.yml`: the monthly refresh job, off unless `DIXI_REFRESH_ENABLED` is true |
| `supabase/` | ✅ | Database schema: `supabase/migrations/*.sql` (applied to the hosted project *Dixi*). `.temp/` stays local |
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
- **Stack:** Next.js + TypeScript + Tailwind (web), FastAPI + Pydantic AI + Supabase (Postgres; pgvector planned) + OpenAI + Tavily MCP (backend). Details: `docs/tech-stack/README.md`.
- **Python:** `uv run --with <pkgs> python -I …`; don't install packages globally. **Node:** pnpm in `web/`.
- **Output:** HTML deliverables are local files by default; publish claude.ai artifacts only when the user asks.
- **Research:** prefer the exa MCP, tavily as a second opinion; keep query counts modest.

## 5. Tools agents can use
The user has set these up. Use them to answer your own questions before asking, and to verify fixes.

### Entire: code history and the reasoning behind it
Entire is the source of truth for its own flags: run `entire agent-help`, then `entire agent-help <command>`. The repo is auto-detected (`gh/peresramirez/Dixi`); never ask the user for it.

**Ask Entire first.** Whenever you have a question about the code, the intent behind it, or a past decision (why something exists, what was tried, what was rejected, what the user asked for), consult the Entire CLI before guessing, asking the user, or "fixing" something that may be deliberate:
- `entire why <file>:<line>` shows the commit, checkpoint, prompt and session behind a line.
- `entire search "<question>" --compact` searches past checkpoints, commits and sessions (semantic + keyword). Filters: `author:`, `date:week|month`, `branch:`.
- `entire checkpoint explain <id|sha>` (add `--full` for the transcript) shows what an earlier session did and why; `entire checkpoint list` lists them.
- `entire trail list` / `entire trail show` show trails with their description (the intent), findings and approvals.
Quote what you found (checkpoint or commit id) when it shapes your change, so the reasoning stays traceable.

**Work in trails: one intent → one trail → one branch.**
1. Start on a new branch from `main`: `git switch -c <short-name>`. Never commit feature work straight to `main`.
2. Make the change in small commits, each about one thing, so `entire why` can point to the exact prompt behind a line.
3. Push the branch, then create the trail for it: `entire trail create --branch <short-name> --title "…" --type feature|bug|task --body "<problem, intended outcome, constraints>"`. A trail needs commits ahead of `main` (an empty branch is rejected with 422).
4. Runners (Summary, Review, Risk, Confidence, Security, Drift; config in `.entire/runners/`) review every push. Read the findings with `entire trail show` and fix, resolve or dismiss them.
5. Approval and merge happen on the trail (entire.io), backed by a GitHub PR. Prefer a **merge commit** over squash, so every commit keeps its `Entire-Checkpoint` link and the intent survives the merge. Merging `main` deploys to production (Vercel).
6. When a change implements a Dixi product decision, put the Dixi generation and decision ID in the trail description, so code traces back to the product decision.

**Other rules**
- **Commits capture the session automatically.** Never create checkpoints by hand; just commit normally (and follow §4: no AI attribution).
- **Session upload is on** (`push_sessions: true` in `.entire/settings.local.json`): pushes upload the agent transcript to Entire. So never paste or print secrets in a session; if one leaks, redact it from the transcript before the next commit or push.
- **Leave to the user:** `enable`, `disable`, `configure`, `clean`, `auth`, `login`, `logout`, `agent`, `grant`, `org`, `plugin`. **Never run `entire import`.**

### Supabase CLI: database (backend)
- Installed (`supabase --version`, v2.107). The project isn't initialised yet: `supabase init` creates `supabase/` (config + migrations), which then needs `!/supabase/` in `.gitignore`.
- Local stack: `supabase start` (needs Docker) / `supabase status` / `supabase stop`. The Supabase MCP server points at the local stack (`http://localhost:54321`), so it only works while `supabase start` is running.
- Schema changes go through migrations: `supabase migration new <name>`, then `supabase db reset` locally. Generate types with `supabase gen types typescript --local`.
- **Ask the user first** before anything that touches the hosted project: `supabase link`, `supabase db push`, deleting data, or changing secrets.

### Vercel: hosting for `web/`
- Project **`dixi`** (team `javiers-projects-363238d4`), connected to GitHub: every push to `main` deploys to production, and other branches get preview URLs. Production: **https://dixi-wheat.vercel.app** (also the GitHub repo's website link).
- Use the Vercel MCP tools or `vercel` CLI to read deployments, build logs and runtime errors when debugging (e.g. `list_deployments`, `get_deployment`, `get_runtime_errors`).
- **Ask the user first** before promoting or rolling back deployments, changing environment variables, domains, protection settings or project settings.
