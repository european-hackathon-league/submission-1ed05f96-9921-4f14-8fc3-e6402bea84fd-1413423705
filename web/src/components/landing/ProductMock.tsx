/* Coded product preview: a catalogue-style profile page next to the generations list.
 * Sample content written for the landing page, not BMW data. */
import Image from "next/image";
import { Download, History, RotateCcw, FolderOpen, X } from "lucide-react";
import { CAR_IMAGES } from "@/lib/car-images";

const COVER = CAR_IMAGES.G60.front;

type Mark = "this" | "other" | "none";

const MATRIX: { area: string; rows: { title: string; marks: [Mark, Mark, Mark] }[] }[] = [
  {
    area: "Interior",
    rows: [
      { title: "Quieter cabin on the motorway", marks: ["this", "none", "other"] },
      { title: "Rear seats that recline", marks: ["this", "none", "none"] },
    ],
  },
  {
    area: "Digital",
    rows: [
      { title: "Climate controls without the touchscreen", marks: ["this", "other", "none"] },
      { title: "Phone pairs first time, every time", marks: ["none", "other", "other"] },
    ],
  },
];

const GENERATIONS = [
  { id: "Gen 3", car: "5 Series · Europe", when: "Today", active: true },
  { id: "Gen 2", car: "5 Series · Europe", when: "2 days ago" },
  { id: "Gen 1", car: "7 Series · China", when: "Last week" },
];

function MarkCell({ m }: { m: Mark }) {
  if (m === "none") return <span className="text-muted/60">–</span>;
  return m === "this" ? <span className="text-ink">■</span> : <span className="text-muted">□</span>;
}

export function ProductMock() {
  return (
    <figure
      aria-label="Preview of Dixi: a catalogue-style car profile with a requirements matrix, next to the list of saved generations and a decision with its reason."
      className="overflow-hidden rounded-[18px] bg-surface shadow-float ring-1 ring-line"
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-bg-soft px-4 py-2.5">
        <span aria-hidden className="size-2.5 rounded-full bg-line" />
        <span aria-hidden className="size-2.5 rounded-full bg-line" />
        <span aria-hidden className="size-2.5 rounded-full bg-line" />
        <span className="ml-3 min-w-0 truncate rounded-md bg-surface px-3 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line">
          dixi / generations / 5 Series · Europe / profile A
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
        {/* catalogue page */}
        <div className="min-w-0 p-3 sm:p-5">
          <div className="overflow-hidden rounded-xl ring-1 ring-line">
            <div className="relative isolate min-h-[240px] bg-ink text-white sm:min-h-[320px]">
              <Image src={COVER.src} alt={COVER.alt} fill sizes="(min-width: 768px) 640px, 100vw" className="-z-10 object-cover object-[50%_65%]" />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/45 to-transparent" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="flex min-h-[240px] flex-col justify-between gap-6 p-5 sm:min-h-[320px] sm:p-6">
                <div>
                  <p className="text-4xl font-light tracking-tight sm:text-5xl">BMW 5</p>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-[0.25em] text-white/85 uppercase sm:text-xs">
                    Profile A · Comfort &amp; craft
                  </p>
                  <p className="mt-3 max-w-[16rem] text-sm text-white/75">Quiet long trips, fewer screens in the way.</p>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2 text-[10px]">
                  <span className="font-semibold tracking-[0.2em] text-white/90 uppercase">Europe · Gen 3</span>
                  <a href={COVER.page} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white hover:underline">
                    {COVER.credit} · modified
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-lg font-semibold tracking-tight text-ink uppercase">Requirements.</p>
                <p className="text-[11px] text-muted">In your priority order</p>
              </div>
              <table className="mt-2 w-full text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="text-[11px] text-muted">
                    <th className="pb-1 text-left font-normal">
                      <span className="sr-only">Requirement</span>
                    </th>
                    {["A", "B", "C"].map((p) => (
                      <th key={p} className={`w-8 pb-1 font-normal sm:w-10 ${p === "A" ? "font-semibold text-ink" : ""}`}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                {MATRIX.map((g) => (
                  <tbody key={g.area}>
                    <tr>
                      <td colSpan={4} className="pt-3">
                        <p className="border-b border-ink/70 pb-1 text-[11px] font-semibold tracking-[0.12em] text-ink uppercase">{g.area}</p>
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.title} className={`border-b border-line ${r.marks[0] === "this" ? "text-ink" : "text-muted"}`}>
                        <td className="py-2 pr-2">{r.title}</td>
                        {r.marks.map((m, i) => (
                          <td key={i} className="py-2 text-center">
                            <MarkCell m={m} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
              <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span>■ In this profile</span>
                <span>□ In another profile</span>
                <span>– Not included</span>
              </p>
            </div>
          </div>
        </div>

        {/* side panel: generations + a decision */}
        <aside className="flex flex-col gap-4 border-t border-line bg-bg-soft/60 p-4 sm:p-5 md:border-t-0 md:border-l">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <History className="size-3.5 text-brand" aria-hidden /> Generations
            </p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {GENERATIONS.map((g) => (
                <li
                  key={g.id}
                  className={`rounded-lg px-3 py-2 text-[12px] ring-1 ${g.active ? "bg-surface ring-brand/40" : "bg-surface/70 ring-line"}`}
                >
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink">{g.id}</span>
                    <span className="text-[11px] text-muted">{g.when}</span>
                  </p>
                  <p className="text-ink-soft">{g.car}</p>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-ink-soft">
              {[
                { label: "Reopen", Icon: FolderOpen },
                { label: "Rebuild", Icon: RotateCcw },
              ].map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 ring-1 ring-line">
                  <Icon className="size-3" aria-hidden /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-human-soft p-3 text-[12px] ring-1 ring-human/20">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-human uppercase">
              <X className="size-3.5" aria-hidden /> Rejected
            </p>
            <p className="mt-1 font-medium text-ink">Paid subscription for heated seats</p>
            <p className="mt-0.5 text-ink-soft">“Customers read it as a hidden cost.”</p>
            <p className="mt-1.5 text-[11px] text-muted">Product manager · 12 Oct, 14:05</p>
          </div>

          <span className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-medium text-white">
            <Download className="size-4" aria-hidden /> Download PDF
          </span>
        </aside>
      </div>
    </figure>
  );
}
