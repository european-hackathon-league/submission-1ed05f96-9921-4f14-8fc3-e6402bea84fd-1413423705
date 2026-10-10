# Dixi web app

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · react-globe.gl.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint
```

## Routes
- `/` landing: globe hero (market highlights, popping customer comments), process, product, contact.
- `/dashboard` choose a market on the globe.
- `/dashboard/[market]` overview for `eu`, `cn`, `us`, `jp` or `all`.

## Structure
- `src/app/`: routes, layout, global theme tokens (`globals.css`).
- `src/components/globe/`: `MarketGlobe` (entry, client) and `GlobeCanvas` (WebGL, loaded with `ssr: false`).
- `src/components/landing/`, `src/components/site/`: landing sections, navbar, footer.
- `src/components/dashboard/`: market picker and dashboard.
- `src/lib/`: typed example data and scoring (`markets.ts`, `dashboard-data.ts`).

Before changing Next.js APIs, read `AGENTS.md` in this folder: Next 16 has breaking changes.
