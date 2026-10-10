/* Data contract for the requirement pipeline (/dashboard/[market]/[series]).
 *
 * Two sources fill it:
 *  - web/data-local/pipeline.json: built from BMW's dataset by scripts/build-pipeline-data.py. Git-ignored, local only.
 *  - src/lib/pipeline/example.ts: example data with the same shape, used when the local file is missing (e.g. on Vercel).
 */
import type { MarketId } from "@/lib/markets";

export type SeriesId = "F70" | "G60" | "G70";
export type Category = "Exterior" | "Interior" | "Digital" | "Powertrain";
export const CATEGORIES: Category[] = ["Exterior", "Interior", "Digital", "Powertrain"];

/** Markets in the feedback data. "OTHER" = countries outside the four app markets (KR, AU, CA, ZA, …). */
export type DataMarket = MarketId | "OTHER";

export interface OptionItem {
  /** BMW option code, e.g. "337". */
  code: string;
  /** Name as printed in the option list (German). */
  name: string;
  /** Price in EUR incl. VAT; null when the list shows "–,–" (standard or included). */
  priceEur: number | null;
  /** Section heading in the option list. */
  group: string;
}

export interface FeatureRequest {
  id: string;
  series: SeriesId;
  /** Short, PM-friendly name, e.g. "Simpler iDrive menus". */
  title: string;
  category: Category;
  /** One sentence: what customers ask for. */
  summary: string;
  /** Unique feedback records behind this request. */
  mentions: number;
  /** Mentions per market (only markets with data). */
  byMarket: Partial<Record<DataMarket, number>>;
  /** How the mentions split by feedback type. */
  types: { wants: number; difficult: number; defect: number };
  /** Feedback channels behind it (anonymised source names from the dataset). */
  sources: { name: string; count: number }[];
  /** Up to 3 short customer quotes (local data only; empty in the example set). */
  quotes: string[];
  /** The BMW taxonomy topic(s) the cluster was built from, for traceability. */
  taxonomy: string[];
  /** Related options already on the price list today, if any. */
  relatedOptions: OptionItem[];
}

export interface SeriesData {
  id: SeriesId;
  /** "1 Series" etc. */
  name: string;
  /** Unique feedback records for this series, per market. */
  feedbackByMarket: Partial<Record<DataMarket, number>>;
  /** Clustered requests, sorted by mentions (desc). */
  requests: FeatureRequest[];
  /** What customers like most (for context on the profile pages). */
  strengths: { title: string; mentions: number }[];
  /** Customer-study scores per market (0–10 for CN/EU; US uses its own 1–7 scale and is converted ×10/7). */
  studies: { market: MarketId; attribute: string; score: number }[];
  /** Units per market and year (2030 is BMW's forecast). */
  sales: { market: MarketId | "ROW"; y2024: number | null; y2025: number | null; y2030: number | null }[];
  /** Option list (Germany, July 2026), trimmed to the useful items. */
  options: OptionItem[];
}

export interface PipelineData {
  /** "bmw" when built from the local dataset, "example" otherwise. */
  origin: "bmw" | "example";
  generatedAt: string;
  series: SeriesData[];
}

/** L2 market signal found by the research agent: a competitor feature people like, or a market trend. Public sources only. */
export interface MarketSignal {
  id: string;
  kind: "competitor" | "trend";
  series: SeriesId[];
  /** Official markets the signal applies to. */
  markets: ("EU" | "US" | "CN")[];
  /** ≤ 6 words. */
  title: string;
  /** Competitor model, for kind "competitor". */
  competitor?: string;
  category: Category;
  /** ≤ 20 words. */
  detail: string;
  /** Exact FeatureRequest titles this signal supports (customer feedback that asks for the same thing). */
  relatesTo: string[];
  strength: "strong" | "emerging";
  sources: { label: string; url: string }[];
}
