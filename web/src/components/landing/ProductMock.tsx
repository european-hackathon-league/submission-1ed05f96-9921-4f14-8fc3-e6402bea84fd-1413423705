/* Coded product preview: a small, static dashboard mock built from divs (sample content, not BMW data). */
import { TriangleAlert, Check, Clock, GitBranch, Pencil, X } from "lucide-react";

type Status = "kept" | "edited" | "postponed" | "rejected";

const STATUS: Record<Status, { label: string; cls: string; Icon: typeof Check }> = {
  kept: { label: "Kept", cls: "bg-good-soft text-good", Icon: Check },
  edited: { label: "Edited", cls: "bg-brand-soft text-brand-deep", Icon: Pencil },
  postponed: { label: "Postponed", cls: "bg-wait-soft text-wait", Icon: Clock },
  rejected: { label: "Rejected", cls: "bg-bad-soft text-bad", Icon: X },
};

const ROWS: { id: string; title: string; score: number; mix: [number, number, number]; status: Status }[] = [
  { id: "R-12", title: "Climate controls reachable without the touchscreen", score: 86, mix: [20, 72, 8], status: "kept" },
  { id: "R-07", title: "Phone pairs in under 5 s on 95% of attempts", score: 78, mix: [10, 80, 10], status: "edited" },
  { id: "R-21", title: "Body width fits standard Japanese car parks", score: 74, mix: [70, 28, 2], status: "kept" },
  { id: "R-30", title: "Monthly over-the-air feature updates", score: 61, mix: [5, 50, 45], status: "postponed" },
  { id: "R-33", title: "Paid subscription for heated seats", score: 22, mix: [0, 60, 40], status: "rejected" },
];

function Mix({ mix }: { mix: [number, number, number] }) {
  return (
    <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-bg-soft" aria-hidden>
      <span className="bg-l1" style={{ width: `${mix[0]}%` }} />
      <span className="bg-l2" style={{ width: `${mix[1]}%` }} />
      <span className="bg-l3" style={{ width: `${mix[2]}%` }} />
    </div>
  );
}

export function ProductMock() {
  return (
    <div
      role="img"
      aria-label="Preview of the Dixi dashboard: a list of draft requirements with scores, layer mix and the product manager's decision, a lineage trail and an evidence-gap warning."
      className="overflow-hidden rounded-[18px] bg-surface shadow-float ring-1 ring-line"
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-bg-soft px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="size-2.5 rounded-full bg-line" />
        <span className="ml-3 truncate rounded-md bg-surface px-3 py-0.5 font-mono text-[11px] text-muted ring-1 ring-line">
          dixi / 7 Series successor / requirements
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_250px]">
        {/* requirements table */}
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Draft requirements</p>
            <div className="flex gap-1.5 text-[11px] font-medium">
              {["All markets", "EU", "CN", "US", "JP"].map((t, i) => (
                <span key={t} className={`rounded-full px-2 py-0.5 ${i === 0 ? "bg-brand text-white" : "bg-bg-soft text-ink-soft"}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {ROWS.map((r, i) => {
              const s = STATUS[r.status];
              return (
                <li key={r.id} className={`flex items-center gap-3 py-2.5 ${i === 1 ? "-mx-2 rounded-lg bg-brand-soft/60 px-2" : ""}`}>
                  <span className="hidden w-10 shrink-0 font-mono text-[11px] text-muted sm:block">{r.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.title}</span>
                  <span className="hidden sm:block">
                    <Mix mix={r.mix} />
                  </span>
                  <span className="w-7 shrink-0 text-right font-mono text-xs font-semibold text-ink-soft">{r.score}</span>
                  <span className={`inline-flex w-[88px] shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                    <s.Icon className="size-3" aria-hidden />
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* side panel: lineage + gaps */}
        <aside className="border-t border-line bg-bg-soft/60 p-4 sm:p-5 md:border-t-0 md:border-l">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <GitBranch className="size-3.5 text-brand" aria-hidden /> Lineage · R-07
          </p>
          <ol className="mt-3 space-y-2.5 border-l-2 border-line pl-3 text-[12px]">
            <li>
              <span className="text-muted">Comment</span>
              <p className="text-ink-soft">“CarPlay drops out too often.”</p>
            </li>
            <li>
              <span className="text-muted">Evidence</span>
              <p className="text-ink-soft">Owner feedback, US · 3 sources</p>
            </li>
            <li>
              <span className="text-muted">AI draft</span>
              <p className="text-ink-soft">Pairs in under 8 s</p>
            </li>
            <li>
              <span className="font-medium text-human">PM decision</span>
              <p className="text-ink-soft">Tightened to 5 s: matches rivals</p>
            </li>
          </ol>
          <div className="mt-4 rounded-lg bg-wait-soft p-2.5 text-[12px] text-ink-soft ring-1 ring-wait/20">
            <p className="flex items-center gap-1.5 font-semibold text-wait">
              <TriangleAlert className="size-3.5" aria-hidden /> What we don&apos;t know
            </p>
            <p className="mt-1">Japan: thin sample (n = 14). EU and CN signals conflict.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
