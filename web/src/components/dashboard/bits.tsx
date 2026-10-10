/* Small presentational pieces for the dashboard. Server-safe (no hooks). */
import type { LayerId, RequirementStatus, Score, Stance } from "@/lib/dashboard-data";

const STATUS: Record<RequirementStatus, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-good-soft text-good" },
  proposed: { label: "Your decision", cls: "bg-human-soft text-human" },
  postponed: { label: "Postponed", cls: "bg-wait-soft text-wait" },
  rejected: { label: "Rejected", cls: "bg-bad-soft text-bad" },
  "needs-engineering": { label: "Engineering check", cls: "bg-bg-soft text-ink-soft ring-1 ring-line" },
};

export function StatusPill({ status }: { status: RequirementStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

const STANCE: Record<Stance, { sign: string; label: string; cls: string }> = {
  "+": { sign: "+", label: "supports", cls: "bg-good-soft text-good" },
  "-": { sign: "–", label: "opposes", cls: "bg-bad-soft text-bad" },
  "0": { sign: "0", label: "neutral", cls: "bg-bg-soft text-muted ring-1 ring-line" },
};

/** This market's stance on a requirement. `prefix` shortens it to a market code (e.g. "EU +"). */
export function StancePill({ stance, prefix, compact }: { stance: Stance; prefix?: string; compact?: boolean }) {
  const s = STANCE[stance];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${s.cls}`}
      title={`${prefix ? `${prefix} ` : ""}${s.label}`}
    >
      {prefix && <span className="font-semibold">{prefix}</span>}
      <span aria-hidden>{s.sign}</span>
      {compact ? <span className="sr-only">{s.label}</span> : <span>{s.label}</span>}
    </span>
  );
}

export const LAYER_BG: Record<LayerId, string> = { L1: "bg-l1", L2: "bg-l2", L3: "bg-l3" };

/** Score bar: one segment per layer, widths add up to the total score. */
export function ScoreBar({ score }: { score: Score }) {
  const pct = Math.round(score.total * 100);
  const label = `Score ${pct} of 100: principles ${Math.round(score.parts.L1 * 100)}, evidence ${Math.round(
    score.parts.L2 * 100,
  )}, signals ${Math.round(score.parts.L3 * 100)}`;
  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={label} className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg-soft ring-1 ring-inset ring-line">
        {(["L1", "L2", "L3"] as const).map((l) => (
          <span key={l} className={`h-full ${LAYER_BG[l]}`} style={{ width: `${score.parts[l] * 100}%` }} />
        ))}
      </div>
      <span aria-hidden className="w-7 text-right text-sm font-semibold tabular-nums text-ink">
        {pct}
      </span>
    </div>
  );
}

export function KpiCard({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: "human" | "good" | "wait" }) {
  const toneCls = tone === "human" ? "text-human" : tone === "good" ? "text-good" : tone === "wait" ? "text-wait" : "text-ink";
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${toneCls}`}>{value}</dd>
      <dd className="mt-1 text-xs text-muted">{hint}</dd>
    </div>
  );
}

/** Plain card with a heading; `id` links the heading to the section for screen readers. */
export function Panel({ id, title, aside, children, className }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`rounded-card border border-line bg-surface shadow-card ${className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 id={id} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
