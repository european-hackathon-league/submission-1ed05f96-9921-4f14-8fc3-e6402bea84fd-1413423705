"use client";

/* Decision history on the server (Supabase table decisions, append-only): every keep, reject (with its reason), wishlist
 * star and undo is one row with who and when. The latest row per request is the current decision; undos keep history. */
import { pull, push } from "@/lib/api";
import type { MarketScope } from "@/lib/dashboard-data";
import type { Decision, Decisions } from "./profiles";
import type { SeriesId } from "./types";

interface Row {
  requestId: string;
  title: string;
  action: Decision["action"] | "undo";
  reason: string | null;
  mentionsAt: number | null;
  by: string;
  role: string | null;
  at: string;
}

export function logDecision(series: SeriesId, scope: MarketScope, d: Decision) {
  void push("/decisions", {
    method: "POST",
    body: JSON.stringify({ series, market: scope, requestId: d.requestId, title: d.title, action: d.action, reason: d.reason,
      mentionsAt: d.mentionsAt, by: d.by, role: d.role, at: d.at }),
  });
}

export function logUndo(series: SeriesId, scope: MarketScope, d: Pick<Decision, "requestId" | "title">, by: string, role?: string) {
  void push("/decisions", {
    method: "POST",
    body: JSON.stringify({ series, market: scope, requestId: d.requestId, title: d.title, action: "undo", by, role, at: new Date().toISOString() }),
  });
}

/** Current decisions for this series + market, folded from the server history; null when the backend is not available. */
export async function pullDecisions(series: SeriesId, scope: MarketScope): Promise<Decisions | null> {
  const rows = await pull<Row[]>(`/decisions?series=${series}&market=${scope}`);
  if (!rows) return null;
  const out: Decisions = {};
  for (const r of rows) {
    if (r.action === "undo") delete out[r.requestId];
    else
      out[r.requestId] = { requestId: r.requestId, title: r.title, action: r.action, reason: r.reason ?? undefined,
        mentionsAt: r.mentionsAt ?? undefined, by: r.by, role: r.role ?? undefined, at: r.at };
  }
  return out;
}
