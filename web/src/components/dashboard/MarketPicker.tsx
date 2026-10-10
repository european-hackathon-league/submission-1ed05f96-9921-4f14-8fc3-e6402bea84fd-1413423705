"use client";

import Link from "next/link";
import { useState } from "react";
import MarketGlobe from "@/components/globe/MarketGlobe";
import { MARKETS, marketById, type MarketId } from "@/lib/markets";
import { marketHref } from "@/lib/dashboard-data";
import { MARKET_DOT } from "./marketStyle";

/** "Choose a market": globe and cards share one selection; continue opens /dashboard/[market]. */
export function MarketPicker() {
  const [selected, setSelected] = useState<MarketId | null>(null);
  const market = selected ? marketById(selected) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Step 1 of 2</p>
      <h1 id="picker-heading" className="mt-2 text-center text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Which market are you deciding for?
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted">
        Pick a market on the globe or below. Requirements, evidence and gaps are shown for that market.
      </p>

      <div className="mt-8 w-full max-w-[420px]">
        <MarketGlobe variant="picker" selected={selected} onSelect={setSelected} showMarketButtons={false} />
      </div>

      <div role="group" aria-labelledby="picker-heading" className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETS.map((m) => {
          const active = m.id === selected;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(m.id)}
              className={`group flex flex-col items-start rounded-card border bg-surface p-4 text-left transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none ${
                active ? "border-brand shadow-card ring-2 ring-brand/15" : "border-line hover:border-brand/40"
              }`}
            >
              <span className="flex w-full items-center gap-2">
                <span aria-hidden className={`size-2.5 rounded-full ${MARKET_DOT[m.id]}`} />
                <span className="font-semibold text-ink">{m.name}</span>
                <span className="ml-auto text-xs tabular-nums text-muted">{m.sampleShare}% share</span>
              </span>
              <span className="mt-2 text-sm leading-snug text-ink-soft">{m.focus}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row" aria-live="polite">
        {market ? (
          <Link
            href={marketHref(market.id)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-[0.95rem] font-medium text-white shadow-card transition-colors hover:bg-brand-deep"
          >
            Continue to {market.name} <span aria-hidden>→</span>
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center px-2 text-sm text-muted">Select a market to continue</span>
        )}
        <Link
          href={marketHref("ALL")}
          className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-ink-soft ring-1 ring-line transition-colors hover:bg-bg-soft hover:text-ink"
        >
          All markets
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">Share = share of a model&apos;s volume.</p>
    </div>
  );
}
