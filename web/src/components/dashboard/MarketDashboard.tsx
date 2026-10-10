"use client";

import Link from "next/link";
import { useState } from "react";
import { MARKETS, marketById, type MarketId } from "@/lib/markets";
import {
  DEFAULT_MODEL,
  LAYERS,
  MARKET_THEMES,
  MODELS,
  gapsFor,
  kpisFor,
  rankRequirements,
  type MarketScope,
  type ModelId,
  type RankedRequirement,
} from "@/lib/dashboard-data";
import { KpiCard, LAYER_BG, Panel, ScoreBar, StancePill, StatusPill } from "./bits";
import { MARKET_DOT } from "./marketStyle";

/** Overview for one market (or all). The model switcher is local state: the data is static sample data. */
export function MarketDashboard({ scope }: { scope: MarketScope }) {
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const title = scope === "ALL" ? "All markets" : marketById(scope).name;
  const kpis = kpisFor(scope, model);
  const top = rankRequirements(model, scope).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-brand">
            <span aria-hidden>←</span> Change market
          </Link>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-ink">
            {scope !== "ALL" && <span aria-hidden className={`size-3 rounded-full ${MARKET_DOT[scope]}`} />}
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {scope === "ALL" ? "Every market side by side." : marketById(scope).focus}
          </p>
        </div>
        <ModelSwitcher value={model} onChange={setModel} />
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Requirements" value={kpis.requirements} hint="In the backlog for this model" />
        <KpiCard label="Approved" value={kpis.approved} hint="Signed off by a PM" tone="good" />
        <KpiCard label="Waiting for you" value={kpis.waiting} hint="Proposed, needs your decision" tone="human" />
        <KpiCard label="Open evidence gaps" value={kpis.gaps} hint="Things we don't know yet" tone="wait" />
      </dl>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel id="top-reqs" title="Top requirements" aside={<span className="text-xs text-muted">{scope === "ALL" ? "Ranked by score" : `${scope} support first, then score`}</span>}>
          <ol className="divide-y divide-line">
            {top.map((r, i) => (
              <RequirementRow key={r.id} req={r} rank={i + 1} scope={scope} />
            ))}
          </ol>
        </Panel>

        <div className="flex flex-col gap-6">
          <Themes scope={scope} />
          <Gaps scope={scope} model={model} />
        </div>
      </div>

      <LayerLegend />
    </div>
  );
}

function ModelSwitcher({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  return (
    <div role="group" aria-label="Model" className="inline-flex self-start rounded-full sm:self-auto bg-bg-soft p-1 ring-1 ring-line">
      {MODELS.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none ${
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

function RequirementRow({ req, rank, scope }: { req: RankedRequirement; rank: number; scope: MarketScope }) {
  return (
    <li className="flex gap-3 px-4 py-4 sm:px-5">
      <span aria-hidden className="mt-0.5 w-4 shrink-0 text-sm tabular-nums text-muted">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-medium text-ink">{req.title}</h3>
          <span className="text-xs text-muted">
            {req.id} · {req.area}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-ink-soft">{req.statement}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="sm:max-w-xs sm:flex-1">
            <ScoreBar score={req.score} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={req.status} />
            {scope === "ALL" ? (
              MARKETS.map((m) => <StancePill key={m.id} stance={req.markets[m.id]} prefix={m.id} compact />)
            ) : (
              <StancePill stance={req.markets[scope]} prefix={scope} />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Themes({ scope }: { scope: MarketScope }) {
  const markets: MarketId[] = scope === "ALL" ? MARKETS.map((m) => m.id) : [scope];
  return (
    <Panel id="themes" title="What customers here care about">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {markets.map((id) => (
          <div key={id}>
            {scope === "ALL" && (
              <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink-soft">
                <span aria-hidden className={`size-2 rounded-full ${MARKET_DOT[id]}`} />
                {marketById(id).name}
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {(scope === "ALL" ? MARKET_THEMES[id].slice(0, 2) : MARKET_THEMES[id]).map((t) => (
                <li key={t} className="flex gap-2 text-sm text-ink-soft">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const IMPACT_CLS = { high: "bg-bad-soft text-bad", medium: "bg-wait-soft text-wait", low: "bg-bg-soft text-muted" } as const;

function Gaps({ scope, model }: { scope: MarketScope; model: ModelId }) {
  const gaps = gapsFor(scope, model);
  return (
    <Panel id="gaps" title="What we don't know">
      {gaps.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted sm:px-5">No open gaps recorded for this market and model.</p>
      ) : (
        <ul className="divide-y divide-line">
          {gaps.map((g) => (
            <li key={g.id} className="px-4 py-3.5 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">{g.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${IMPACT_CLS[g.impact]}`}>{g.impact}</span>
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{g.detail}</p>
              <p className="mt-1.5 text-xs text-muted">
                <span className="font-medium text-ink-soft">Next step:</span> {g.action}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LayerLegend() {
  return (
    <section aria-labelledby="legend" className="rounded-card border border-line bg-bg-soft px-4 py-4 sm:px-5">
      <h2 id="legend" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        How the score is built
      </h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {LAYERS.map((l) => (
          <li key={l.id} className="flex gap-2.5 text-sm">
            <span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${LAYER_BG[l.id]}`} />
            <span className="text-ink-soft">
              <span className="font-medium text-ink">
                {l.id} {l.name}.
              </span>{" "}
              {l.line}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
