"use client";

import { History, RotateCcw, Scale, TrendingUp } from "lucide-react";
import { DEFAULT_SCORING, scoreRequest, type MemoryEntry, type ScoringSettings } from "@/lib/pipeline/scoring";
import { API_URL } from "@/lib/api";
import { saveScoring, useScoring } from "@/lib/pipeline/scoring-store";
import type { FeatureRequest } from "@/lib/pipeline/types";
import { WeightsAssistant } from "./WeightsAssistant";

/* One example request, scored live with the current settings. Made up for illustration. */
const EXAMPLE: FeatureRequest = {
  id: "X-R01",
  series: "G60",
  title: "Example request",
  category: "Digital",
  summary: "",
  mentions: 80,
  byMarket: {},
  types: { wants: 40, difficult: 30, defect: 10 },
  sources: [],
  quotes: [],
  taxonomy: [],
  relatedOptions: [],
};
const DAY = 86_400_000;
/* Fixed reference time so the example renders the same on server and client. */
const NOW = Date.parse("2026-10-10T12:00:00Z");
const mem = (daysAgo: number, mentionsAt: number, action: "keep" | "reject" = "reject") =>
  new Map<string, MemoryEntry>([
    [
      "G60:example request",
      { action, reason: "Example reason", by: "Example PM", at: new Date(NOW - daysAgo * DAY).toISOString(), mentionsAt, generationId: "G-EXAMPLE", scopeLabel: "USA" },
    ],
  ]);

export function ScoringSettingsForm() {
  const s = useScoring();
  const set = (patch: Partial<ScoringSettings>) => saveScoring({ ...s, ...patch });
  const wSum = s.wDemand + s.wBacking + s.wFit || 1;

  const run = (m: Map<string, MemoryEntry>, mentions = 80) => scoreRequest({ ...EXAMPLE, mentions }, mentions, 120, 1, ["Digital"], m, s, NOW);
  const cases = [
    { label: "No past decision", r: run(new Map()) },
    { label: "Rejected today", r: run(mem(0, 80)) },
    { label: `Rejected ${s.halfLifeDays} days ago`, r: run(mem(s.halfLifeDays, 80)) },
    { label: `Rejected today, demand +${Math.round(s.resurfaceAt * 100)}% since`, r: run(mem(0, Math.floor(80 / (1 + s.resurfaceAt)))) },
    { label: "Kept before", r: run(mem(0, 80, "keep")) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <WeightsAssistant />
        <Card icon={<Scale aria-hidden className="size-4" />} title="Base score" note="Weighted mean of three parts, shown as 0–100 on every request.">
          <Slider label="Demand: how many customers ask (log scale)" value={s.wDemand} onChange={(v) => set({ wDemand: v })} share={s.wDemand / wSum} />
          <Slider label="Market backing: competitors and trends that support it" value={s.wBacking} onChange={(v) => set({ wBacking: v })} share={s.wBacking / wSum} />
          <Slider label="Principle fit: matches the series' focus" value={s.wFit} onChange={(v) => set({ wFit: v })} share={s.wFit / wSum} />
        </Card>

        <Card icon={<History aria-hidden className="size-4" />} title="Decision memory" note="Past keep and reject decisions from earlier generations of the same series.">
          <Slider label="Penalty for a past reject" value={s.rejectPenalty} onChange={(v) => set({ rejectPenalty: v })} display={`−${Math.round(s.rejectPenalty * 100)}%`} />
          <Slider label="Bonus for a past keep" value={s.keepBonus} onChange={(v) => set({ keepBonus: v })} display={`+${Math.round(s.keepBonus * 10)} pts`} />
          <Slider
            label="Memory half-life: after this, a decision counts half"
            value={s.halfLifeDays}
            min={30}
            max={1095}
            step={15}
            onChange={(v) => set({ halfLifeDays: v })}
            display={`${s.halfLifeDays} days`}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-ink-soft">Use memory from</span>
            <div role="group" className="inline-flex self-start rounded-full bg-bg-soft p-1 ring-1 ring-line">
              {(["market", "all"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={s.memoryScope === m}
                  onClick={() => set({ memoryScope: m })}
                  className={`rounded-full px-3 py-1 text-sm ${s.memoryScope === m ? "bg-surface font-medium text-ink shadow-card" : "text-muted"}`}
                >
                  {m === "market" ? "Same market" : "All markets"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm text-ink-soft">
            Hide requests rejected before (instead of ranking them lower)
            <input type="checkbox" checked={s.hideRejected} onChange={(e) => set({ hideRejected: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          </label>
        </Card>

        <Card icon={<TrendingUp aria-hidden className="size-4" />} title="Resurfacing" note="When the market changes, a rejected request can come back.">
          <Slider
            label="Demand growth since the reject that lifts the penalty"
            value={s.resurfaceAt}
            min={0.1}
            max={1.5}
            step={0.05}
            onChange={(v) => set({ resurfaceAt: v })}
            display={`+${Math.round(s.resurfaceAt * 100)}%`}
          />
        </Card>

        <button
          type="button"
          onClick={() => saveScoring(DEFAULT_SCORING, { source: "reset" })}
          className="inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 text-sm text-ink-soft ring-1 ring-line hover:bg-bg-soft"
        >
          <RotateCcw aria-hidden className="size-4" /> Reset to defaults
        </button>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-ink">Live example</h2>
          <p className="mt-0.5 text-xs text-muted">One made-up request, scored with these settings.</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {cases.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 py-2">
                <span className="text-ink-soft">{c.label}</span>
                <span className={`font-semibold tabular-nums ${c.r.state === "rejected" ? "text-bad" : c.r.state === "resurfaced" ? "text-wait" : "text-ink"}`}>
                  {c.r.hidden ? "hidden" : c.r.score}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-card border border-line bg-bg-soft p-5 text-xs leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">The formula</p>
          <p className="mt-1 font-mono">base = (wD·demand + wB·backing + wF·fit) / (wD+wB+wF)</p>
          <p className="font-mono">strength = 0.5 ^ (days / half-life)</p>
          <p className="font-mono">reject: score = base × (1 − penalty × strength)</p>
          <p className="font-mono">resurfaced (growth ≥ threshold): score = base</p>
          <p className="font-mono">keep: score = base + 10 × bonus × strength</p>
          <p className="mt-2">
            {API_URL
              ? "Applied settings are saved in Supabase with a change log (who, how, before → after). The backend uses the same formula for decision memory, and the principle assessor supplies the fit."
              : "Saved in this browser (no backend connected). With the backend, settings and their change log are stored in Supabase."}
          </p>
        </section>
      </aside>
    </div>
  );
}

function Card({ icon, title, note, children }: { icon: React.ReactNode; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  share,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  share?: number;
  display?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm text-ink-soft">
        {label}
        <span className="shrink-0 font-semibold tabular-nums text-ink">{display ?? `${Math.round((share ?? value) * 100)}%`}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
    </label>
  );
}
