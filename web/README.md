# Dixi web app

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · react-globe.gl.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint
```

## Routes
- `/` landing: globe hero (market highlights, popping customer comments), process, product, contact. The contact form is a demo and sends nothing.
- `/dashboard` home with two tabs: the list of saved generations, and "New analysis".
- `/dashboard/new` choose a market on the globe.
- `/dashboard/[market]` choose a series (1, 5 or 7 Series) for that market.
- `/dashboard/[market]/[series]` the pipeline: feature requests, keep / reject / priority / wishlist, research, three profiles.
- `/dashboard/generations#<id>` one saved generation (edit and rebuild from there).
- `/dashboard/settings` scoring weights, the same for all series; can be proposed from plain text via `/api/scoring-advice` (OpenAI), applied by the manager.

## Where the data comes from
- Feature requests are built by a deterministic local script (`scripts/build-pipeline-data.py`): BMW's feedback categories become 25 clusters with mention counts per market. No LLM clusters feedback; categories and urgency are rules.
- AI agents live in `backend/` (FastAPI + Pydantic AI + OpenAI): a research agent (competitors and trends via Tavily, source URLs checked) and a principle assessor (fit of each request to the L1 principles). The web app talks to it through `NEXT_PUBLIC_API_URL`.
- Decisions and generations are stored in Supabase through the backend when it is connected, otherwise in the browser (localStorage).
- The social test (L3) is simulated; nothing is posted.

## Structure
- `src/app/`: routes, layout, global theme tokens (`globals.css`), `api/scoring-advice`.
- `src/components/globe/`: `MarketGlobe` (entry, client) and `GlobeCanvas` (WebGL, loaded with `ssr: false`).
- `src/components/landing/`, `src/components/site/`: landing sections, navbar, footer.
- `src/components/dashboard/`: dashboard home, market picker, settings.
- `src/components/pipeline/`: series picker, pipeline, profiles, generations, decision log.
- `src/lib/`: example data (`markets.ts`, `dashboard-data.ts`), backend client (`api.ts`) and the pipeline logic (`pipeline/`: scoring, decision memory, profiles).

Before changing Next.js APIs, read `AGENTS.md` in this folder: Next 16 has breaking changes.
