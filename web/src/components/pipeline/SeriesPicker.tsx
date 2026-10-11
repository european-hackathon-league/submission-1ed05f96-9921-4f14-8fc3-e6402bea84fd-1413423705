import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ListChecks, MessageSquareText, Radar, TriangleAlert } from "lucide-react";
import { MARKET_DOT } from "@/components/dashboard/marketStyle";
import { CAR_IMAGES } from "@/lib/car-images";
import type { MarketScope } from "@/lib/dashboard-data";
import { marketById } from "@/lib/markets";
import { pipelineOrigin, seriesData } from "@/lib/pipeline/load";
import { marketVolume } from "@/lib/pipeline/profiles";
import { SERIES } from "@/lib/pipeline/series";
import { SignalCount } from "./SignalCount";

/** Step 2: choose the series. Tall photo cards; each opens the requirement pipeline for this market + series. */
export function SeriesPicker({ scope }: { scope: MarketScope }) {
  const label = scope === "ALL" ? "all markets" : marketById(scope).name;
  return (
    <section aria-labelledby="series-heading" className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/dashboard/new" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-brand">
          <ArrowLeft aria-hidden className="size-4" /> Change market
        </Link>
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {scope !== "ALL" && <span aria-hidden className={`size-2 rounded-full ${MARKET_DOT[scope]}`} />}
          {label} · Step 2 of 3
        </p>
        <h1 id="series-heading" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Which car are you planning?
        </h1>
        <p className="max-w-md text-sm text-muted">Pick a series. Dixi reads what {label} customers say about it and drafts the requirements for its successor.</p>
      </div>

      <ul className="grid gap-5 md:grid-cols-3">
        {SERIES.map((s) => {
          const img = CAR_IMAGES[s.id].front;
          const data = seriesData(s.id);
          const n = marketVolume(data, scope);
          const [code, line] = s.segment.split(" · ");
          return (
            <li key={s.id}>
              <Link
                href={`/dashboard/${scope.toLowerCase()}/${s.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-ink text-white shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-float motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  loading="eager"
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/15 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider ring-1 ring-white/20 backdrop-blur-md">{code}</span>
                </div>

                <div className="relative -mt-6 flex flex-1 flex-col gap-3 p-5 pt-0">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">{s.name}</h2>
                    <p className="text-sm text-white/70">{line}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {n ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md">
                        <MessageSquareText aria-hidden className="size-3.5 text-brand-sky" />
                        {n.toLocaleString("en")} comments
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-wait/30 px-2.5 py-1 ring-1 ring-wait/40 backdrop-blur-md">
                        <TriangleAlert aria-hidden className="size-3.5" />
                        No comments here yet
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md">
                      <ListChecks aria-hidden className="size-3.5 text-brand-sky" />
                      {data.requests.length} requests
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md">
                      <Radar aria-hidden className="size-3.5 text-brand-sky" />
                      <SignalCount scope={scope} series={s.id} dataset={pipelineOrigin()} />
                    </span>
                  </div>
                  <span className="mt-auto inline-flex h-10 items-center justify-between rounded-full bg-white px-4 text-sm font-medium text-ink transition-colors group-hover:bg-brand group-hover:text-white">
                    Start analysis
                    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-[0.7rem] text-muted">
        Photos via Wikimedia Commons, resized:{" "}
        {SERIES.map((s, i) => {
          const img = CAR_IMAGES[s.id].front;
          return (
            <span key={s.id}>
              {i > 0 && " · "}
              <a href={img.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                {s.name}: {img.credit.replace(/^Photo: /, "").replace(/, via Wikimedia Commons$/, "")}
              </a>
            </span>
          );
        })}
      </p>
    </section>
  );
}
