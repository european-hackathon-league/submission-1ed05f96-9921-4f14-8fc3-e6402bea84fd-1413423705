import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Pipeline } from "@/components/pipeline/Pipeline";
import { MARKET_PARAMS, parseMarketParam } from "@/lib/dashboard-data";
import { marketById } from "@/lib/markets";
import { CAR_IMAGES } from "@/lib/car-images";
import { pipelineOrigin, seriesData } from "@/lib/pipeline/load";
import { SERIES_SLUGS, seriesBySlug } from "@/lib/pipeline/series";

export function generateStaticParams() {
  return MARKET_PARAMS.flatMap((market) => SERIES_SLUGS.map((series) => ({ market, series })));
}

export async function generateMetadata({ params }: PageProps<"/dashboard/[market]/[series]">): Promise<Metadata> {
  const { market, series } = await params;
  const scope = parseMarketParam(market);
  const cfg = seriesBySlug(series);
  if (!scope || !cfg) return { title: "Not found · Dixi" };
  return { title: `${cfg.name} · ${scope === "ALL" ? "All markets" : marketById(scope).name} · Dixi` };
}

export default function SeriesPipelinePage({ params }: PageProps<"/dashboard/[market]/[series]">) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <PipelineContent params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function PipelineContent({ params }: Pick<PageProps<"/dashboard/[market]/[series]">, "params">) {
  const { market, series } = await params;
  const scope = parseMarketParam(market);
  const cfg = seriesBySlug(series);
  if (!scope || !cfg) notFound();
  return <Pipeline scope={scope} cfg={cfg} data={seriesData(cfg.id)} origin={pipelineOrigin()} images={CAR_IMAGES[cfg.id]} />;
}
