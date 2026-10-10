"use client";

import { ExternalLink, Link2, Radar, Star } from "lucide-react";
import { useState } from "react";
import type { Decisions } from "@/lib/pipeline/profiles";
import type { MarketSignal } from "@/lib/pipeline/types";
import { CategoryTile, SIGNAL_ICON } from "./icons";

/** L2 market signals from the research agent: what people like in competitors, and market trends.
 *  Signals that match customer feedback are linked; any signal can go on the PM's wishlist. */
export function SignalsPanel({
  signals,
  decisions,
  focus,
  onFocus,
  onWish,
  scopeLabel,
}: {
  signals: MarketSignal[];
  decisions: Decisions;
  focus: string | null;
  onFocus: (id: string | null) => void;
  onWish: (s: MarketSignal, on: boolean) => void;
  scopeLabel: string;
}) {
  const [all, setAll] = useState(false);
  const sorted = [...signals].sort((a, b) => b.relatesTo.length - a.relatesTo.length || (a.strength === "strong" ? -1 : 1));
  return (
    <section aria-labelledby="signals-heading" className="rounded-card border border-l3/40 bg-l3-soft/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="signals-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Radar aria-hidden className="size-4 text-l3" />
          Competitors &amp; trends
          <span className="font-normal text-muted">· {scopeLabel}</span>
        </h2>
        <p className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Link2 aria-hidden className="size-3.5" /> matches feedback</span>
          <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3.5" /> wishlist</span>
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted">The research agent has no signals for this market yet.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {(all ? sorted : sorted.slice(0, 4)).map((s) => {
            const Icon = SIGNAL_ICON[s.kind];
            const wished = decisions[s.id]?.action === "wish";
            const linked = s.relatesTo.length > 0;
            const active = focus === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2.5 rounded-xl bg-surface px-2.5 py-2 ring-1 transition-shadow ${active ? "ring-2 ring-l3" : wished ? "ring-brand/40" : "ring-line"}`}
              >
                <CategoryTile category={s.category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <Icon aria-hidden className="size-3.5 shrink-0 text-l3" />
                    <span className="truncate" title={s.detail}>
                      {s.title}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                    <span className="truncate">{s.kind === "competitor" ? s.competitor : s.strength === "strong" ? "Strong trend" : "Emerging trend"}</span>
                    {s.sources[0] && (
                      <a href={s.sources[0].url} target="_blank" rel="noreferrer" title={`Source: ${s.sources[0].label}`} className="shrink-0 hover:text-brand">
                        <ExternalLink aria-hidden className="size-3" />
                        <span className="sr-only">Source: {s.sources[0].label}</span>
                      </a>
                    )}
                  </p>
                </div>
                {linked && (
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFocus(active ? null : s.id)}
                    title={`Matches: ${s.relatesTo.join(", ")}`}
                    className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors ${active ? "bg-l3 text-white" : "bg-l3-soft text-brand-deep hover:bg-l3/20"}`}
                  >
                    <Link2 aria-hidden className="size-3.5" />
                    {s.relatesTo.length}
                    <span className="sr-only">matching requests</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-pressed={wished}
                  onClick={() => onWish(s, !wished)}
                  title={wished ? "On your wishlist" : "Add to wishlist"}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-colors ${wished ? "bg-brand text-white" : "text-muted ring-1 ring-line hover:text-brand"}`}
                >
                  <Star aria-hidden className="size-3.5" fill={wished ? "currentColor" : "none"} />
                  <span className="sr-only">{wished ? "Remove from wishlist" : "Add to wishlist"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {sorted.length > 4 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-medium text-brand hover:underline">
          {all ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </section>
  );
}
