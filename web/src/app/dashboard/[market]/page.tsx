import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { SeriesPicker } from "@/components/pipeline/SeriesPicker";
import { MARKET_PARAMS, parseMarketParam } from "@/lib/dashboard-data";
import { marketById } from "@/lib/markets";

export function generateStaticParams() {
  return MARKET_PARAMS.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/dashboard/[market]">): Promise<Metadata> {
  const scope = parseMarketParam((await params).market);
  if (!scope) return { title: "Not found · Dixi" };
  return { title: `${scope === "ALL" ? "All markets" : marketById(scope).name} · Dixi` };
}

/* The shell (bar) renders without params so navigation is instant; the market content streams in. */
export default function MarketDashboardPage({ params }: PageProps<"/dashboard/[market]">) {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <MarketContent params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function MarketContent({ params }: Pick<PageProps<"/dashboard/[market]">, "params">) {
  const scope = parseMarketParam((await params).market);
  if (!scope) notFound();
  return <SeriesPicker scope={scope} />;
}
