/* Evidence behind a requirement: where every number comes from, per source, with exact references.
 *
 *   BMW-FEEDBACK-<series>  customer feedback export: mentions per market and type, channels, BMW taxonomy topics,
 *                          sample record ids (data script, scripts/build-pipeline-data.py)
 *   BMW-STUDIES            customer-study scores linked to the request (Dixi mapping below), with the workbook cell
 *   BMW-SALES              units per market, 2024 / 2025 / 2030 forecast (context for the market's weight)
 *   BMW-OPTIONS            today's option list entries related to the request (code, price)
 *   RESEARCH               competitor features and trends that back the request, with their public sources
 *   L1-PRINCIPLES          the principle assessor's fit, cited principle ids, evidence vs assumptions
 *   PM-DECISIONS           keep / reject with reason, who, when; decision memory
 * Pure functions: the page (components/pipeline/EvidencePage.tsx) supplies the data.
 */
import type { MarketScope } from "@/lib/dashboard-data";
import type { Decision } from "./profiles";
import type { RequestFit, Principle } from "./principles";
import type { FeatureRequest, MarketSignal, SeriesData } from "./types";

export const SOURCE_IDS = ["BMW-FEEDBACK", "BMW-STUDIES", "BMW-SALES", "BMW-OPTIONS", "RESEARCH", "L1-PRINCIPLES", "PM-DECISIONS"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABEL: Record<SourceId, string> = {
  "BMW-FEEDBACK": "Customer feedback",
  "BMW-STUDIES": "Customer studies",
  "BMW-SALES": "Sales",
  "BMW-OPTIONS": "Option list",
  RESEARCH: "Competitors & trends",
  "L1-PRINCIPLES": "BMW principles",
  "PM-DECISIONS": "PM decisions",
};

/** Which customer-study attributes speak to which request (Dixi mapping, by title; reviewed by hand, not inferred). */
export const STUDY_LINKS: Record<string, string[]> = {
  "More real-world electric range": ["Fuel economy/ energy efficiency", "Economical to own (cost of ownership)"],
  "Easier, more reliable charging": ["Fuel economy/ energy efficiency"],
  "More responsive, efficient powertrain": ["Overall driving performance", "Fuel economy/ energy efficiency", "Sportiness"],
  "Simpler iDrive menus and touchscreen": ["Menu structure of infotainment system", "Intuitiveness of controls"],
  "Easier everyday vehicle functions": ["Intuitiveness of controls", "Menu structure of infotainment system"],
  "Faster, more stable infotainment": ["Menu structure of infotainment system", "Connected services"],
  "Working eSIM and in-car Wi-Fi": ["Connected services"],
  "A more reliable My BMW app": ["Connected services"],
  "Smarter navigation and route planning": ["Connected services"],
  "Better phone connectivity (CarPlay, Bluetooth)": ["Connected services"],
  "Clearer instrument cluster and head-up display": ["Intuitiveness of controls"],
  "Drive modes and profiles that remember settings": ["Ease of customization", "If applicable: Ease of customization"],
  "More comfortable, better-equipped seats": ["Comfort of 2nd row seat", "Front seat roominess", "Driving position"],
  "Stronger climate control with easy controls": ["Heating/ ventilation/ air conditioning", "Operation of heater/ AC controls"],
  "Higher-quality interior finish": ["Overall build quality"],
  "More storage and luggage space": ["Luggage capacity", "Interior storage for small items", "Ease of loading/ unloading luggage"],
  "A dependable hands-free tailgate": ["Ease of loading/ unloading luggage"],
  "Better ride comfort and handling balance": ["Riding comfort", "Quality of ride", "Handling/Maneuverability", "Roadholding"],
  "Smoother, quieter brakes": ["Braking", "Quietness when driving"],
  "Tougher wheels and a spare-tyre option": ["If applicable: Flat tire preparedness (spare, run flat, etc.)"],
  "More standard equipment for the price": ["Level of equipment", "Value for money", "Price/deal offered"],
  "Reliable keys and keyless entry": ["Reliability"],
  "Doors that open and close easily": ["Overall build quality"],
  "Better visibility: mirrors, glass and wipers": ["Driving position"],
  "Easier parking with better cameras": ["Handling/Maneuverability"],
};

export interface EvidenceItem {
  source: SourceId;
  /** Short reference a reviewer can look up: record ids, workbook cell, option code, URL, principle id, decision time. */
  ref: string;
  text: string;
  url?: string;
}

export interface RequirementEvidence {
  request: FeatureRequest;
  priority: number;
  scoped: number;
  observed: string;
  items: EvidenceItem[];
  sources: SourceId[];
  gaps: string[];
}

const pct = (n: number, total: number) => `${Math.round((100 * n) / Math.max(1, total))}%`;

export function buildEvidence(args: {
  request: FeatureRequest & { scoped: number; priority: number };
  data: Pick<SeriesData, "studies" | "sales">;
  scope: MarketScope;
  signals: MarketSignal[];
  fit?: RequestFit;
  principles: Principle[];
  decision?: Decision;
}): RequirementEvidence {
  const { request: r, data, scope, signals, fit, principles, decision } = args;
  const items: EvidenceItem[] = [];
  const gaps: string[] = [];
  const market = scope === "ALL" ? "all markets" : scope;

  /* BMW feedback */
  const totalT = r.types.wants + r.types.difficult + r.types.defect;
  const markets = Object.entries(r.byMarket).filter(([, n]) => (n ?? 0) > 0).map(([m, n]) => `${m} ${n}`).join(", ");
  items.push({
    source: "BMW-FEEDBACK",
    ref: r.recordIds?.length ? `${r.recordIds.slice(0, 4).join(", ")}${r.mentions > 4 ? ` +${r.mentions - 4}` : ""}` : `${r.mentions} records`,
    text: `${r.mentions} unique records (${markets}); ${pct(r.types.wants, totalT)} wishes, ${pct(r.types.difficult, totalT)} hard to use, ${pct(r.types.defect, totalT)} defects. Channels: ${r.sources.map((s) => `${s.name} ${s.count}`).join(", ")}. BMW taxonomy: ${r.taxonomy.join("; ")}.`,
  });
  if (scope !== "ALL" && !r.byMarket[scope as keyof typeof r.byMarket]) gaps.push(`No customer comments for this request in ${scope}: the count shown falls back to all markets.`);
  if (r.mentions < 20) gaps.push(`Thin sample: ${r.mentions} records in total.`);

  /* Customer studies */
  const attrs = STUDY_LINKS[r.title] ?? [];
  const studies = data.studies.filter((s) => attrs.includes(s.attribute) && (scope === "ALL" || s.market === scope));
  studies.forEach((s) =>
    items.push({ source: "BMW-STUDIES", ref: s.ref ?? "customer study", text: `${s.market} · ${s.attribute}: ${s.score.toFixed(1)} / 10${s.market === "US" ? " (US 1–7 scale converted ×10/7)" : ""}.` }),
  );
  if (!attrs.length) gaps.push("No customer-study attribute is mapped to this request.");
  else if (!studies.length) gaps.push(`The customer study has no score for ${attrs.join(" / ")} in ${market}.`);

  /* Sales */
  const sales = data.sales.filter((s) => scope === "ALL" || s.market === scope);
  sales.forEach((s) =>
    items.push({ source: "BMW-SALES", ref: `sales ${s.market}`, text: `${s.market}: ${s.y2024?.toLocaleString("en") ?? "–"} (2024), ${s.y2025?.toLocaleString("en") ?? "–"} (2025), ${s.y2030?.toLocaleString("en") ?? "–"} forecast (2030) units of the ${r.series}.` }),
  );

  /* Option list */
  r.relatedOptions.forEach((o) =>
    items.push({ source: "BMW-OPTIONS", ref: `option ${o.code}`, text: `${o.name} (${o.group})${o.priceEur !== null ? `, € ${o.priceEur.toLocaleString("en")}` : ", standard / included"}: already on today's price list.` }),
  );

  /* Competitors and trends */
  const backing = signals.filter((s) => s.relatesTo.includes(r.title));
  backing.forEach((s) =>
    s.sources.forEach((src, i) =>
      items.push({ source: "RESEARCH", ref: i === 0 ? s.title : src.label, url: src.url, text: i === 0 ? `${s.kind === "competitor" ? s.competitor : "Trend"} · ${s.strength}: ${s.detail} Source: ${src.label}.` : `Also: ${src.label}.` }),
    ),
  );
  if (!backing.length) gaps.push("No competitor feature or trend backs this request.");

  /* L1 principles */
  if (fit) {
    const name = (id: string) => principles.find((p) => p.id === id)?.title ?? "";
    items.push({ source: "L1-PRINCIPLES", ref: `fit ${Math.round(fit.fit * 100)}`, text: fit.rationale });
    fit.supports.forEach((id) => items.push({ source: "L1-PRINCIPLES", ref: id, text: `Supports: ${name(id)}` }));
    fit.tensions.forEach((id) => items.push({ source: "L1-PRINCIPLES", ref: id, text: `Strains: ${name(id)}` }));
    fit.evidence.forEach((e) => items.push({ source: "L1-PRINCIPLES", ref: "evidence", text: e }));
    fit.assumptions.forEach((e) => items.push({ source: "L1-PRINCIPLES", ref: "assumption", text: `Assumed, not shown: ${e}` }));
  } else gaps.push("Principles were not assessed for this request.");

  /* PM decision */
  if (decision)
    items.push({
      source: "PM-DECISIONS",
      ref: new Date(decision.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      text: `${decision.action === "keep" ? "Kept" : decision.action === "reject" ? "Rejected" : "Wishlisted"} by ${decision.by}${decision.role ? ` (${decision.role})` : ""}${decision.reason ? `: “${decision.reason}”` : ""}${decision.mentionsAt !== undefined ? ` · ${decision.mentionsAt} mentions at the time` : ""}.`,
    });

  const studyTxt = studies.length ? ` Study: ${studies.map((s) => `${s.attribute} ${s.score.toFixed(1)} (${s.ref ?? "study"})`).join("; ")}.` : "";
  const observed = `Observed: ${r.scoped} records in ${market} (across all markets ${pct(r.types.difficult + r.types.defect, totalT)} report problems, ${pct(r.types.wants, totalT)} wishes)${r.recordIds?.length ? `, e.g. ${r.recordIds.slice(0, 3).join(", ")}` : ""}.${studyTxt}${backing.length ? ` Backed by ${backing.map((s) => s.title).join(", ")}.` : ""}${fit ? ` Principle fit ${Math.round(fit.fit * 100)}${fit.tensions.length ? `, strains ${fit.tensions.join(", ")}` : ""}.` : ""}`;

  const sources = [...new Set(items.map((i) => i.source))];
  return { request: r, priority: r.priority, scoped: r.scoped, observed, items, sources, gaps };
}

export const sourceChip = (s: SourceId, series: string) => (s === "BMW-FEEDBACK" ? `BMW-FEEDBACK-${series}` : s);
export const evidenceHref = (generationId: string, profileId: string, requestId?: string) =>
  `/dashboard/evidence?generation=${encodeURIComponent(generationId)}&profile=${encodeURIComponent(profileId)}${requestId ? `#${encodeURIComponent(requestId)}` : ""}`;
/** Draft evidence: the requests of a market + series that are still being decided (no generation yet). */
export const draftEvidenceHref = (market: string, series: string, requestId?: string) =>
  `/dashboard/evidence?market=${encodeURIComponent(market)}&series=${encodeURIComponent(series)}${requestId ? `#${encodeURIComponent(requestId)}` : ""}`;
