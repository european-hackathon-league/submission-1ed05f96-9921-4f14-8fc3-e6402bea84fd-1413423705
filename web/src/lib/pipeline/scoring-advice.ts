/* Natural-language scoring settings: shared contract between the Settings page and /api/scoring-advice.
 * The AI (or the keyword fallback) only PROPOSES settings; a manager applies them, and every change is logged.
 */
import { DEFAULT_SCORING, type ScoringSettings } from "./scoring";

export interface ScoringAdvice {
  settings: ScoringSettings;
  /** One short sentence per changed setting, in plain words. */
  changes: string[];
  /** One or two sentences for the manager. */
  summary: string;
  source: "ai" | "rules";
  model?: string;
}

export const LIMITS: Record<keyof Omit<ScoringSettings, "hideRejected" | "memoryScope">, [number, number]> = {
  wDemand: [0, 1],
  wBacking: [0, 1],
  wFit: [0, 1],
  rejectPenalty: [0, 1],
  keepBonus: [0, 1],
  halfLifeDays: [30, 1095],
  resurfaceAt: [0.1, 1.5],
};

/** Keep any proposal inside the allowed ranges, whatever the model returns. */
export function clampSettings(s: Partial<ScoringSettings>, base: ScoringSettings): ScoringSettings {
  const out: ScoringSettings = { ...base };
  for (const [k, [lo, hi]] of Object.entries(LIMITS) as [keyof typeof LIMITS, [number, number]][]) {
    const v = Number(s[k]);
    if (Number.isFinite(v)) out[k] = Math.min(hi, Math.max(lo, k === "halfLifeDays" ? Math.round(v) : Math.round(v * 100) / 100));
  }
  if (typeof s.hideRejected === "boolean") out.hideRejected = s.hideRejected;
  if (s.memoryScope === "market" || s.memoryScope === "all") out.memoryScope = s.memoryScope;
  if (out.wDemand + out.wBacking + out.wFit === 0) Object.assign(out, { wDemand: DEFAULT_SCORING.wDemand, wBacking: DEFAULT_SCORING.wBacking, wFit: DEFAULT_SCORING.wFit });
  return out;
}

export const SETTING_LABEL: Record<keyof ScoringSettings, string> = {
  wDemand: "Demand weight",
  wBacking: "Market backing weight",
  wFit: "Principle fit weight",
  rejectPenalty: "Penalty for a past reject",
  keepBonus: "Bonus for a past keep",
  halfLifeDays: "Memory half-life (days)",
  resurfaceAt: "Resurface threshold",
  hideRejected: "Hide rejected requests",
  memoryScope: "Memory scope",
};

/** Keyword fallback when no AI key is available (e.g. a public deployment). Deliberately simple and predictable. */
export function adviseByRules(text: string, current: ScoringSettings): ScoringAdvice {
  const t = text.toLowerCase();
  const s: ScoringSettings = { ...current };
  const changes: string[] = [];
  const more = /(more|higher|stronger|increase|matter|important|focus|prioriti[sz]e)/;
  const less = /(less|lower|weaker|decrease|ignore|don't|do not|barely|reduce)/;
  const near = (word: RegExp, dir: RegExp) => new RegExp(`${dir.source}[^.]{0,40}${word.source}|${word.source}[^.]{0,40}${dir.source}`).test(t);
  const bump = (k: "wDemand" | "wBacking" | "wFit", up: boolean, why: string) => {
    s[k] = Math.max(0.05, Math.min(1, s[k] + (up ? 0.2 : -0.15)));
    changes.push(`${SETTING_LABEL[k]} ${up ? "up" : "down"}: ${why}.`);
  };
  const demand = /(customer|demand|feedback|volume|people ask)/;
  const backing = /(competit|trend|market signal|benchmark)/;
  const fit = /(principle|brand|fundamental|dna|focus)/;
  if (near(demand, more)) bump("wDemand", true, "customer demand should count more");
  else if (near(demand, less)) bump("wDemand", false, "customer demand should count less");
  if (near(backing, more)) bump("wBacking", true, "competitors and trends should count more");
  else if (near(backing, less)) bump("wBacking", false, "competitors and trends should count less");
  if (near(fit, more)) bump("wFit", true, "BMW principles should count more");
  else if (near(fit, less)) bump("wFit", false, "BMW principles should count less");
  if (/(never|don't|do not).{0,30}(again|re-?propose|show).{0,30}reject|hide.{0,20}reject/.test(t)) {
    s.hideRejected = true;
    changes.push("Hide rejected requests: on, so past rejects are not shown again.");
  } else if (/reject/.test(t) && near(/reject/, more)) {
    s.rejectPenalty = Math.min(1, s.rejectPenalty + 0.2);
    changes.push("Penalty for a past reject up: rejects should weigh more.");
  } else if (/reject/.test(t) && near(/reject/, less)) {
    s.rejectPenalty = Math.max(0, s.rejectPenalty - 0.2);
    changes.push("Penalty for a past reject down: give rejected ideas another chance.");
  }
  const years = t.match(/(\d+(?:\.\d+)?)\s*(year|month|day)/);
  if (years && /(forget|memory|remember|count|last|half)/.test(t)) {
    const n = Number(years[1]);
    s.halfLifeDays = Math.round(years[2] === "year" ? n * 365 : years[2] === "month" ? n * 30 : n);
    changes.push(`Memory half-life set to about ${s.halfLifeDays} days.`);
  }
  const pct = t.match(/(\d+)\s*%/);
  if (pct && /(grow|resurface|come back|increase)/.test(t)) {
    s.resurfaceAt = Number(pct[1]) / 100;
    changes.push(`Resurface when demand grows ${pct[1]}% or more.`);
  }
  if (/(all|every|other) markets?/.test(t)) {
    s.memoryScope = "all";
    changes.push("Use decision memory from all markets.");
  }
  const settings = clampSettings(s, current);
  return {
    settings,
    changes: changes.length ? changes : ["No clear change found. Try naming what should count more or less (demand, competitors and trends, principles, past rejects)."],
    summary: changes.length ? "Keyword-based suggestion (no AI key on this server). Check it before applying." : "Nothing changed.",
    source: "rules",
  };
}
