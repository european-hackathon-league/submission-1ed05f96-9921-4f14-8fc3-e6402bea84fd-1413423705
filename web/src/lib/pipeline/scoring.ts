/* Dixi score for a feature request (0–100) with decision memory.
 *
 *   base   = weighted mean of  demand · market backing · principle fit
 *   memory = past decisions on the same request (same series), from earlier generations:
 *            rejected → penalty that fades with a half-life, lifted when demand has grown enough since ("resurfaced")
 *            kept     → small bonus that fades the same way
 *   score  = base × (1 − penalty) + bonus
 *
 * Pure functions (usable on server and client). The settings store lives in scoring-store.ts (client only).
 * Settings are tuned by the team in /dashboard/settings and stored in this browser for now (Supabase later).
 * The backend agent will apply the same rules before it proposes requests (see docs/architecture/09-scoring-and-memory.md).
 */
import type { MarketScope } from "@/lib/dashboard-data";
import type { Decision } from "./profiles";
import type { Session } from "./sessions";
import type { Category, FeatureRequest, SeriesId } from "./types";

export interface ScoringSettings {
  /** Relative weights of the three base parts (normalised). */
  wDemand: number;
  wBacking: number;
  wFit: number;
  /** How much a past reject lowers the score at full strength (0–1). */
  rejectPenalty: number;
  /** Bonus for requests kept before (0–1, of 10 points). */
  keepBonus: number;
  /** After this many days a past decision counts half. */
  halfLifeDays: number;
  /** Demand growth since the reject that brings a request back (0.3 = +30 %). */
  resurfaceAt: number;
  /** Hide previously rejected requests instead of only ranking them lower. */
  hideRejected: boolean;
  /** Use memory from every market, or only from the same market. */
  memoryScope: "market" | "all";
}

export const DEFAULT_SCORING: ScoringSettings = {
  wDemand: 0.6,
  wBacking: 0.25,
  wFit: 0.15,
  rejectPenalty: 0.6,
  keepBonus: 0.5,
  halfLifeDays: 365,
  resurfaceAt: 0.3,
  hideRejected: false,
  memoryScope: "market",
};

/* ---------- decision memory ---------- */

export interface MemoryEntry {
  action: "keep" | "reject";
  reason?: string;
  by: string;
  role?: string;
  at: string;
  /** Mentions when the decision was made (to detect growing demand). */
  mentionsAt?: number;
  generationId: string;
  scopeLabel: string;
}

/** Key that stays stable across data rebuilds: series + request title. */
export const memoryKey = (series: SeriesId, title: string) => `${series}:${title.toLowerCase()}`;

/** Latest keep/reject per request from earlier generations of this series (and market, unless scope is "all"). */
export function buildMemory(generations: Session[], series: SeriesId, scope: MarketScope, settings: ScoringSettings): Map<string, MemoryEntry> {
  const mem = new Map<string, MemoryEntry>();
  const relevant = generations
    .filter((g) => g.series === series && (settings.memoryScope === "all" || g.scope === scope))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const g of relevant) {
    for (const d of Object.values(g.decisions) as Decision[]) {
      if (d.action !== "keep" && d.action !== "reject") continue;
      const k = memoryKey(series, d.title);
      const prev = mem.get(k);
      if (!prev || prev.at <= d.at)
        mem.set(k, { action: d.action, reason: d.reason, by: d.by, role: d.role, at: d.at, mentionsAt: d.mentionsAt, generationId: g.id, scopeLabel: g.scopeLabel });
    }
  }
  return mem;
}

/* ---------- the score ---------- */

export type MemoryState = "rejected" | "resurfaced" | "kept" | null;

export interface Scored {
  score: number;
  base: number;
  parts: { demand: number; backing: number; fit: number };
  memory: MemoryEntry | null;
  state: MemoryState;
  /** 0–1: how much of the penalty or bonus still applies after the half-life decay. */
  strength: number;
  /** Demand growth since the past decision (null when unknown). */
  growth: number | null;
  hidden: boolean;
}

export function scoreRequest(
  req: FeatureRequest,
  scoped: number,
  maxScoped: number,
  backingCount: number,
  focus: Category[],
  memory: Map<string, MemoryEntry>,
  s: ScoringSettings,
  now = Date.now(),
  /** Principle fit 0–1 from the principle assessor (L1). Without one: 1 if the category is in the series focus, else 0.4. */
  principleFit?: number,
): Scored {
  const demand = maxScoped > 0 ? Math.log1p(scoped) / Math.log1p(maxScoped) : 0;
  const backing = Math.min(1, backingCount / 2);
  const fit = principleFit ?? (focus.includes(req.category) ? 1 : 0.4);
  const wSum = s.wDemand + s.wBacking + s.wFit || 1;
  const base = (100 * (s.wDemand * demand + s.wBacking * backing + s.wFit * fit)) / wSum;

  const m = memory.get(memoryKey(req.series, req.title)) ?? null;
  let state: MemoryState = null;
  let strength = 0;
  let growth: number | null = null;
  let score = base;
  if (m) {
    const days = Math.max(0, (now - Date.parse(m.at)) / 86_400_000);
    strength = Math.pow(0.5, days / Math.max(1, s.halfLifeDays));
    growth = m.mentionsAt ? (scoped - m.mentionsAt) / m.mentionsAt : null;
    if (m.action === "reject") {
      const resurfaced = growth !== null && growth >= s.resurfaceAt;
      state = resurfaced ? "resurfaced" : "rejected";
      if (!resurfaced) score = base * (1 - s.rejectPenalty * strength);
    } else {
      state = "kept";
      score = Math.min(100, base + 10 * s.keepBonus * strength);
    }
  }
  return {
    score: Math.round(score),
    base: Math.round(base),
    parts: { demand, backing, fit },
    memory: m,
    state,
    strength,
    growth,
    hidden: s.hideRejected && state === "rejected",
  };
}
