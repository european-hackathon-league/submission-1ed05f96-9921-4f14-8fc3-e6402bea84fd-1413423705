# Developer requirements

Everything you need to work on the Dixi repo. Commands are for macOS (Homebrew); Linux/Windows notes where they differ.

## 1. Accounts and access
| What | Why |
|---|---|
| **GitHub** account with access to `peresramirez/Dixi`, and an **SSH key** added to GitHub | Clone and push (`git@github.com:peresramirez/Dixi.git`) |
| **Entire** account (entire.io), signed in with GitHub | Required by the hackathon: every agent session is linked to commits. Submissions without Entire are rejected |
| **Supabase** account (supabase.com) | Database, auth, storage and vector search for the backend |
| **Vercel** account (vercel.com) | Hosting for the web app (preview + production) |
| **OpenAI API key** | Agents and image generation (`scripts/generate-image.mjs`). Ask the team; never commit it |

## 2. Tools to install
| Tool | Version | Install | Check |
|---|---|---|---|
| Git | any recent | `brew install git` | `git --version` |
| Node.js | **22 or newer** (team uses 26) | `brew install node` or [nvm](https://github.com/nvm-sh/nvm) | `node -v` |
| pnpm | **10** | `corepack enable && corepack prepare pnpm@10 --activate` (or `brew install pnpm`) | `pnpm -v` |
| Python + uv | Python 3.12+, uv | `brew install uv` (uv manages Python) | `uv --version` |
| Docker Desktop | recent | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker info` (needed for local Supabase) |
| **Supabase CLI** | latest | `brew install supabase/tap/supabase` (Linux/Windows: see [Supabase CLI docs](https://supabase.com/docs/guides/cli)) | `supabase --version` |
| **Vercel CLI** | latest | `pnpm add -g vercel` (or `npm i -g vercel`) | `vercel --version` |
| **Entire CLI** | latest | `brew tap entireio/tap && brew trust entireio/tap && brew install --cask entire` (Linux: `curl -fsSL https://entire.io/install.sh \| bash`; Windows: `scoop bucket add entire https://github.com/entireio/scoop-bucket.git && scoop install entire/entire`) | `entire version` |
| A coding agent | Claude Code, Codex or Cursor | — | Reads `AGENTS.md` / `CLAUDE.md` |

## 3. First-time setup
```bash
git clone git@github.com:peresramirez/Dixi.git
cd Dixi

# secrets (repo root, git-ignored)
printf 'OPENAI_API_KEY=<ask the team>\n' > .env

# web app
cd web && pnpm install && pnpm dev     # http://localhost:3000
cd ..
```

### Entire (once per machine, once per repo)
```bash
entire login
entire enable --agent claude-code      # or --agent codex / cursor; installs git + agent hooks and .entire/
```
Then in **entire.io**: connect the repository (Configure GitHub App), and under **Settings** turn on **Runners**, **Trails** and **Auto build on push**. Repo owners add the default runners once:
```bash
entire runner setup -y
git add .entire/runners && git commit -m "Configure trail runners"
```
⚠️ If the repository is public, Entire's agent transcripts are public too. Never paste secrets into an agent session.

### Supabase (when the backend starts)
```bash
supabase login
supabase init                          # creates supabase/ (config + migrations)
supabase start                         # local Postgres + Studio; needs Docker running
supabase link --project-ref <project>  # connect to the hosted project
```

### Vercel (web hosting)
```bash
vercel login
cd web && vercel link                  # project root = web/
vercel env pull .env.local             # pull env vars for local dev
```
Set the Vercel project's **Root Directory** to `web`.

## 4. Environment variables
| Variable | Where | Used by |
|---|---|---|
| `OPENAI_API_KEY` | repo-root `.env` | `scripts/generate-image.mjs`, backend agents |
| `OPENAI_IMAGE_MODEL` *(optional)* | repo-root `.env` | image script model override |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(planned)* | `web/.env.local` / Vercel | web app → Supabase |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` *(planned)* | backend `.env` | backend → Supabase (server only, never in the browser) |

All `.env*` files are git-ignored.

## 5. Daily commands
| Task | Command |
|---|---|
| Run the web app | `cd web && pnpm dev` |
| Type-check / lint / build | `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm build` (in `web/`) |
| Generate an image | `node scripts/generate-image.mjs --prompt "…" --out web/public/images/name.png` |
| Start a Trail | `entire trail create --title "…"` |
| Local database | `supabase start` / `supabase stop` |
| Deploy a preview | `cd web && vercel` |

## 6. Repo rules (short)
- Only `web/`, `backend/`, `docs/`, `tech-stack/`, `branding/`, `scripts/`, `AGENTS.md`, `CLAUDE.md` are committed (`.gitignore` is an allow-list).
- No customer data, private documents or secrets in the repo.
- Next.js 16 has breaking changes: read `web/AGENTS.md` before using a Next.js API.
- Full agent rules: `AGENTS.md`.
