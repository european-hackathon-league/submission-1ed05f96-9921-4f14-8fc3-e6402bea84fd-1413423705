"use client";

/* L1 principles and the principle assessor (backend/app/agents/principles.py).
 *
 * Principles live in Supabase (table principles): Group-wide (GL-xx), per market (EU-xx, UK-xx, CN-xx, US-xx, from the
 * team's research) and per series (G60-P1 …, the series fundamentals in series.ts). The assessor rates every feature
 * request against them: fit 0–1, the principle ids it rests on, evidence and assumptions listed separately, conflicts.
 * The fit is the "principle fit" part of the Dixi score; without an assessment the score falls back to the series focus.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { API_URL, api, pull } from "@/lib/api";
import type { MarketScope } from "@/lib/dashboard-data";
import type { Category, SeriesId } from "./types";

export interface Principle {
  id: string;
  level: "group" | "market" | "series";
  market: string | null;
  series: SeriesId | null;
  title: string;
  statement: string;
  evidence: string | null;
  boundary: string | null;
  classification: string | null;
  confidence: string | null;
  sources: { ref: string; label: string; url: string | null }[];
  owner: string;
  version: number;
  updated_at: string | null;
  updated_by: string;
}

export interface RequestFit {
  requestId: string;
  fit: number;
  supports: string[];
  tensions: string[];
  rationale: string;
  evidence: string[];
  assumptions: string[];
  memory: string | null;
}

export interface Assessment {
  id: string | null;
  series: SeriesId;
  market: MarketScope;
  fits: RequestFit[];
  conflicts: string[];
  gaps: string[];
  principleIds: string[];
  /** The request ids the backend assessed. */
  requestIds?: string[];
  model: string;
  generatedAt: string;
  /** Which request set it assessed (ids joined), so a changed list is assessed again. */
  basis?: string;
}

export interface AssessInput {
  id: string;
  title: string;
  category: Category;
  mentions: number;
  backing: string[];
}

/* ---------- principles ---------- */

/** undefined = loading · null = unavailable (no backend, or it did not answer) · list = loaded from Supabase. */
export function usePrinciples(scope: MarketScope, series: SeriesId) {
  const [principles, setPrinciples] = useState<Principle[] | null | undefined>(API_URL ? undefined : null);
  useEffect(() => {
    if (!API_URL) return;
    let live = true;
    pull<Principle[]>(`/principles?market=${scope}&series=${series}`).then((p) => live && setPrinciples(p));
    return () => {
      live = false;
    };
  }, [scope, series]);
  return principles;
}

/* ---------- assessment (cached per market + series in this browser; every run is stored by the backend) ---------- */

const key = (scope: string, series: string) => `dixi:assessment:${scope}:${series}`;
const EVENT = "dixi:assessment";
const cache = new Map<string, { raw: string | null; value: Assessment | null }>();

function read(k: string): Assessment | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(k);
  } catch {
    /* storage blocked */
  }
  const hit = cache.get(k);
  if (hit && hit.raw === raw) return hit.value;
  let value: Assessment | null = null;
  try {
    value = raw ? (JSON.parse(raw) as Assessment) : null;
  } catch {
    value = null;
  }
  cache.set(k, { raw, value });
  return value;
}

function save(k: string, a: Assessment) {
  try {
    localStorage.setItem(k, JSON.stringify(a));
  } catch {
    cache.set(k, { raw: null, value: a });
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

/** The assessor's input in one string: request ids + their backing signals, so new research triggers a fresh assessment. */
export const basisOf = (requests: AssessInput[]) =>
  requests.map((r) => `${r.id}:${[...r.backing].sort().join("|")}`).sort().join(",");
/** The backend accepts up to 40 requests per assessment (most-mentioned first). */
const limit = (requests: AssessInput[]) => [...requests].sort((a, b) => b.mentions - a.mentions).slice(0, 40);

export type AssessStatus = "idle" | "running" | "error";

export function useAssessment(scope: MarketScope, series: SeriesId) {
  const k = key(scope, series);
  const result = useSyncExternalStore(subscribe, () => read(k), () => null);
  const [status, setStatus] = useState<AssessStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (all: AssessInput[]) => {
      const requests = limit(all);
      if (!API_URL || requests.length === 0) return null;
      setStatus("running");
      setError(null);
      try {
        const basis = basisOf(requests);
        const out = await api<Assessment>("/assess/principles", {
          method: "POST",
          body: JSON.stringify({ series, market: scope, requests, basis }),
        });
        const a = { ...out, basis };
        save(k, a);
        setStatus("idle");
        return a;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Principle assessment failed.");
        setStatus("error");
        return null;
      }
    },
    [k, scope, series],
  );

  /** Use the cached assessment if it covers this request set; otherwise run the assessor (once per analysis). */
  const ensure = useCallback(
    async (all: AssessInput[]) => {
      const basis = basisOf(limit(all));
      const cached = read(k);
      if (cached && cached.basis === basis) return cached;
      /* Another browser (or an earlier visit) may have assessed the same requests: reuse the stored run. */
      const stored = await pull<Assessment | null>(`/assess/principles/latest?series=${series}&market=${scope}`);
      if (stored && stored.basis === basis) {
        save(k, stored);
        return stored;
      }
      return run(all);
    },
    [k, run, scope, series],
  );

  const fits = useMemo(() => new Map((result?.fits ?? []).map((f) => [f.requestId, f])), [result]);
  return { result, fits, status, error, run, ensure, available: API_URL !== null };
}
