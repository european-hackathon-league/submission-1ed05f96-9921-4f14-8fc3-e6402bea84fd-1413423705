import {
  Car,
  FileText,
  Globe2,
  History,
  Landmark,
  Megaphone,
  MessagesSquare,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { LayerWeights } from "./LayerWeights";

type Step = { title: string; body: string; Icon: LucideIcon; human?: boolean; detail?: ReactNode };

const CATEGORIES = ["Exterior", "Interior", "Digital", "Powertrain"];

const STEPS: Step[] = [
  { title: "Pick a market", body: "Spin the globe and choose Europe, China, the USA or another market.", Icon: Globe2 },
  { title: "Pick the car", body: "1 Series, 5 Series or 7 Series.", Icon: Car },
  {
    title: "Analysis",
    body: "Dixi gathers what it knows about this car in this market, and an AI agent checks each request against BMW's principles.",
    Icon: Sparkles,
    detail: (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-l1-soft p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-l1">
            <Landmark className="size-4" aria-hidden /> BMW principles
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">The fundamentals the car must respect: series, market and BMW Group principles.</p>
        </div>
        <div className="rounded-xl bg-l2-soft p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-l2">
            <MessagesSquare className="size-4" aria-hidden /> Market evidence
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Customer feedback, studies, sales and today&apos;s option list. When you run it, a research agent adds competitors and trends, with checked sources.
          </p>
        </div>
        <div className="rounded-xl bg-bg-soft p-3.5 ring-1 ring-line sm:col-span-2">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            A rule-based script groups comments by BMW&apos;s feedback categories into <span className="font-semibold text-ink">feature requests</span>,
            sorted by area, with urgency: how many customers ask.
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Categories">
            {CATEGORIES.map((c) => (
              <li key={c} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-line">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    title: "The product manager decides",
    body: "Nothing moves on without a human.",
    Icon: UserCheck,
    human: true,
    detail: (
      <ul className="mt-4 grid gap-x-6 gap-y-2 text-[13px] leading-relaxed text-ink-soft sm:grid-cols-2">
        {[
          "Keep or reject each request. A reject always needs a written reason.",
          "Drag to set the priority.",
          "Star competitor features or trends onto a wishlist.",
          "Every keep, reject and star records who made it and when.",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-human" />
            {t}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "Build profiles",
    body: "Three car profiles: “Fix the basics”, “Tech-forward” and “Comfort & craft”. Each follows your priority, shows its fit with BMW's principles, explains why it was chosen and saves as a PDF.",
    Icon: FileText,
  },
  {
    title: "Social test",
    body: "Once the profiles exist, see which one might track better on social media. Simulated for now: nothing is posted. A small-weight tie-breaker, never the decider.",
    Icon: Megaphone,
  },
  {
    title: "Generations",
    body: "Every build is saved. Reopen earlier generations from the dashboard, or edit and rebuild them. The next build reads your earlier decisions.",
    Icon: History,
  },
];

export function Process() {
  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-20 border-y border-line bg-bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-semibold text-brand">How it works</p>
            <h2 id="process-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
              From a market to a car profile, in seven steps.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
              Scripts and AI agents do the reading and sorting. The product manager makes the calls, and every keep and reject is written down.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-ink-soft ring-1 ring-line">
                <span aria-hidden className="size-2 rounded-full bg-brand" /> Automated step
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-human-soft px-3 py-1 text-human ring-1 ring-human/20">
                <span aria-hidden className="size-2 rounded-full bg-human" /> Human step
              </li>
            </ul>
          </div>

          <ol className="relative">
            {STEPS.map(({ title, body, Icon, human, detail }, i) => (
              <li key={title} className="relative flex gap-4 pb-5 last:pb-0 sm:gap-5">
                {/* the line that connects this step to the next */}
                {i < STEPS.length - 1 && <span aria-hidden className="absolute top-10 bottom-0 left-5 w-px bg-line" />}
                <span
                  className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full ring-4 ring-bg-soft ${
                    human ? "bg-human text-white" : "bg-surface text-brand-deep shadow-card"
                  }`}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-card p-5 ring-1 ${
                    human ? "bg-human-soft ring-human/25" : "bg-surface shadow-card ring-line"
                  } ${detail ? "sm:p-6" : ""}`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={`font-mono text-xs ${human ? "text-human" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="text-lg font-semibold text-ink">{title}</h3>
                    {human && (
                      <span className="rounded-full bg-human px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase">
                        Human step
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
                  {detail}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <LayerWeights />
      </div>
    </section>
  );
}
