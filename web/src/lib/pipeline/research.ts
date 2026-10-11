"use client";

/* Live research agent (backend/ POST /research/signals): lead researcher + two scout sub-agents searching via Tavily MCP.
 * The last run per market + series is kept in localStorage, because a run takes ~1 minute and spends search credits.
 * Without NEXT_PUBLIC_API_URL (e.g. the public deployment) the app keeps the saved research in market-signals.ts.
 * Contract: backend/app/models/signals.py mirrors MarketSignal in types.ts.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import type { MarketScope } from "@/lib/dashboard-data";
import type { Category, MarketSignal, SeriesId } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || null;

/** Markets the research agent covers (the official data markets). */
export const RESEARCH_MARKETS = ["EU", "US", "CN"] as const;
export type ResearchMarket = (typeof RESEARCH_MARKETS)[number];

export interface ResearchResult {
  series: SeriesId;
  market: ResearchMarket;
  signals: MarketSignal[];
  /** What the agents looked for and could not back with a source (honesty panel). */
  gaps: string[];
  model: string;
  /** Tavily tool calls across both scouts. */
  searches: number;
  generatedAt: string;
}

export interface ResearchRequest {
  series: SeriesId;
  market: ResearchMarket;
  focus?: string;
  featureRequests?: string[];
  categories?: Category[];
  maxSignals?: number;
}

const key = (market: string, series: string) => `dixi:research:${market}:${series}`;
const EVENT = "dixi:research";

/** Backend ids are S01, S02 … per run, and collide with the saved research. A stable id from the title keeps a
 *  wishlist decision on the same signal across re-runs. */
function stableId(s: MarketSignal): string {
  return `R-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

const cache = new Map<string, { raw: string | null; value: ResearchResult | null }>();
function read(k: string): ResearchResult | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(k);
  } catch {
    /* storage blocked */
  }
  const hit = cache.get(k);
  if (hit && hit.raw === raw) return hit.value;
  let value: ResearchResult | null = null;
  try {
    value = raw ? (JSON.parse(raw) as ResearchResult) : null;
  } catch {
    value = null;
  }
  cache.set(k, { raw, value });
  return value;
}

function save(k: string, r: ResearchResult | null) {
  try {
    if (r) localStorage.setItem(k, JSON.stringify(r));
    else localStorage.removeItem(k);
  } catch {
    /* storage blocked: the result stays on screen until reload */
    cache.set(k, { raw: null, value: r });
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export async function runResearch(req: ResearchRequest, signal?: AbortSignal): Promise<ResearchResult> {
  if (!API_URL) throw new Error("Backend not configured (NEXT_PUBLIC_API_URL).");
  const res = await fetch(`${API_URL}/research/signals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    throw new Error(typeof body?.detail === "string" ? body.detail : `Research agent failed (${res.status}).`);
  }
  const out = (await res.json()) as ResearchResult;
  return { ...out, signals: out.signals.map((s) => ({ ...s, id: stableId(s) })) };
}

export type ResearchStatus = "idle" | "running" | "error";

/** Live research for one market + series: the saved result, plus a run() that calls the backend and saves the result. */
export function useResearch(scope: MarketScope, series: SeriesId) {
  const market = (RESEARCH_MARKETS as readonly string[]).includes(scope) ? (scope as ResearchMarket) : null;
  const k = key(scope, series);
  const result = useSyncExternalStore(
    subscribe,
    () => (market ? read(k) : null),
    () => null,
  );
  const [status, setStatus] = useState<ResearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (opts: Omit<ResearchRequest, "series" | "market"> = {}) => {
      if (!market) return;
      setStatus("running");
      setError(null);
      try {
        save(k, await runResearch({ series, market, maxSignals: 8, ...opts }));
        setStatus("idle");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Research agent failed.");
        setStatus("error");
      }
    },
    [k, market, series],
  );
  const clear = useCallback(() => save(k, null), [k]);

  /** Why a live run is not possible here, or null when it is. */
  const unavailable = !API_URL
    ? "Live research needs the Dixi backend (set NEXT_PUBLIC_API_URL)."
    : !market
      ? "Live research covers Europe, USA and China, one market at a time."
      : null;

  return { result, status, error, run, clear, unavailable };
}
