import type { Metadata } from "next";
import { TopBar } from "@/components/dashboard/TopBar";
import { EvidencePage } from "@/components/pipeline/EvidencePage";
import { pipelineOrigin, seriesData } from "@/lib/pipeline/load";
import { SERIES } from "@/lib/pipeline/series";

export const metadata: Metadata = { title: "Evidence · Dixi" };

/* /dashboard/evidence?generation=<id>&profile=<id>&source=<SOURCE>: where every requirement of a profile comes from.
 * Studies and sales come from the pipeline data (server); the generation itself is read on the client. */
export default function EvidenceRoute() {
  const context = Object.fromEntries(
    SERIES.map((s) => {
      const d = seriesData(s.id);
      /* Record ids per request id (ids only), so generations built before ids were exported still show them. */
      const recordIds = Object.fromEntries(d.requests.map((r) => [r.id, r.recordIds ?? []]));
      return [s.id, { studies: d.studies, sales: d.sales, recordIds }];
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
