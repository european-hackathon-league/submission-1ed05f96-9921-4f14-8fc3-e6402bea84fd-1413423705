"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, ExternalLink, FileText, Landmark, Quote, Radar, ShoppingCart, Users, BarChart3, Gavel } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_URL, pull } from "@/lib/api";
import { SOURCE_IDS, SOURCE_LABEL, buildEvidence, sourceChip, type SourceId } from "@/lib/pipeline/evidence";
import { usePrinciples, useAssessment, type Assessment } from "@/lib/pipeline/principles";
import { generationHref, pullSessions, readSessions, type Session } from "@/lib/pipeline/sessions";
import { pullDecisions } from "@/lib/pipeline/decision-log";
import { MARKET_SIGNALS } from "@/lib/pipeline/market-signals";
import { signalsFor, type Decisions, type Profile } from "@/lib/pipeline/profiles";
import { SERIES } from "@/lib/pipeline/series";
import { marketById } from "@/lib/markets";
import type { MarketScope } from "@/lib/dashboard-data";
import type { FeatureRequest, MarketSignal, SeriesData, SeriesId } from "@/lib/pipeline/types";

type Context = Record<string, Pick<SeriesData, "studies" | "sales"> & { recordIds: Record<string, string[]>; requests: FeatureRequest[] }>;

const SCOPES = ["EU", "US", "CN", "JP", "ALL"];

function readLocal<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

/** Draft mode: the requests of a market + series that are still being decided, shown like a one-profile generation. */
async function draftSession(scope: MarketScope, series: SeriesId, ctx: Context): Promise<Session> {
  const cfg = SERIES.find((s) => s.id === series)!;
  const scoped = (r: FeatureRequest) => (scope === "ALL" ? r.mentions : (r.byMarket[scope as keyof typeof r.byMarket] ?? 0));
  const all = ctx[series].requests;
  const inMarket = all.filter((r) => scoped(r) > 0);
  const base = inMarket.length ? inMarket : all;
  const order = readLocal<string[]>(`dixi:priority:${scope}:${series}`) ?? [];
  const sorted = [...base].sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    return scoped(b) - scoped(a);
  });
  const requests = sorted.map((r, i) => ({ ...r, scoped: inMarket.length ? scoped(r) : r.mentions, priority: i + 1 }));
  const live = readLocal<{ signals: MarketSignal[] }>(`dixi:research:${scope}:${series}`);
  const backing = signalsFor(live?.signals ?? MARKET_SIGNALS, series, scope);
  const decisions = (await pullDecisions(series, scope)) ?? readLocal<Decisions>(`dixi:decisions:${scope}:${series}`) ?? {};
  const profile = { id: "draft", name: "All requests (being decided)", tagline: "", requests, wishes: [], backing, why: [], score: { l1: 0, l2: 0, l3: null, total: 0 } } as Profile;
  return {
    id: "draft", createdAt: new Date().toISOString(), scope, scopeLabel: scope === "ALL" ? "all markets" : marketById(scope).name,
    series, seriesName: cfg.name, slug: cfg.slug, profiles: [profile], decisions, order: requests.map((r) => r.id), campaigns: null,
  };
}

const ICON: Record<SourceId, typeof FileText> = {
  "BMW-FEEDBACK": Users,
  "BMW-STUDIES": FileText,
  "BMW-SALES": BarChart3,
  "BMW-OPTIONS": ShoppingCart,
  RESEARCH: Radar,
  "L1-PRINCIPLES": Landmark,
  "PM-DECISIONS": Gavel,
};

function params() {
  const q = new URLSearchParams(window.location.search);
  return { generation: q.get("generation"), profile: q.get("profile"), source: q.get("source") };
}

/** Evidence page: every requirement of a profile with where its evidence comes from, filterable by source. */
export function EvidencePage({ context, origin }: { context: Context; origin: "bmw" | "example" }) {
  const [state, setState] = useState<{ gen: Session | null; profile: string | null; source: string | null } | null>(null);
  useEffect(() => {
    const { generation, profile, source } = params();
    const q = new URLSearchParams(window.location.search);
    const market = (q.get("market") ?? "").toUpperCase();
    const series = (q.get("series") ?? "").toUpperCase();
    if (!generation && SCOPES.includes(market) && context[series]) {
      draftSession(market as MarketScope, series as SeriesId, context).then((gen) => setState({ gen, profile: "draft", source }));
      return;
    }
    const local = readSessions().find((g) => g.id === generation);
    if (local) {
      const t = setTimeout(() => setState({ gen: local, profile, source }), 0);
      return () => clearTimeout(t);
    }
    pullSessions().then((all) => setState({ gen: all.find((g) => g.id === generation) ?? null, profile, source }));
  }, [context]);
  if (!state) return <div className="h-72 animate-pulse rounded-[20px] bg-bg-soft" />;
  if (!state.gen)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-ink">Generation not found</p>
        <p className="text-sm text-muted">Open the evidence from a profile page.</p>
        <Link href="/dashboard" className="text-sm font-medium text-brand hover:underline">
          All generations
        </Link>
      </div>
    );
  return <Evidence gen={state.gen} initialProfile={state.profile} initialSource={state.source} context={context} origin={origin} />;
}

function Evidence({
  gen,
  initialProfile,
  initialSource,
  context,
  origin,
}: {
  gen: Session;
  initialProfile: string | null;
  initialSource: string | null;
  context: Context;
  origin: "bmw" | "example";
}) {
  const [profileId, setProfileId] = useState(initialProfile ?? gen.profiles[0]?.id);
  const [source, setSource] = useState<SourceId | null>(
    (SOURCE_IDS as readonly string[]).includes((initialSource ?? "").replace(/-[FG]\d{2}$/, "")) ? ((initialSource ?? "").replace(/-[FG]\d{2}$/, "") as SourceId) : null,
  );
  const principles = usePrinciples(gen.scope, gen.series as SeriesId);
  const cached = useAssessment(gen.scope, gen.series as SeriesId, origin);
  /* The assessment this generation was built with (by id); else the cached one for its market + series. */
  const [linked, setLinked] = useState<Assessment | null>(null);
  useEffect(() => {
    if (!API_URL) return;
    let live = true;
    /* Draft (no linked run): the latest stored assessment for this market + series, if this browser has none cached. */
    if (!gen.assessmentId) {
      if (!cached.result)
        pull<Assessment | null>(`/assess/principles/latest?series=${gen.series}&market=${gen.scope}&dataset=${origin}`).then((a) => live && a && setLinked(a));
      return () => {
        live = false;
      };
    }
    pull<Assessment>(`/assess/principles/run/${gen.assessmentId}`).then((a) => live && setLinked(a));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.assessmentId, gen.series, gen.scope, origin]);
  /* With a linked run, wait for it rather than briefly showing a different (cached) assessment. */
  const assessment = gen.assessmentId && API_URL ? linked : (linked ?? cached.result);
  const fits = useMemo(() => new Map((assessment?.fits ?? []).map((f) => [f.requestId, f])), [assessment]);

  const profile = gen.profiles.find((p) => p.id === profileId) ?? gen.profiles[0];
  const data = context[gen.series];
  const cards = useMemo(
    () =>
      profile.requests.map((r) =>
        buildEvidence({ request: r.recordIds?.length ? r : { ...r, recordIds: data.recordIds[r.id] }, data, scope: gen.scope, signals: profile.backing, fit: fits.get(r.id), principles: principles ?? [], decision: gen.decisions[r.id] }),
      ),
    [profile, data, gen.scope, gen.decisions, fits, principles],
  );
  const counts = Object.fromEntries(SOURCE_IDS.map((s) => [s, cards.filter((c) => c.sources.includes(s)).length]));
  const draft = gen.id === "draft";

  /* #<request id> in the URL: scroll to that requirement once the cards are there. */
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [cards.length]);
  const shown = source ? cards.filter((c) => c.sources.includes(source)) : cards;

  const setUrl = (p: string, s: SourceId | null) => {
    const base: Record<string, string> = draft ? { market: gen.scope, series: gen.series } : { generation: gen.id, profile: p };
    const q = new URLSearchParams({ ...base, ...(s ? { source: sourceChip(s, gen.series) } : {}) });
    window.history.replaceState(null, "", `/dashboard/evidence?${q}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={draft ? `/dashboard/${gen.scope.toLowerCase()}/${gen.slug}` : generationHref(gen.id)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
          <ArrowLeft aria-hidden className="size-4" /> {draft ? `Back to the ${gen.seriesName} · ${gen.scopeLabel} pipeline` : `Back to generation ${gen.id}`}
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Evidence · {gen.seriesName} · {gen.scopeLabel} · {draft ? "draft (not built yet)" : gen.id}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Where the requirements come from</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every requirement of the profile with its sources: BMW feedback records, customer-study cells, sales, the option list, competitor and trend sources,
          the principle check and the PM&apos;s decision. Evidence and assumptions are listed separately; gaps are shown, not hidden.
          {origin === "example" && " This deployment runs on example data: record ids and workbook cells exist only with the local BMW data."}
        </p>
      </div>

      {!draft && <div className="flex flex-wrap items-center gap-2">
        {gen.profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === profile.id}
            onClick={() => {
              setProfileId(p.id);
              setUrl(p.id, source);
            }}
            className={`h-9 rounded-full px-4 text-sm font-medium ring-1 transition-colors ${p.id === profile.id ? "bg-ink text-white ring-ink" : "text-ink-soft ring-line hover:ring-brand/40"}`}
          >
            {p.name}
          </button>
        ))}
      </div>}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by source">
        <Chip active={source === null} onClick={() => (setSource(null), setUrl(profile.id, null))} label={`All · ${cards.length}`} />
        {SOURCE_IDS.map((s) => (
          <Chip
            key={s}
            active={source === s}
            disabled={counts[s] === 0}
            onClick={() => (setSource(s), setUrl(profile.id, s))}
            icon={ICON[s]}
            label={`${sourceChip(s, gen.series)} · ${counts[s]}`}
            title={SOURCE_LABEL[s]}
          />
        ))}
      </div>

      <ol className="flex flex-col gap-4">
        {shown.map((c) => (
          <li key={c.request.id} id={c.request.id} className="scroll-mt-24 rounded-card border border-line border-l-4 border-l-brand bg-surface p-5 shadow-card">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <FileText aria-hidden className="size-4" /> Requirement · {c.request.category}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
              {c.priority}. {c.request.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.observed}</p>

            <ul className="mt-4 flex flex-col gap-1.5 text-sm">
              {c.items
                .filter((i) => !source || i.source === source)
                .map((i, k) => {
                  const Icon = ICON[i.source];
                  return (
                    <li key={k} className="flex gap-2">
                      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                      <span className="min-w-0">
                        <span className={`mr-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] ${i.ref === "assumption" ? "bg-wait-soft text-ink" : "bg-bg-soft text-ink-soft"}`}>{i.ref}</span>
                        <span className="text-ink-soft">{i.text}</span>
                        {i.url && (
                          <a href={i.url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center text-brand hover:underline">
                            <ExternalLink aria-hidden className="size-3.5" />
                            <span className="sr-only">Open source</span>
                          </a>
                        )}
                      </span>
                    </li>
                  );
                })}
            </ul>

            {c.request.quotes.length > 0 && (!source || source === "BMW-FEEDBACK") && (
              <details className="mt-3 text-sm">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-brand">
                  <Quote aria-hidden className="size-3.5" /> Customer voice · {c.request.quotes.length} (local data only, never uploaded)
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5 border-l-2 border-line pl-3 text-ink-soft">
                  {c.request.quotes.map((q) => (
                    <li key={q}>“{q}”</li>
                  ))}
                </ul>
              </details>
            )}

            {c.gaps.length > 0 && !source && (
              <div className="mt-3 rounded-lg bg-bg-soft p-3 text-xs">
                <p className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <CircleHelp aria-hidden className="size-3.5" /> What we don&apos;t know
                </p>
                <ul className="mt-1 list-disc pl-5 text-muted">
                  {c.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {c.sources.map((s) => {
                const Icon = ICON[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => (setSource(s), setUrl(profile.id, s))}
                    className="inline-flex items-center gap-1 rounded-lg bg-bg-soft px-2.5 py-1 text-xs font-medium text-ink-soft hover:text-brand"
                  >
                    <Icon aria-hidden className="size-3.5" /> {sourceChip(s, gen.series)}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className="text-sm text-muted">No requirement of this profile has evidence from this source.</p>}
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  label,
  icon: Icon,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  icon?: typeof FileText;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] font-medium ring-1 transition-colors disabled:opacity-40 ${active ? "bg-brand text-white ring-brand" : "text-ink-soft ring-line hover:ring-brand/40"}`}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {label}
    </button>
  );
}
