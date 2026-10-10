/* Pipeline logic: market scoping, urgency, PM decisions, profile building and the layer score.
 * Pure functions, shared by the client components. Deterministic: the same decisions always build the same profiles.
 */
import type { MarketScope } from "@/lib/dashboard-data";
import type { SeriesConfig } from "./series";
import type { Category, FeatureRequest, MarketSignal, SeriesData } from "./types";

/* ---------- scope + urgency ---------- */

/** Feedback records for this series in the chosen market; 0 means we have no comments there. */
export function marketVolume(data: SeriesData, scope: MarketScope): number {
  if (scope === "ALL") return Object.values(data.feedbackByMarket).reduce((a, b) => a + (b ?? 0), 0);
  return data.feedbackByMarket[scope] ?? 0;
}

/** Mentions of a request in scope. Falls back to all markets when the market has no comments at all. */
export function scopedMentions(req: FeatureRequest, scope: MarketScope, fallback: boolean): number {
  if (scope === "ALL" || fallback) return req.mentions;
  return req.byMarket[scope] ?? 0;
}

export type Urgency = "high" | "medium" | "low";
export const URGENCY_RULE = { high: 50, medium: 20 } as const;
export const urgencyOf = (mentions: number): Urgency =>
  mentions >= URGENCY_RULE.high ? "high" : mentions >= URGENCY_RULE.medium ? "medium" : "low";

/* ---------- PM decisions ---------- */

export interface Decision {
  requestId: string;
  title: string;
  /** keep/reject a customer request, or put a trend/competitor feature on the wishlist. */
  action: "keep" | "reject" | "wish";
  /** Required for a reject. */
  reason?: string;
  /** Who decided (name) and their role: from the local "who is deciding" identity until there is a login. */
  by: string;
  role?: string;
  /** When, ISO timestamp. */
  at: string;
  /** Customer mentions of the request at decision time, so later generations can see if demand grew. */
  mentionsAt?: number;
}

export type Decisions = Record<string, Decision>;

export const REJECT_REASONS = [
  "Conflicts with a BMW principle",
  "Too costly for the benefit",
  "Already on the option list",
  "Too few customers ask for it",
  "Not right for this market",
] as const;

/* ---------- profiles ---------- */

export interface Profile {
  id: string;
  name: string;
  tagline: string;
  /** `priority` = the PM's position for this request (1 = most important). */
  requests: (FeatureRequest & { scoped: number; priority: number })[];
  /** Wishlist items (trends, competitor features) this profile takes on. */
  wishes: MarketSignal[];
  /** Market signals backing the requests in this profile. */
  backing: MarketSignal[];
  why: string[];
  score: { l1: number; l2: number; l3: number | null; total: number };
}

interface Archetype {
  id: string;
  name: string;
  tagline: string;
  /** Higher = picked first. */
  rank: (r: FeatureRequest) => number;
  /** Wishlist categories this archetype takes on. */
  wishCats: Category[];
}

const fixShare = (r: FeatureRequest) => (r.types.difficult + r.types.defect) / Math.max(1, r.types.wants + r.types.difficult + r.types.defect);
const inCats = (cats: Category[]) => (r: FeatureRequest) => (cats.includes(r.category) ? 1 : 0);

const ARCHETYPES: Archetype[] = [
  {
    id: "fix",
    name: "Fix the basics",
    tagline: "Remove what annoys today's owners before adding anything new.",
    rank: (r) => fixShare(r),
    wishCats: [],
  },
  {
    id: "tech",
    name: "Tech-forward",
    tagline: "Lead on software, assistance and powertrain.",
    rank: inCats(["Digital", "Powertrain"]),
    wishCats: ["Digital", "Powertrain"],
  },
  {
    id: "comfort",
    name: "Comfort & craft",
    tagline: "A calmer, better-made cabin and a cleaner design.",
    rank: inCats(["Interior", "Exterior"]),
    wishCats: ["Interior", "Exterior"],
  },
];

const MAX_PER_PROFILE = 6;
export const MIN_KEPT_TO_BUILD = 3;

/** Signals for this series and market ("ALL" = every market; markets without research get none). */
export function signalsFor(all: MarketSignal[], series: FeatureRequest["series"], scope: MarketScope): MarketSignal[] {
  return all.filter((s) => s.series.includes(series) && (scope === "ALL" || (s.markets as string[]).includes(scope)));
}

/** `kept` must be in the PM's priority order: position 1 first. The order decides which requests a profile takes
 *  (after the profile's own theme) and the order they are listed in. */
export function buildProfiles(
  kept: FeatureRequest[],
  cfg: SeriesConfig,
  scope: MarketScope,
  fallback: boolean,
  social: Record<string, number> | null,
  wishlist: MarketSignal[] = [],
  signals: MarketSignal[] = [],
): Profile[] {
  const scopedKept = kept.map((r, i) => ({ ...r, scoped: scopedMentions(r, scope, fallback), priority: i + 1 }));
  const keptTotal = scopedKept.reduce((a, r) => a + r.scoped, 0) || 1;

  return ARCHETYPES.map((a) => {
    const picked = [...scopedKept]
      .sort((x, y) => a.rank(y) - a.rank(x) || x.priority - y.priority)
      .slice(0, Math.min(MAX_PER_PROFILE, Math.max(MIN_KEPT_TO_BUILD, Math.ceil(scopedKept.length * 0.6))))
      .sort((x, y) => x.priority - y.priority);

    const covered = picked.reduce((s, r) => s + r.scoped, 0);
    const inFocus = picked.filter((r) => cfg.focus.includes(r.category)).length;
    /* L1 also rewards following the PM's priority order: the PM's ranking is a human principle for this decision. */
    const prioFit = picked.reduce((sum, r) => sum + 1 / r.priority, 0) / scopedKept.slice(0, picked.length).reduce((sum, r) => sum + 1 / r.priority, 0);
    const l1 = 0.5 + 0.25 * (inFocus / Math.max(1, picked.length)) + 0.25 * prioFit;
    const l2 = covered / keptTotal;
    const l3 = social ? social[a.id] ?? null : null;
    const w3 = l3 === null ? 0 : cfg.l3Weight;
    const w1 = 0.45 * (1 - w3);
    const w2 = 1 - w1 - w3;
    const total = w1 * l1 + w2 * l2 + w3 * (l3 ?? 0);

    const wishes = wishlist.filter((w) => a.wishCats.includes(w.category));
    const titles = new Set(picked.map((r) => r.title));
    const backing = signals.filter((sg) => sg.relatesTo.some((t) => titles.has(t)));
    const cats = [...new Set(picked.map((r) => r.category))];
    const left = scopedKept.filter((r) => !picked.includes(r));
    const tops = picked.filter((r) => r.priority <= 3).map((r) => `#${r.priority}`);
    const why = [
      `Covers ${covered.toLocaleString("en")} customer mentions, ${Math.round(l2 * 100)}% of everything you kept.`,
      `${inFocus} of ${picked.length} requirements match the ${cfg.name}'s focus on ${cfg.focus.join(" and ")} (BMW principles).`,
      tops.length ? `Takes your top priorities ${tops.join(", ")}.` : "Takes none of your top-3 priorities.",
      `Leans on ${cats.join(", ")}.`,
      left.length ? `Leaves out ${left.slice(0, 2).map((r) => r.title).join(" and ")}${left.length > 2 ? ` and ${left.length - 2} more` : ""}.` : "Includes every request you kept.",
    ];
    if (backing.length) why.push(`${backing.length} competitor feature${backing.length > 1 ? "s" : ""} or trend${backing.length > 1 ? "s" : ""} back these requests.`);
    if (wishes.length) why.push(`Adds ${wishes.length} item${wishes.length > 1 ? "s" : ""} from your wishlist: ${wishes.map((w) => w.title).join(", ")}.`);
    if (fallback) why.push("No comments from this market for this series: built on all markets, so confidence is lower.");

    return { id: a.id, name: a.name, tagline: a.tagline, requests: picked, wishes, backing, why, score: { l1, l2, l3, total } };
  }).sort((x, y) => y.score.total - x.score.total);
}

/** Draft SMART target for a requirement. A PM edits it later; it is a starting point, not a commitment. */
export function draftTarget(r: FeatureRequest & { scoped: number }): string {
  const t = `“${r.title}”`;
  if (r.types.defect > r.types.wants && r.types.defect >= r.types.difficult)
    return `${t}: halve defect reports in this area within 12 months of launch (baseline ${r.scoped} mentions).`;
  if (r.types.difficult > r.types.wants) return `${t}: halve ease-of-use complaints in this area within 12 months of launch (baseline ${r.scoped} mentions).`;
  return `${t}: available at launch; wishes for it drop by half within 12 months (baseline ${r.scoped} mentions).`;
}

/** Re-score saved profiles once a social test (L3) has run, and re-rank them. */
export function applySocial(profiles: Profile[], social: Record<string, number> | null, l3Weight: number): Profile[] {
  return profiles
    .map((p) => {
      const l3 = social ? social[p.id] ?? null : null;
      const w3 = l3 === null ? 0 : l3Weight;
      const w1 = 0.45 * (1 - w3);
      const w2 = 1 - w1 - w3;
      return { ...p, score: { ...p.score, l3, total: w1 * p.score.l1 + w2 * p.score.l2 + w3 * (l3 ?? 0) } };
    })
    .sort((a, b) => b.score.total - a.score.total);
}
