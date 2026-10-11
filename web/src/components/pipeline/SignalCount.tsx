"use client";

import type { MarketScope } from "@/lib/dashboard-data";
import { MARKET_SIGNALS } from "@/lib/pipeline/market-signals";
import { signalsFor } from "@/lib/pipeline/profiles";
import { useResearch } from "@/lib/pipeline/research";
import type { SeriesId } from "@/lib/pipeline/types";

/** Signal count on a series card: the last live research run for this market + series, else the saved research. */
export function SignalCount({ scope, series }: { scope: MarketScope; series: SeriesId }) {
  const { result } = useResearch(scope, series);
  const n = signalsFor(result?.signals ?? MARKET_SIGNALS, series, scope).length;
  return (
    <span title={result ? "From your last live research run" : "From the saved research"}>
      {n} signals{result ? " · live" : ""}
    </span>
  );
}
