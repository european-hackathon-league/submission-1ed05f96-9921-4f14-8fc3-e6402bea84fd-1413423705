import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { EvidencePage } from "@/components/pipeline/EvidencePage";
import { pipelineOrigin, seriesData } from "@/lib/pipeline/load";
import { SERIES } from "@/lib/pipeline/series";

export const metadata: Metadata = { title: "Evidence · Dixi" };

/* Where every requirement comes from.
 *   /dashboard/evidence?generation=<id>&profile=<id>[&source=…]#<request>   a saved generation's profile
 *   /dashboard/evidence?market=<EU|US|CN|…>&series=<F70|G60|G70>[&source=…]#<request>   draft: the requests being decided
 * Studies, sales and requests come from the pipeline data (server); generations and decisions are read on the client. */
export default function EvidenceRoute() {
  const context = Object.fromEntries(
    SERIES.map((s) => {
      const d = seriesData(s.id);
      /* Record ids per request id (ids only), so generations built before ids were exported still show them. */
      const recordIds = Object.fromEntries(d.requests.map((r) => [r.id, r.recordIds ?? []]));
      return [s.id, { studies: d.studies, sales: d.sales, recordIds, requests: d.requests }];
    }),
  );
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <EvidencePage context={context} origin={pipelineOrigin()} />
      </main>
    </>
  );
}
