# Dixi tech stack

Status as of 11 Oct 2026. ✅ = in use · 🟡 = planned · ⚪ = considered, not chosen.

## Frontend: `web/` ✅
| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | **Next.js** (App Router, Cache Components, Partial Prefetching) | 16.4.0 | Server Components by default; static + streamed pages; the team knows it |
| UI runtime | **React** | 19.3.0 | |
| Language | **TypeScript** | 5.x | Typed data contracts shared by every view |
| Styling | **Tailwind CSS** | 4.x | Colour tokens defined once in `web/src/app/globals.css` and exposed as utilities |
| 3D globe | **react-globe.gl** + **three.js** | 2.38 / 0.186 | Country polygons (market highlights) and HTML popups anchored to coordinates; plain dot globes can't colour whole countries |
| Map data | **world-atlas** (110m) + **topojson-client** | 2.0 / 3.1 | Small, public-domain country shapes (Natural Earth) |
| Icons | **lucide-react** | 1.x | |
| Fonts | **Geist Sans / Geist Mono** via `next/font` | | Clean, free, ships with Next.js |
| Tooling | pnpm 10, Node 26, ESLint 9 | | |

Run it: `cd web && pnpm install && pnpm dev` → http://localhost:3000. Note: Next.js 16 has breaking changes; read `web/AGENTS.md` (from the repo root).

## Backend: `backend/` ✅
| Layer | Choice | Why | Alternatives |
|---|---|---|---|
| API | **FastAPI** (Python) | Same language as the agents; async; OpenAPI for the frontend | Next.js route handlers only |
| Agents | ✅ **Pydantic AI** 2.55 + **Pydantic AI Harness** 0.55 (`SubAgents`: lead researcher delegates to scout sub-agents) + Logfire tracing (planned) | Typed structured outputs = our data contracts; tracing gives traceability | ⚪ OpenAI Agents SDK (simplest if OpenAI-only), ⚪ LangGraph (explicit graphs, more boilerplate) |
| Web search | ✅ **Tavily remote MCP** (`https://mcp.tavily.com/mcp/`, `tavily_search` + `tavily_extract` only) | No search engine of our own; agents get it as an MCP toolset; 1,000 free credits/month | Exa, own scraping |
| Hosting | ✅ **FastAPI Cloud** (public beta, Hobby tier) | `fastapi deploy` from `backend/`; uv + `pyproject.toml`; secrets via `fastapi cloud env set --secret` | Railway, Fly.io |
| Database | ✅ **Supabase** (Postgres, hosted project *Dixi*): principles, decisions, generations, agent runs, settings; schema in `supabase/migrations`, backend access via REST with the secret key | One store for principles, decisions, runs and memory | Neon + S3 |
| Vector search | 🟡 **pgvector** in Supabase, planned for matching reworded requests in decision memory (today: exact title) | Enough for ~100k–1M items; one service less | ⚪ Qdrant (only if pgvector is not enough) |
| LLMs | **OpenAI**: small tier for labelling (Batch API), flagship for requirement drafting | Structured outputs; embeddings `text-embedding-3-small` at 512 dims | Anthropic, Gemini (Pydantic AI is model-agnostic) |
| Images | **OpenAI image models** (`scripts/generate-image.mjs`) | Multi-image edits for compositing; every image gets an AI-generated sidecar | FLUX.2 on fal.ai |
| Video (optional) | **fal.ai** (Kling / Veo image-to-video) | OpenAI shut down its Sora video API on 24 Sep 2026 | — |
| Fine-tuning | ⚪ **Not planned** | LLM labelling checked against a hand-labelled sample is faster and explainable | Later: a small classifier distilled from LLM labels |

## Data sources (for a production version)
| Source | Use | Constraint |
|---|---|---|
| Customer studies, owner feedback, sales, quality data | L2 evidence | Provided by BMW; never stored in this repo |
| YouTube Data API | Comments on model reviews per market | 10,000 units/day quota |
| Google Trends | Search momentum per market | Official API in alpha; SerpApi as an alternative |
| Reddit | Owner discussions | App approval; commercial use needs a contract |
| Chinese platforms (Autohome, Dongchedi, Weibo, Xiaohongshu) | China voice | No easy official APIs; vendors or enterprise listening tools |
| Commodity prices (World Bank Pink Sheet, FRED) | Cost signals | Monthly, free; lithium/cobalt need a paid source |

## Traceability and compliance
- **Entire** (entire.io): agent sessions linked to commits, required by the hackathon. `entire enable --agent claude-code`.
- **EU AI Act Art. 50** (since 2 Aug 2026): label AI-generated images and video.
- **GDPR**: store post text and metadata only, hash author IDs, no training on scraped data.
- **Secrets**: `.env` at the repo root, git-ignored. Never commit keys.

## Sources
- Next.js docs (bundled): `web/node_modules/next/dist/docs/`
- Pydantic AI: https://github.com/pydantic/pydantic-ai/releases · MCP client: https://pydantic.dev/docs/ai/mcp/client/ · harness: https://pydantic.dev/docs/ai/harness/
- Tavily MCP: https://docs.tavily.com/documentation/mcp · FastAPI Cloud: https://fastapicloud.com/docs/
- OpenAI models: https://developers.openai.com/api/docs/models · image edits: https://developers.openai.com/api/reference/resources/images/methods/edit/ · video (Sora shutdown): https://developers.openai.com/api/docs/guides/video-generation
- fal.ai pricing: https://fal.ai/pricing
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search · pricing: https://supabase.com/pricing
- Qdrant pricing: https://qdrant.tech/pricing/
- YouTube quota: https://developers.google.com/youtube/v3/determine_quota_cost · Google Trends API: https://developers.google.com/search/apis/trends · Reddit Data API terms: https://redditinc.com/policies/data-api-terms
- EU AI Act enforcement: https://digital-strategy.ec.europa.eu/en/news/commission-starts-enforcing-ai-act-rules-and-new-transparency-requirements-2-august
- Entire CLI: https://github.com/entireio/cli
- react-globe.gl: https://github.com/vasturiano/react-globe.gl · world-atlas: https://github.com/topojson/world-atlas
