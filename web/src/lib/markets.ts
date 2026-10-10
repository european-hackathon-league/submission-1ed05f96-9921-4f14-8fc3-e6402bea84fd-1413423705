/* Shared market data for the globe (landing hero + dashboard picker).
 * SAMPLE DATA: illustrative only, not BMW figures. Comments are paraphrased examples written for the demo,
 * not real customer quotes (BMW's dataset never goes into this repo).
 */

export type MarketId = "EU" | "CN" | "US" | "JP";
export type Sentiment = "good" | "bad";

export interface Market {
  id: MarketId;
  name: string;
  /** Point of view for the camera and the label. */
  lat: number;
  lng: number;
  /** ISO 3166-1 numeric codes as used by world-atlas (zero-padded strings). */
  countries: string[];
  /** CSS variable name for the market colour (see globals.css). */
  colorVar: string;
  /** Illustrative share of a model's volume, %. */
  sampleShare: number;
  /** One-line summary of what customers in this market care about (illustrative). */
  focus: string;
}

export const MARKETS: Market[] = [
  {
    id: "EU", name: "Europe", lat: 50.1, lng: 9.6, colorVar: "--eu", sampleShare: 38,
    countries: ["276", "250", "380", "724", "826", "528", "056", "040", "756", "752", "578", "208", "616", "620", "372", "203", "246", "348", "642", "300", "442", "703", "705", "191", "100", "440", "428", "233"],
    focus: "Value for money, physical controls, efficient everyday space",
  },
  {
    id: "CN", name: "China", lat: 34.5, lng: 105.5, colorVar: "--cn", sampleShare: 27,
    countries: ["156"],
    focus: "Rear-seat comfort, connected services, software speed",
  },
  {
    id: "US", name: "USA", lat: 39.5, lng: -98.4, colorVar: "--us", sampleShare: 25,
    countries: ["840"],
    focus: "Space, climate comfort, phone integration that just works",
  },
  {
    id: "JP", name: "Japan", lat: 36.2, lng: 138.3, colorVar: "--jp", sampleShare: 4,
    countries: ["392"],
    focus: "Compact footprint, quality, quiet refinement",
  },
];

export interface SampleComment {
  id: string;
  market: MarketId;
  /** Where the bubble anchors on the globe. */
  lat: number;
  lng: number;
  brand: "BMW" | "Mercedes-Benz" | "Audi" | "Tesla" | "XPeng" | "NIO" | "BYD" | "Lexus" | "Toyota";
  model?: string;
  sentiment: Sentiment;
  text: string;
  source: "Owner review" | "Survey" | "Social" | "Press";
}

export const SAMPLE_COMMENTS: SampleComment[] = [
  { id: "c1", market: "EU", lat: 48.1, lng: 11.6, brand: "BMW", model: "1 Series", sentiment: "bad", text: "Climate settings are buried in the touchscreen.", source: "Owner review" },
  { id: "c2", market: "EU", lat: 51.5, lng: -0.1, brand: "BMW", model: "5 Series", sentiment: "good", text: "Still the best-handling car in its class.", source: "Press" },
  { id: "c3", market: "EU", lat: 48.8, lng: 2.3, brand: "Mercedes-Benz", sentiment: "good", text: "The interior feels like a lounge.", source: "Social" },
  { id: "c4", market: "EU", lat: 52.5, lng: 13.4, brand: "Tesla", sentiment: "bad", text: "Build quality doesn't match the price.", source: "Owner review" },
  { id: "c5", market: "CN", lat: 31.2, lng: 121.5, brand: "BMW", model: "5 Series LWB", sentiment: "good", text: "The long wheelbase makes the rear seat feel premium.", source: "Survey" },
  { id: "c6", market: "CN", lat: 22.5, lng: 114.1, brand: "XPeng", sentiment: "good", text: "Software updates arrive every month.", source: "Social" },
  { id: "c7", market: "CN", lat: 39.9, lng: 116.4, brand: "BMW", model: "7 Series", sentiment: "bad", text: "Connected services feel slower than local brands.", source: "Survey" },
  { id: "c8", market: "CN", lat: 30.6, lng: 104.1, brand: "BYD", sentiment: "bad", text: "Great price, but the brand doesn't feel premium yet.", source: "Social" },
  { id: "c9", market: "US", lat: 34.0, lng: -118.2, brand: "BMW", model: "7 Series", sentiment: "good", text: "Rear comfort is the best I've had in any car.", source: "Owner review" },
  { id: "c10", market: "US", lat: 40.7, lng: -74.0, brand: "BMW", model: "5 Series", sentiment: "bad", text: "CarPlay drops out more often than it should.", source: "Owner review" },
  { id: "c11", market: "US", lat: 29.8, lng: -95.4, brand: "Tesla", sentiment: "good", text: "Charging on road trips is effortless.", source: "Social" },
  { id: "c12", market: "US", lat: 41.9, lng: -87.6, brand: "Lexus", sentiment: "good", text: "Never a problem in five years.", source: "Survey" },
  { id: "c13", market: "JP", lat: 35.7, lng: 139.7, brand: "BMW", model: "7 Series", sentiment: "bad", text: "Too wide for most multi-storey car parks.", source: "Owner review" },
  { id: "c14", market: "JP", lat: 34.7, lng: 135.5, brand: "Toyota", sentiment: "good", text: "Quiet, compact and fits everywhere in the city.", source: "Press" },
  { id: "c15", market: "JP", lat: 43.1, lng: 141.3, brand: "BMW", model: "3 Series", sentiment: "good", text: "Steering feel is still unmatched.", source: "Owner review" },
  { id: "c16", market: "EU", lat: 59.3, lng: 18.1, brand: "Audi", sentiment: "bad", text: "Too many features are paid extras.", source: "Social" },
  { id: "c17", market: "EU", lat: 41.9, lng: 12.5, brand: "BMW", model: "3 Series", sentiment: "good", text: "Feels planted on mountain roads.", source: "Owner review" },
  { id: "c18", market: "EU", lat: 40.4, lng: -3.7, brand: "BMW", model: "iX1", sentiment: "bad", text: "Real-world range drops a lot in winter.", source: "Owner review" },
  { id: "c19", market: "EU", lat: 52.4, lng: 4.9, brand: "Tesla", sentiment: "good", text: "The app does everything from my phone.", source: "Social" },
  { id: "c20", market: "EU", lat: 50.1, lng: 14.4, brand: "Mercedes-Benz", sentiment: "bad", text: "The touchscreen hides basic functions.", source: "Press" },
  { id: "c21", market: "CN", lat: 23.1, lng: 113.3, brand: "NIO", sentiment: "good", text: "Battery swap takes three minutes.", source: "Social" },
  { id: "c22", market: "CN", lat: 29.6, lng: 106.5, brand: "BMW", model: "X5", sentiment: "good", text: "Quiet cabin, the whole family loves it.", source: "Survey" },
  { id: "c23", market: "CN", lat: 36.1, lng: 120.4, brand: "XPeng", sentiment: "bad", text: "Assisted driving still nags too often.", source: "Owner review" },
  { id: "c24", market: "CN", lat: 34.3, lng: 108.9, brand: "BMW", model: "i3 sedan", sentiment: "bad", text: "Local apps arrive later than on Chinese cars.", source: "Social" },
  { id: "c25", market: "US", lat: 47.6, lng: -122.3, brand: "BMW", model: "X5", sentiment: "good", text: "Best road-trip car I've owned.", source: "Owner review" },
  { id: "c26", market: "US", lat: 33.7, lng: -84.4, brand: "BMW", model: "5 Series", sentiment: "bad", text: "AC takes too long to cool in summer.", source: "Survey" },
  { id: "c27", market: "US", lat: 39.7, lng: -105.0, brand: "Mercedes-Benz", sentiment: "good", text: "Rear seats are a real lounge.", source: "Press" },
  { id: "c28", market: "US", lat: 25.8, lng: -80.2, brand: "Tesla", sentiment: "bad", text: "Service visits take weeks to book.", source: "Social" },
  { id: "c29", market: "JP", lat: 33.6, lng: 130.4, brand: "Lexus", sentiment: "good", text: "Dealer service is outstanding.", source: "Survey" },
  { id: "c30", market: "JP", lat: 38.3, lng: 140.9, brand: "BMW", model: "1 Series", sentiment: "good", text: "Easy to park, fun to drive.", source: "Owner review" },
];

export const marketById = (id: MarketId) => MARKETS.find((m) => m.id === id)!;
