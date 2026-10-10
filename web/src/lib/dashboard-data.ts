/* Dixi dashboard data + scoring.
 *
 * SAMPLE DATA: illustrative only, not BMW figures. Ported and trimmed from dashboard-demo/assets/sample-data.js,
 * with a few extra illustrative requirements so every model has a full list. BMW's dataset never goes into this repo.
 */
import type { MarketId } from "@/lib/markets";

export const SAMPLE_LABEL = "Sample data: illustrative, not BMW figures";

/* ---------- markets in the URL ---------- */

/** A single market, or every market at once. */
export type MarketScope = MarketId | "ALL";

/** URL segments for /dashboard/[market]. */
export const MARKET_PARAMS = ["eu", "cn", "us", "jp", "all"] as const;
export type MarketParam = (typeof MARKET_PARAMS)[number];

export function parseMarketParam(value: string): MarketScope | null {
  return (MARKET_PARAMS as readonly string[]).includes(value) ? (value.toUpperCase() as MarketScope) : null;
}

export const marketHref = (scope: MarketScope) => `/dashboard/${scope.toLowerCase()}`;

/* ---------- models, layers, sources ---------- */

export type ModelId = "F70" | "G60" | "G70";
export type LayerId = "L1" | "L2" | "L3";

export interface Model {
  id: ModelId;
  name: string;
  segment: string;
}

export const MODELS: Model[] = [
  { id: "F70", name: "1 Series", segment: "Entry, younger buyers" },
  { id: "G60", name: "5 Series", segment: "Business sedan, volume driver" },
  { id: "G70", name: "7 Series", segment: "Luxury flagship" },
];

export const DEFAULT_MODEL: ModelId = "G60";

export interface Layer {
  id: LayerId;
  name: string;
  /** One line for the legend. */
  line: string;
}

export const LAYERS: Layer[] = [
  { id: "L1", name: "Principles", line: "Rules owned by named managers. A strong prior that only changes through approval." },
  { id: "L2", name: "Evidence", line: "Customer studies, sales, quality data and owner feedback, weighted by source quality." },
  { id: "L3", name: "Signals", line: "Social media, search trends and concept tests. Low weight; a tie-breaker." },
];

/** Share of the final score per layer, per model (illustrative defaults). */
export const LAYER_WEIGHTS: Record<ModelId, Record<LayerId, number>> = {
  F70: { L1: 0.45, L2: 0.35, L3: 0.2 },
  G60: { L1: 0.5, L2: 0.42, L3: 0.08 },
  G70: { L1: 0.55, L2: 0.43, L3: 0.02 },
};

export type SourceId = "sales" | "survey" | "quality" | "care" | "press" | "trends" | "social" | "concept";

export interface Source {
  id: SourceId;
  name: string;
  layer: Exclude<LayerId, "L1">;
  weight: number;
}

export const SOURCES: Source[] = [
  { id: "sales", name: "Sales volume", layer: "L2", weight: 1.0 },
  { id: "survey", name: "Customer studies", layer: "L2", weight: 0.9 },
  { id: "quality", name: "Quality / defect reports", layer: "L2", weight: 0.85 },
  { id: "care", name: "Owner feedback", layer: "L2", weight: 0.7 },
  { id: "press", name: "Expert reviews / press", layer: "L2", weight: 0.6 },
  { id: "trends", name: "Search trends", layer: "L3", weight: 0.4 },
  { id: "social", name: "Social media", layer: "L3", weight: 0.2 },
  { id: "concept", name: "Concept-test reactions", layer: "L3", weight: 0.1 },
];

/** Per-model source weight overrides (social matters more for the 1 Series than the 7 Series). */
export const SOURCE_OVERRIDES: Record<ModelId, Partial<Record<SourceId, number>>> = {
  F70: { social: 0.5, concept: 0.2 },
  G60: {},
  G70: { social: 0.05, press: 0.7 },
};

/** Illustrative share (%) of each model's volume per market. */
export const MARKET_VOLUME: Record<ModelId, Record<MarketId, number>> = {
  F70: { EU: 72, CN: 0, US: 0, JP: 6 },
  G60: { EU: 38, CN: 27, US: 25, JP: 3 },
  G70: { EU: 26, CN: 28, US: 34, JP: 4 },
};

/* ---------- requirements ---------- */

export type Stance = "+" | "-" | "0";
export type RequirementStatus = "proposed" | "approved" | "postponed" | "rejected" | "needs-engineering";

export interface Requirement {
  id: string;
  model: ModelId;
  title: string;
  area: string;
  statement: string;
  /** Strength of support per source, 0–1. */
  signals: Partial<Record<SourceId, number>>;
  /** How each market leans: + supports, - opposes, 0 neutral. */
  markets: Record<MarketId, Stance>;
  /** Principle fit: +1 supports, -1 conflicts. */
  principleFit: Record<string, 1 | -1>;
  status: RequirementStatus;
  confidence: "low" | "medium" | "high";
}

const s = (sales: number, survey: number, quality: number, care: number, press: number, trends: number, social: number, concept: number) =>
  ({ sales, survey, quality, care, press, trends, social, concept });
const m = (EU: Stance, CN: Stance, US: Stance, JP: Stance) => ({ EU, CN, US, JP });

export const REQUIREMENTS: Requirement[] = [
  // 7 Series
  { id: "R-701", model: "G70", title: "Larger exterior and rear space", area: "Exterior", statement: "Noticeably larger outside and in the rear seats than today.", signals: s(0.9, 0.8, 0.1, 0.5, 0.6, 0.5, 0.4, 0.3), markets: m("0", "+", "+", "-"), principleFit: { "P-02": 1, "P-07": 1, "P-03": -1 }, status: "proposed", confidence: "medium" },
  { id: "R-702", model: "G70", title: "Climate with one direct action", area: "Interior", statement: "Temperature, fan and defrost change with one action, no menu.", signals: s(0.4, 0.85, 0.4, 0.9, 0.7, 0.4, 0.5, 0.4), markets: m("+", "0", "+", "+"), principleFit: { "P-01": 1 }, status: "approved", confidence: "high" },
  { id: "R-703", model: "G70", title: "Connectivity that just works", area: "Infotainment", statement: "Phone, eSIM, CarPlay and the app connect every time.", signals: s(0.5, 0.95, 0.8, 0.85, 0.6, 0.3, 0.6, 0.2), markets: m("+", "+", "+", "+"), principleFit: {}, status: "approved", confidence: "high" },
  { id: "R-704", model: "G70", title: "Cabin cools down fast", area: "Interior", statement: "On a hot day the cabin reaches a comfortable temperature quickly.", signals: s(0.4, 0.7, 0.6, 0.75, 0.3, 0.2, 0.3, 0.1), markets: m("0", "+", "+", "0"), principleFit: {}, status: "postponed", confidence: "medium" },
  { id: "R-705", model: "G70", title: "Rear-seat lounge", area: "Interior", statement: "Rear passengers can work or rest: reclining seat, quiet cabin, privacy.", signals: s(0.7, 0.75, 0.2, 0.4, 0.6, 0.4, 0.3, 0.5), markets: m("0", "+", "0", "0"), principleFit: { "P-07": 1, "P-02": 1 }, status: "proposed", confidence: "medium" },
  { id: "R-706", model: "G70", title: "Rear cooler box as an option", area: "Interior", statement: "Offered as an option, reusing the part from the 5 Series.", signals: s(0.2, 0.2, 0, 0.2, 0.3, 0.1, 0.2, 0.2), markets: m("0", "+", "+", "0"), principleFit: { "P-05": 1 }, status: "needs-engineering", confidence: "low" },
  { id: "R-707", model: "G70", title: "More equipment as standard", area: "Value", statement: "Fewer paid extras: the most-wanted features come standard.", signals: s(0.6, 0.85, 0, 0.5, 0.7, 0.3, 0.5, 0.3), markets: m("+", "0", "0", "0"), principleFit: {}, status: "rejected", confidence: "medium" },
  // 1 Series
  { id: "R-101", model: "F70", title: "Physical climate controls", area: "Interior", statement: "Climate is set with physical buttons, not only the touchscreen.", signals: s(0.5, 0.8, 0.4, 0.9, 0.7, 0.4, 0.7, 0.5), markets: m("+", "0", "0", "+"), principleFit: { "P-05": 1 }, status: "approved", confidence: "high" },
  { id: "R-102", model: "F70", title: "Softer ride on rough roads", area: "Chassis", statement: "The ride stays comfortable on poor road surfaces.", signals: s(0.4, 0.2, 0.1, 0.7, 0.4, 0.2, 0.6, 0.3), markets: m("+", "0", "0", "0"), principleFit: { "P-01": -1 }, status: "proposed", confidence: "low" },
  { id: "R-103", model: "F70", title: "Bigger boot", area: "Exterior", statement: "Fits a weekly shop plus a pushchair.", signals: s(0.5, 0.8, 0.1, 0.5, 0.5, 0.3, 0.4, 0.4), markets: m("+", "0", "0", "+"), principleFit: {}, status: "proposed", confidence: "medium" },
  { id: "R-104", model: "F70", title: "Wireless phone mirroring that stays connected", area: "Infotainment", statement: "Phone projection connects on start and does not drop out.", signals: s(0.4, 0.7, 0.7, 0.8, 0.5, 0.5, 0.8, 0.4), markets: m("+", "0", "0", "+"), principleFit: {}, status: "proposed", confidence: "medium" },
  { id: "R-105", model: "F70", title: "Lower running costs", area: "Powertrain", statement: "Everyday consumption and service costs drop noticeably.", signals: s(0.7, 0.6, 0.2, 0.5, 0.6, 0.4, 0.4, 0.2), markets: m("+", "0", "0", "0"), principleFit: { "P-05": 1 }, status: "needs-engineering", confidence: "medium" },
  { id: "R-106", model: "F70", title: "Digital key for shared use", area: "Connectivity", statement: "Owners can share the car with family from the app.", signals: s(0.2, 0.4, 0, 0.3, 0.3, 0.5, 0.7, 0.6), markets: m("+", "0", "0", "0"), principleFit: { "P-04": 1 }, status: "proposed", confidence: "low" },
  // 5 Series
  { id: "R-501", model: "G60", title: "Real-world winter range", area: "Powertrain", statement: "The electric 5 Series keeps a usable range in winter.", signals: s(0.7, 0.7, 0.5, 0.85, 0.8, 0.6, 0.5, 0.4), markets: m("+", "+", "+", "0"), principleFit: {}, status: "approved", confidence: "high" },
  { id: "R-502", model: "G60", title: "Hands-free tailgate works first time", area: "Body", statement: "The tailgate opens with one foot gesture, every time.", signals: s(0.3, 0.6, 0.9, 0.7, 0.2, 0.1, 0.3, 0.1), markets: m("0", "0", "+", "0"), principleFit: {}, status: "proposed", confidence: "medium" },
  { id: "R-503", model: "G60", title: "Climate shortcuts without menus", area: "Interior", statement: "Temperature and fan have a direct control, always visible.", signals: s(0.4, 0.8, 0.3, 0.85, 0.7, 0.3, 0.4, 0.3), markets: m("+", "0", "+", "+"), principleFit: { "P-01": 1, "P-05": 1 }, status: "proposed", confidence: "high" },
  { id: "R-504", model: "G60", title: "Long-wheelbase rear comfort", area: "Interior", statement: "The long-wheelbase version gives rear passengers real legroom.", signals: s(0.8, 0.75, 0.1, 0.4, 0.5, 0.4, 0.4, 0.3), markets: m("0", "+", "0", "0"), principleFit: { "P-07": 1 }, status: "approved", confidence: "medium" },
  { id: "R-505", model: "G60", title: "Faster connected services", area: "Infotainment", statement: "Navigation, voice and app responses feel as quick as local apps.", signals: s(0.5, 0.85, 0.6, 0.7, 0.6, 0.5, 0.7, 0.3), markets: m("0", "+", "+", "0"), principleFit: { "P-04": -1 }, status: "proposed", confidence: "medium" },
  { id: "R-506", model: "G60", title: "Calmer highway assistant", area: "Driver assistance", statement: "Lane and distance assist feel smooth and predictable on long trips.", signals: s(0.5, 0.65, 0.5, 0.6, 0.75, 0.4, 0.4, 0.3), markets: m("+", "0", "+", "0"), principleFit: { "P-01": 1 }, status: "postponed", confidence: "medium" },
  { id: "R-507", model: "G60", title: "Fewer paid extras", area: "Value", statement: "The most-ordered options come as standard.", signals: s(0.6, 0.8, 0, 0.5, 0.6, 0.3, 0.5, 0.2), markets: m("+", "0", "0", "0"), principleFit: {}, status: "rejected", confidence: "medium" },
];

/* ---------- what customers care about, per market (illustrative themes) ---------- */

export const MARKET_THEMES: Record<MarketId, string[]> = {
  EU: ["Value for money: fewer paid extras", "Physical controls for climate and audio", "Efficient everyday space and boot", "Running costs and winter range"],
  CN: ["Rear-seat comfort, often chauffeured", "Connected services as fast as local apps", "Frequent software updates", "Visible premium in the cabin"],
  US: ["Space and rear comfort", "Climate comfort on hot days", "Phone integration that just works", "Effortless long-distance driving"],
  JP: ["Compact footprint for city parking", "Build quality and reliability", "Quiet, refined cabin", "Steering feel"],
};

/* ---------- what we don't know ---------- */

export interface EvidenceGap {
  id: string;
  market: MarketScope;
  model: ModelId | "ALL";
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  action: string;
}

export const GAPS: EvidenceGap[] = [
  { id: "G-01", market: "CN", model: "ALL", title: "No owner comments from China", detail: "China requirements rest on studies, sales and external signals only.", impact: "high", action: "Add Chinese platforms or a China panel." },
  { id: "G-02", market: "JP", model: "G70", title: "Japan sample is thin", detail: "Only a few dozen comments for the 7 Series.", impact: "medium", action: "Collect garage-fit data before gate G3." },
  { id: "G-03", market: "EU", model: "F70", title: "Ride comfort: comments vs study", detail: "Owner comments say 'too firm'; the study rates ride quality very good.", impact: "medium", action: "Split by road type before deciding." },
  { id: "G-04", market: "ALL", model: "G60", title: "Smart-opener usage never logged", detail: "We can't tell how often customers use it.", impact: "medium", action: "Log usage in current cars for 3 months." },
  { id: "G-05", market: "ALL", model: "ALL", title: "About 1 in 5 comments unlabelled", detail: "The taxonomy missed them; AI re-labelling is pending review.", impact: "low", action: "Review a 100-comment sample." },
  { id: "G-06", market: "US", model: "G70", title: "No cabin temperature logs", detail: "Cooling complaints are not backed by field measurements.", impact: "medium", action: "Pull climate logs from a summer fleet." },
  { id: "G-07", market: "EU", model: "G60", title: "Winter range: few cold-climate owners", detail: "Most range feedback comes from mild regions.", impact: "medium", action: "Survey Nordic owners before the powertrain gate." },
  { id: "G-08", market: "JP", model: "ALL", title: "No competitor data for Japan", detail: "Domestic brands dominate; our comparison set is EU-centric.", impact: "low", action: "Add two domestic competitors to the benchmark." },
];

const IMPACT_RANK = { high: 0, medium: 1, low: 2 } as const;

/** Gaps that apply to this market and model, most important first. */
export function gapsFor(scope: MarketScope, model: ModelId, limit = 3): EvidenceGap[] {
  return GAPS.filter((g) => (scope === "ALL" || g.market === scope || g.market === "ALL") && (g.model === model || g.model === "ALL"))
    .sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact])
    .slice(0, limit);
}

/* ---------- scoring ----------
 * A small, pure port of the prototype engine (dashboard-demo/assets/app.js):
 *   L2, L3 = source-weighted average of the requirement's signals inside that layer
 *            (per-model source overrides applied).
 *   L1     = principle fit: 0.5 neutral, +0.5 × (supporting − conflicting) / count.
 *   base   = Σ layerWeight × layerScore / Σ layerWeights          (per-model layer weights)
 *   market = 0.85 + 0.3 × (volume share for − volume share against) / 100
 *            (volume-weighted support across markets, illustrative volumes)
 *   total  = clamp(base × market, 0, 1)
 * `parts` splits `total` into each layer's contribution, so the bar segments add up to the total.
 */
export interface Score {
  total: number;
  byLayer: Record<LayerId, number>;
  parts: Record<LayerId, number>;
}

const sourceWeight = (src: Source, model: ModelId) => SOURCE_OVERRIDES[model][src.id] ?? src.weight;

export function scoreRequirement(req: Requirement): Score {
  const model = req.model;
  const layerScore = (layer: "L2" | "L3") => {
    const srcs = SOURCES.filter((x) => x.layer === layer);
    const wsum = srcs.reduce((a, x) => a + sourceWeight(x, model), 0) || 1;
    return srcs.reduce((a, x) => a + sourceWeight(x, model) * (req.signals[x.id] ?? 0), 0) / wsum;
  };
  const fits = Object.values(req.principleFit);
  const net = fits.reduce<number>((a, f) => a + f, 0);
  const byLayer: Record<LayerId, number> = {
    L1: fits.length ? 0.5 + (0.5 * net) / fits.length : 0.5,
    L2: layerScore("L2"),
    L3: layerScore("L3"),
  };

  const lw = LAYER_WEIGHTS[model];
  const lsum = lw.L1 + lw.L2 + lw.L3 || 1;
  const vol = MARKET_VOLUME[model];
  let pro = 0;
  let contra = 0;
  for (const [mk, stance] of Object.entries(req.markets) as [MarketId, Stance][]) {
    if (stance === "+") pro += vol[mk];
    if (stance === "-") contra += vol[mk];
  }
  const factor = 0.85 + (0.3 * (pro - contra)) / 100;
  const raw = (["L1", "L2", "L3"] as const).map((l) => ((lw[l] * byLayer[l]) / lsum) * factor);
  const sum = raw[0] + raw[1] + raw[2];
  const total = Math.max(0, Math.min(1, sum));
  const k = sum > 0 ? total / sum : 0;
  return { total, byLayer, parts: { L1: raw[0] * k, L2: raw[1] * k, L3: raw[2] * k } };
}

export interface RankedRequirement extends Requirement {
  score: Score;
}

const STANCE_RANK: Record<Stance, number> = { "+": 0, "0": 1, "-": 2 };

/** Requirements for a model, highest score first. For a single market, the ones it supports come first
 * (then neutral, then opposed), each group by score: the market view shows what matters there,
 * while the score itself stays the same model-wide number. */
export function rankRequirements(model: ModelId, scope: MarketScope = "ALL"): RankedRequirement[] {
  return REQUIREMENTS.filter((r) => r.model === model)
    .map((r) => ({ ...r, score: scoreRequirement(r) }))
    .sort((a, b) =>
      (scope === "ALL" ? 0 : STANCE_RANK[a.markets[scope]] - STANCE_RANK[b.markets[scope]]) || b.score.total - a.score.total,
    );
}

/** Headline numbers for the KPI row. */
export function kpisFor(scope: MarketScope, model: ModelId) {
  const reqs = REQUIREMENTS.filter((r) => r.model === model);
  return {
    requirements: reqs.length,
    approved: reqs.filter((r) => r.status === "approved").length,
    waiting: reqs.filter((r) => r.status === "proposed").length,
    gaps: gapsFor(scope, model, Infinity).length,
  };
}
