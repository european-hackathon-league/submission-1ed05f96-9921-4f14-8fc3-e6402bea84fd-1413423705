/* Example pipeline data: same shape as the local BMW-derived file, but every name and number here is made up.
 * Used whenever web/data-local/pipeline.json is missing (fresh clones, Vercel).
 */
import type { MarketId } from "@/lib/markets";
import type { Category, FeatureRequest, PipelineData, SeriesData, SeriesId } from "./types";

type Row = [title: string, category: Category, summary: string, base: number];

const ROWS: Row[] = [
  ["Simpler infotainment menus", "Digital", "Owners want common functions reachable in one or two taps instead of nested menus.", 120],
  ["Reliable phone connection", "Digital", "Wireless phone mirroring drops or needs re-pairing too often.", 104],
  ["Physical climate controls", "Interior", "Customers ask for buttons or dials for temperature and fan instead of the touchscreen.", 88],
  ["Softer ride on rough roads", "Powertrain", "The suspension feels firm over broken surfaces, especially with large wheels.", 76],
  ["More rear legroom", "Interior", "Rear passengers want more knee and foot room on longer trips.", 64],
  ["Longer electric range", "Powertrain", "Electric and plug-in owners want more real-world range in winter.", 58],
  ["Quieter cabin at speed", "Interior", "Wind and tyre noise are noticeable on the motorway.", 51],
  ["Smarter driver assistance", "Digital", "Lane and distance assistants should feel more natural and warn less often.", 47],
  ["Better headlight range", "Exterior", "Drivers want brighter, wider lighting on country roads.", 39],
  ["Easier-to-clean exterior trim", "Exterior", "Gloss black trim scratches easily and shows marks.", 31],
  ["Faster charging", "Powertrain", "Shorter stops at fast chargers on long trips.", 28],
  ["More storage for small items", "Interior", "Places for phones, keys and drinks within easy reach.", 24],
  ["Larger boot opening", "Exterior", "Loading bulky luggage is awkward through the current opening.", 19],
  ["Over-the-air updates for more features", "Digital", "Owners want new functions after purchase without a workshop visit.", 15],
];

const SPLIT: Record<SeriesId, Partial<Record<MarketId | "OTHER", number>>> = {
  F70: { EU: 0.62, JP: 0.28, OTHER: 0.1 },
  G60: { US: 0.7, EU: 0.12, JP: 0.06, OTHER: 0.12 },
  G70: { US: 0.74, EU: 0.08, JP: 0.06, OTHER: 0.12 },
};

const NAMES: Record<SeriesId, string> = { F70: "1 Series", G60: "5 Series", G70: "7 Series" };

function requestsFor(series: SeriesId, factor: number): FeatureRequest[] {
  return ROWS.map(([title, category, summary, base], i) => {
    const mentions = Math.round(base * factor);
    const byMarket = Object.fromEntries(
      Object.entries(SPLIT[series]).map(([m, share]) => [m, Math.round(mentions * (share ?? 0))]),
    );
    const wants = Math.round(mentions * 0.5);
    const difficult = Math.round(mentions * 0.3);
    return {
      /* X = example: never the same id as a request built from BMW data (G60-R01 …), because decisions are matched by id. */
      id: `${series}-X${String(i + 1).padStart(2, "0")}`,
      series,
      title,
      category,
      summary,
      mentions,
      byMarket,
      types: { wants, difficult, defect: mentions - wants - difficult },
      sources: [
        { name: "Owner reviews", count: Math.round(mentions * 0.6) },
        { name: "Customer care", count: Math.round(mentions * 0.4) },
      ],
      quotes: [],
      taxonomy: [`Example topic ${i + 1}`],
      relatedOptions: [],
    };
  });
}

function series(id: SeriesId, factor: number): SeriesData {
  const total = Math.round(900 * factor);
  return {
    id,
    name: NAMES[id],
    feedbackByMarket: Object.fromEntries(Object.entries(SPLIT[id]).map(([m, s]) => [m, Math.round(total * (s ?? 0))])),
    requests: requestsFor(id, factor),
    strengths: [
      { title: "Driving pleasure", mentions: Math.round(140 * factor) },
      { title: "Exterior design", mentions: Math.round(110 * factor) },
      { title: "Seat comfort", mentions: Math.round(80 * factor) },
    ],
    studies: [],
    sales: [],
    options: [],
  };
}

export const EXAMPLE_PIPELINE: PipelineData = {
  origin: "example",
  generatedAt: "2026-10-10T00:00:00.000Z",
  series: [series("F70", 0.8), series("G60", 1.2), series("G70", 1)],
};
