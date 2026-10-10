/* Per-series settings for the pipeline: URL slugs, L1 principles, competitors and the L3 weight.
 * Principles and competitor notes are example content written for the prototype (a PM would own and edit them);
 * they are not BMW statements.
 */
import type { Category, SeriesId } from "./types";

export interface SeriesConfig {
  id: SeriesId;
  slug: "1-series" | "5-series" | "7-series";
  name: string;
  /** Code + one-line positioning. */
  segment: string;
  /** L1: principles every profile must respect. */
  principles: { id: string; text: string; owner: string }[];
  /** Competitors to benchmark in the profiles (L2 context). */
  competitors: { name: string; note: string }[];
  /** How much the L3 social test may move a profile's score (share of the total). */
  l3Weight: number;
  /** Categories this series leans on when the AI shapes profiles. */
  focus: Category[];
}

export const SERIES: SeriesConfig[] = [
  {
    id: "F70",
    slug: "1-series",
    name: "1 Series",
    segment: "F70 · compact entry model, younger buyers",
    principles: [
      { id: "P1", text: "Stays compact: city-friendly footprint and parking.", owner: "PM 1 Series" },
      { id: "P2", text: "Entry price stays within reach of first-time BMW buyers.", owner: "Pricing" },
      { id: "P3", text: "Driving pleasure is never traded for comfort alone.", owner: "Brand" },
    ],
    competitors: [
      { name: "Mercedes-Benz A-Class", note: "Interior ambience and screen-first cockpit" },
      { name: "Audi A3 Sportback", note: "Quality feel, physical climate controls" },
      { name: "VW Golf", note: "Value for money, broad powertrain range" },
    ],
    l3Weight: 0.2,
    focus: ["Digital", "Exterior"],
  },
  {
    id: "G60",
    slug: "5-series",
    name: "5 Series",
    segment: "G60 · business sedan, the volume driver",
    principles: [
      { id: "P1", text: "Business sedan first: comfort and quiet on long trips.", owner: "PM 5 Series" },
      { id: "P2", text: "Every powertrain (ICE, PHEV, BEV) keeps the same core experience.", owner: "Engineering" },
      { id: "P3", text: "Technology must be easy to use without the manual.", owner: "UX" },
    ],
    competitors: [
      { name: "Mercedes-Benz E-Class", note: "Rear comfort, large-screen interior" },
      { name: "Audi A6 / A6 e-tron", note: "Efficiency and charging speed" },
      { name: "Tesla Model S", note: "Software updates and range" },
    ],
    l3Weight: 0.08,
    focus: ["Digital", "Interior"],
  },
  {
    id: "G70",
    slug: "7-series",
    name: "7 Series",
    segment: "G70 · luxury flagship, often chauffeur-driven",
    principles: [
      { id: "P1", text: "Rear-seat luxury comes first.", owner: "PM 7 Series" },
      { id: "P2", text: "Flawless quality: no visible compromise on materials.", owner: "Quality" },
      { id: "P3", text: "Discreet, not flashy: technology serves the passenger.", owner: "Brand" },
    ],
    competitors: [
      { name: "Mercedes-Benz S-Class", note: "The benchmark for rear comfort and ride" },
      { name: "Audi A8", note: "Understated design, quiet cabin" },
      { name: "Lexus LS", note: "Reliability and service reputation" },
    ],
    l3Weight: 0.02,
    focus: ["Interior", "Powertrain"],
  },
];

export const seriesBySlug = (slug: string) => SERIES.find((s) => s.slug === slug);
export const seriesById = (id: SeriesId) => SERIES.find((s) => s.id === id)!;
export const SERIES_SLUGS = SERIES.map((s) => s.slug);
