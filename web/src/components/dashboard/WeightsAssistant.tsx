"use client";

import { Check, Loader2, MessageSquareText, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ScoringSettings } from "@/lib/pipeline/scoring";
import { saveScoring, useScoring } from "@/lib/pipeline/scoring-store";
import { SETTING_LABEL, type ScoringAdvice } from "@/lib/pipeline/scoring-advice";
import { currentUser } from "@/lib/user";

const EXAMPLES = [
  "For the 7 Series, past rejects should count for two years and hardly ever come back.",
  "Customer demand matters most; competitors and trends should count less.",
  "Give rejected ideas another chance if demand grows 20%.",
  "Use memory from all markets and put more weight on BMW principles.",
];

export interface ScoringChange {
  at: string;
  by: string;
  role?: string;
  instruction: string;
  source: "ai" | "rules";
  model?: string;
  changes: string[];
}

const LOG_KEY = "dixi:scoring-log";
const readLog = (): ScoringChange[] => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as ScoringChange[];
  } catch {
    return [];
  }
};

const fmt = (k: keyof ScoringSettings, v: ScoringSettings[keyof ScoringSettings]) =>
  typeof v === "boolean" ? (v ? "on" : "off") : k === "halfLifeDays" ? `${v} d` : k === "memoryScope" ? String(v) : `${Math.round(Number(v) * 100)}%`;

/** "Tell Dixi in your words": a manager writes an instruction, the AI proposes settings, the manager applies them. */
export function WeightsAssistant() {
  const current = useScoring();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<ScoringAdvice | null>(null);
  const [asked, setAsked] = useState("");
  const [log, setLog] = useState<ScoringChange[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setLog(readLog()), 0);
    return () => clearTimeout(t);
  }, []);

  const ask = async () => {
    setBusy(true);
    setError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/scoring-advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, current }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setAdvice(data as ScoringAdvice);
      setAsked(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!advice) return;
    saveScoring(advice.settings);
    const who = currentUser();
    const entry: ScoringChange = { at: new Date().toISOString(), by: who.name, role: who.role, instruction: asked, source: advice.source, model: advice.model, changes: advice.changes };
    const next = [entry, ...readLog()].slice(0, 20);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
    setLog(next);
    setAdvice(null);
    setText("");
  };

  const diff = advice ? (Object.keys(SETTING_LABEL) as (keyof ScoringSettings)[]).filter((k) => advice.settings[k] !== current[k]) : [];

  return (
    <section className="rounded-card border border-brand/30 bg-brand-soft/40 p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles aria-hidden className="size-4 text-brand" /> Tell Dixi in your words
      </h2>
      <p className="mt-0.5 text-xs text-muted">Describe how requests should be ranked. The AI proposes the settings; nothing changes until you apply it.</p>

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3 && !busy) ask();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={1000}
          aria-label="Instruction for the scoring"
          placeholder="e.g. Past rejects should count for two years, and competitors matter more than trends for the 5 Series."
          className="resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" onClick={() => setText(x)} className="rounded-full bg-surface px-2.5 py-1 text-left text-xs text-ink-soft ring-1 ring-line hover:ring-brand/40">
              {x}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy || text.trim().length < 3}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full bg-brand px-5 text-sm font-medium text-white shadow-card hover:bg-brand-deep disabled:opacity-40"
        >
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Sparkles aria-hidden className="size-4" />}
          {busy ? "Thinking…" : "Suggest settings"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {advice && (
        <div aria-live="polite" className="mt-4 rounded-card border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Proposal · {advice.source === "ai" ? `AI (${advice.model})` : "keyword rules"}
          </p>
          {advice.summary && <p className="mt-1 text-sm text-ink">{advice.summary}</p>}
          {diff.length > 0 ? (
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="text-left font-normal">Setting</th>
                  <th className="text-right font-normal">Now</th>
                  <th className="text-right font-normal">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((k) => (
                  <tr key={k} className="border-t border-line">
                    <td className="py-1.5 text-ink-soft">{SETTING_LABEL[k]}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted">{fmt(k, current[k])}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-ink">{fmt(k, advice.settings[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-muted">No setting would change.</p>
          )}
          <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-soft">
            {advice.changes.map((c) => (
              <li key={c} className="flex gap-1.5">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand" />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={diff.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-40"
            >
              <Check aria-hidden className="size-4" /> Apply
            </button>
            <button type="button" onClick={() => setAdvice(null)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm text-ink-soft ring-1 ring-line hover:bg-bg-soft">
              <X aria-hidden className="size-4" /> Discard
            </button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <MessageSquareText aria-hidden className="size-3.5" /> Change log
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
            {log.slice(0, 5).map((l) => (
              <li key={l.at} className="px-3 py-2 text-xs">
                <p className="text-ink">“{l.instruction}”</p>
                <p className="mt-0.5 text-muted">
                  {l.by}
                  {l.role && ` (${l.role})`} · {new Date(l.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {l.source === "ai" ? `AI ${l.model ?? ""}` : "rules"} ·{" "}
                  {l.changes.length} change{l.changes.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
