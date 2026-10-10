/* Country polygons for the globe: world-atlas 110m, loaded once per page (module-level memo). */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import { MARKETS, type MarketId } from "@/lib/markets";

export interface CountryProps {
  name: string;
  market: MarketId | null;
}

export type CountryFeature = Feature<Geometry, CountryProps>;

const MARKET_BY_COUNTRY = new Map<string, MarketId>();
for (const m of MARKETS) for (const c of m.countries) MARKET_BY_COUNTRY.set(c, m.id);

type Topology = Parameters<typeof feature>[0];

let countriesPromise: Promise<CountryFeature[]> | null = null;

export function loadCountries(): Promise<CountryFeature[]> {
  if (!countriesPromise) {
    countriesPromise = import("world-atlas/countries-110m.json")
      .then((mod) => {
        const topo = (mod.default ?? mod) as unknown as Topology;
        const fc = feature(topo, topo.objects.countries as never) as unknown as FeatureCollection<Geometry, { name?: string }>;
        return fc.features
          .filter((f) => f.properties?.name !== "Antarctica")
          .map((f) => {
            const id = f.id == null ? "" : String(f.id);
            return {
              type: "Feature" as const,
              id,
              geometry: f.geometry,
              properties: { name: f.properties?.name ?? "", market: MARKET_BY_COUNTRY.get(id) ?? null },
            };
          });
      })
      .catch((err: unknown) => {
        countriesPromise = null; // allow a retry on the next mount
        throw err;
      });
  }
  return countriesPromise;
}
