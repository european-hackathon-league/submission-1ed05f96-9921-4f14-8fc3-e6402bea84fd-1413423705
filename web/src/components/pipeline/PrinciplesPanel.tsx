"use client";

import { ChevronDown, CircleHelp, Landmark, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { Principle, useAssessment } from "@/lib/pipeline/principles";

const LEVEL_LABEL = { series: "Series fundamentals", market: "Market principles", group: "BMW Group" } as const;

/** L1: the principles that apply to this market + series (from Supabase) and what the principle assessor found.
 *  Conflicts are listed as they are, not averaged into the score; gaps say what the principles do not cover. */
export function PrinciplesPanel({
  principles,
  assessment,
  onAssess,
}: {
  principles: Principle[] | null;
  assessment: ReturnType<typeof useAssessment>;
  onAssess: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const a = assessment.result;
  const running = assessment.status === "running";

  if (principles === null)
    return (
      <section className="rounded-card border border-line bg-surface p-4 text-sm text-muted shadow-card">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Landmark aria-hidden className="size-4 text-l1" /> BMW principles (L1)
        </h2>
        <p className="mt-2">Connect the backend (NEXT_PUBLIC_API_URL) to load market and Group principles from Supabase. The score uses the series focus meanwhile.</p>
      </section>
    );

  const levels = (["series", "market", "group"] as const).map((l) => ({ l, items: principles.filter((p) => p.level === l) }));
  const used = new Set(a?.fits.flatMap((f) => [...f.supports, ...f.tensions]) ?? []);

  return (
    <section aria-labelledby="l1-heading" className="rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="l1-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Landmark aria-hidden className="size-4 text-l1" /> BMW principles (L1) · {principles.length}
        </h2>
        <button
          type="button"
          onClick={onAssess}
          disabled={running}
          title="Ask the principle assessor to rate every request against these principles again"
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-brand ring-1 ring-line hover:ring-brand/40 disabled:text-muted"
        >
          {running ? <Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> : <RefreshCw aria-hidden className="size-3.5" />}
          {running ? "Assessing…" : a ? "Re-assess" : "Assess"}
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 text-sm">
        <p className="text-xs text-muted">
          {a
            ? `Assessed ${a.fits.length} requests · ${new Date(a.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${a.model}. The fit is the score's "principle fit" part.`
            : "Not assessed yet: the score uses the series focus as principle fit."}
        </p>
        {assessment.error && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-bad">
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" /> {assessment.error}
          </p>
        )}

        {a && a.conflicts.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-human">Conflicts · {a.conflicts.length}</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-soft">
              {a.conflicts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {a && a.gaps.length > 0 && (
          <details className="text-xs">
            <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-ink-soft hover:text-brand">
              <CircleHelp aria-hidden className="size-3.5" /> What the principles don&apos;t cover · {a.gaps.length}
            </summary>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-muted">
              {a.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </details>
        )}

        {levels.map(({ l, items }) =>
          items.length === 0 ? null : (
            <div key={l}>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{LEVEL_LABEL[l]}</p>
              <ul className="mt-1 flex flex-col">
                {(showAll || l === "series" ? items : items.filter((p) => used.has(p.id) || !a).slice(0, 6)).map((p) => (
                  <li key={p.id} className="border-b border-line/60 last:border-0">
                    <button
                      type="button"
                      aria-expanded={open === p.id}
                      onClick={() => setOpen(open === p.id ? null : p.id)}
                      className="flex w-full items-start gap-2 py-1.5 text-left"
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-l1-soft px-1 font-mono text-[0.65rem] font-semibold text-l1">{p.id}</span>
                      <span className="min-w-0 flex-1 text-xs text-ink">{p.title}</span>
                      <ChevronDown aria-hidden className={`mt-0.5 size-3.5 shrink-0 text-muted transition-transform ${open === p.id ? "rotate-180" : ""}`} />
                    </button>
                    {open === p.id && (
                      <div className="flex flex-col gap-1 pb-2 pl-1 text-xs text-ink-soft">
                        <p>{p.statement}</p>
                        {p.boundary && <p className="text-muted">Boundary: {p.boundary}</p>}
                        <p className="text-muted">
                          Owner: {p.owner} · v{p.version}
                          {p.confidence ? ` · confidence ${p.confidence}` : ""}
                          {p.classification ? ` · ${p.classification}` : ""}
                        </p>
                        {p.sources.length > 0 && (
                          <p className="flex flex-wrap gap-x-2">
                            {p.sources.map((s) =>
                              s.url ? (
                                <a key={s.ref} href={s.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                                  {s.label}
                                </a>
                              ) : (
                                <span key={s.ref}>{s.label}</span>
                              ),
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
        {a && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-xs font-medium text-brand hover:underline">
            {showAll ? "Show only principles the assessor used" : `Show all ${principles.length} principles`}
          </button>
        )}
      </div>
    </section>
  );
}
