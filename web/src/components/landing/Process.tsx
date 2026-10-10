import { Ear, History, ListChecks, Scale, type LucideIcon } from "lucide-react";
import { LayerWeights } from "./LayerWeights";

const STEPS: { n: number; title: string; body: string; Icon: LucideIcon }[] = [
  { n: 1, title: "Listen", body: "Collect what customers say, market by market.", Icon: Ear },
  { n: 2, title: "Weigh", body: "Score every signal across three layers, with weights tuned for each model.", Icon: Scale },
  {
    n: 3,
    title: "Decide",
    body: "The AI drafts most requirements as SMART targets. The product manager keeps, edits, postpones or rejects each one, with a reason.",
    Icon: ListChecks,
  },
  {
    n: 4,
    title: "Remember",
    body: "Every decision, its reason and its evidence are stored. The AI reads that memory; the PM can edit it.",
    Icon: History,
  },
];

export function Process() {
  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-20 border-y border-line bg-bg-soft">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">How it works</p>
          <h2 id="process-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
            From a customer comment to a requirement, in four steps.
          </h2>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, body, Icon }) => (
            <li
              key={n}
              className="group relative rounded-card bg-surface p-6 shadow-card ring-1 ring-line transition-shadow duration-200 hover:shadow-float motion-reduce:transition-none"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-xs text-muted">0{n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>

        <LayerWeights />
      </div>
    </section>
  );
}
