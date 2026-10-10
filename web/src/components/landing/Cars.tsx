import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { CAR_IMAGES } from "@/lib/car-images";

/* The three series, as dark photo cards in the same style as the dashboard's series picker. */
const CARS = [
  { id: "F70", name: "1 Series", line: "Compact entry model for younger buyers.", l3: 20 },
  { id: "G60", name: "5 Series", line: "Business sedan, the volume driver.", l3: 8 },
  { id: "G70", name: "7 Series", line: "Luxury flagship, rear-seat comfort first.", l3: 2 },
] as const;

const shortCredit = (credit: string) => credit.replace(/^Photo: /, "").replace(/, via Wikimedia Commons$/, "");

export function Cars() {
  return (
    <section id="cars" aria-labelledby="cars-title" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-4 sm:px-6 lg:pt-28 lg:pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand">Choose the car</p>
            <h2 id="cars-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
              Three series. One way to plan the next one.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Each series has its own principles and its own social-test weight. Pick one to start an analysis.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {CARS.map((c) => {
            const img = CAR_IMAGES[c.id].front;
            return (
              <li key={c.id}>
                <Link
                  href="/dashboard/new"
                  className="group flex h-full flex-col overflow-hidden rounded-[22px] bg-ink text-white shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-float motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent" />
                    <span className="absolute top-4 left-4 rounded-full bg-ink/45 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider ring-1 ring-white/20 backdrop-blur-md">
                      {c.id}
                    </span>
                  </div>
                  <div className="relative -mt-6 flex flex-1 flex-col gap-3 p-5 pt-0">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{c.name}</h3>
                      <p className="text-sm text-white/75">{c.line}</p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs ring-1 ring-white/15">
                      <Megaphone aria-hidden className="size-3.5 text-brand-sky" />
                      Social test weight {c.l3}%
                    </span>
                    <span className="mt-auto inline-flex h-10 items-center justify-between rounded-full bg-white px-4 text-sm font-medium text-ink transition-colors group-hover:bg-brand group-hover:text-white motion-reduce:transition-none">
                      Start analysis
                      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-muted">
          Photos via Wikimedia Commons, modified (resized):{" "}
          {CARS.map((c, i) => {
            const img = CAR_IMAGES[c.id].front;
            return (
              <span key={c.id}>
                {i > 0 && " · "}
                <a href={img.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                  {c.name}: {shortCredit(img.credit)}
                </a>
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
