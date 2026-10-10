import { ArrowRight } from "lucide-react";
import MarketGlobe from "@/components/globe/MarketGlobe";
import { ButtonLink } from "@/components/site/ButtonLink";

/** Fixed globe size on desktop; on smaller screens it shrinks to the available width. */
const GLOBE_PX = 680;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* subtle brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_75%_40%,var(--brand-soft),transparent_70%),radial-gradient(40%_40%_at_10%_0%,var(--bg-soft),transparent_70%)]"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-16 sm:px-6 md:pt-14 lg:grid-cols-[minmax(0,1fr)_680px] lg:gap-8 lg:pb-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-brand-deep ring-1 ring-line">
            <span className="size-2 rounded-full bg-brand" aria-hidden />
            AI for product decision making
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-5xl font-semibold tracking-tight text-ink text-balance sm:text-6xl lg:text-[4.5rem] lg:leading-[1.02]"
          >
            Hear every market. <span className="text-brand">Decide with a reason.</span>
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-ink-soft text-pretty">
            Dixi listens to customers in every market, weighs every signal and turns it into requirements for the
            next BMW. Each one traces back to its source.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard">
              Open dashboard <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#process" variant="secondary">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto w-full" style={{ maxWidth: GLOBE_PX }}>
          <MarketGlobe variant="hero" />
        </div>
      </div>
    </section>
  );
}
