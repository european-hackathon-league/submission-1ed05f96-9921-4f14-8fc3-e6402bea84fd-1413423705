"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, ExternalLink, FileSearch, Info, Star, Trophy } from "lucide-react";
import { useState } from "react";
import type { CarImage } from "@/lib/car-images";
import { draftTarget, type Decisions, type Profile } from "@/lib/pipeline/profiles";
import type { SeriesConfig } from "@/lib/pipeline/series";
import type { Session } from "@/lib/pipeline/sessions";
import { CATEGORIES, type FeatureRequest, type MarketSignal } from "@/lib/pipeline/types";
import { PROFILE_COLOR } from "./Analytics";
import { CATEGORY_ICON, SIGNAL_ICON } from "./icons";
import { GenerationChat } from "./GenerationChat";
import { evidenceHref } from "@/lib/pipeline/evidence";
import { RequestDetails } from "./RequestCard";

const layerParts = (score: Profile["score"], l3Weight: number) => {
  const w3 = score.l3 === null ? 0 : l3Weight;
  const w1 = 0.45 * (1 - w3);
  const w2 = 1 - w1 - w3;
  return [
    { id: "L1", cls: "bg-l1", v: w1 * score.l1, label: "principles" },
    { id: "L2", cls: "bg-l2", v: w2 * score.l2, label: "evidence" },
    { id: "L3", cls: "bg-l3", v: w3 * (score.l3 ?? 0), label: "social test" },
  ];
};

/** Stacked bar: how much each layer contributes to a profile's score. */
export function LayerScore({ score, l3Weight, dark }: { score: Profile["score"]; l3Weight: number; dark?: boolean }) {
  const parts = layerParts(score, l3Weight);
  const pct = Math.round(score.total * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        role="img"
        aria-label={`Score ${pct} of 100: ${parts.map((p) => `${p.label} ${Math.round(p.v * 100)}`).join(", ")}`}
        className={`flex h-2 flex-1 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-bg-soft ring-1 ring-inset ring-line"}`}
      >
        {parts.map((p) => (
          <span key={p.id} className={`h-full ${dark && p.id === "L1" ? "bg-brand-sky" : p.cls}`} style={{ width: `${p.v * 100}%` }} />
        ))}
      </div>
      <span aria-hidden className={`w-7 text-right text-sm font-semibold tabular-nums ${dark ? "text-white" : "text-ink"}`}>
        {pct}
      </span>
    </div>
  );
}

const letter = (i: number) => String.fromCharCode(65 + i);
const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Price in the option-list style: 1.900,– */
const listPrice = (n: number | null) => (n === null ? "–,–" : `${n.toLocaleString("de-DE")},–`);

/* ---------- dashboard cards ---------- */

export function ProfileList({ profiles, cfg, image, onOpen }: { profiles: Profile[]; cfg: SeriesConfig; image?: CarImage; onOpen: (id: string) => void }) {
  return (
    <ul className="grid gap-5 lg:grid-cols-3">
      {profiles.map((p, i) => {
        const color = PROFILE_COLOR[p.id];
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-[22px] bg-ink text-left text-white shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-float motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                {image && (
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                  />
                )}
                {/* tint the photo in the profile's colour, then fade into the card */}
                <div aria-hidden className="absolute inset-0 opacity-35 mix-blend-color" style={{ backgroundColor: color.stroke }} />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tracking-wider ring-1 ring-white/20 backdrop-blur-md">
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                  PROFILE {letter(i)}
                </span>
                {i === 0 && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">
                    <Trophy aria-hidden className="size-3.5 text-brand" /> Best fit
                  </span>
                )}
              </div>

              <div className="-mt-4 flex flex-1 flex-col gap-4 p-5 pt-0">
                <div className="relative">
                  <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
                  <p className="text-sm text-white/65">{p.tagline}</p>
                </div>
                <LayerScore score={p.score} l3Weight={cfg.l3Weight} dark />
                <ul className="flex flex-col gap-2 text-sm">
                  {p.requests.slice(0, 4).map((r) => {
                    const Icon = CATEGORY_ICON[r.category];
                    return (
                      <li key={r.id} className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <Icon aria-hidden className="size-3.5 text-brand-sky" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-white/85">{r.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-white/45">#{r.priority}</span>
                      </li>
                    );
                  })}
                  {p.wishes.map((w) => (
                    <li key={w.id} className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                        <Star aria-hidden className="size-3.5 text-brand-sky" fill="currentColor" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-white/85">{w.title}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex h-10 items-center justify-between rounded-full bg-white px-4 text-sm font-medium text-ink transition-colors group-hover:bg-brand group-hover:text-white">
                  Open profile
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- profile page: laid out like BMW's option-list catalogue ---------- */

export function ProfileDetail({
  profile,
  profiles,
  rank,
  cfg,
  scopeLabel,
  decisions,
  session,
  image,
  onBack,
}: {
  profile: Profile;
  /** All profiles of the session, for the comparison columns. */
  profiles: Profile[];
  rank: number;
  cfg: SeriesConfig;
  scopeLabel: string;
  decisions: Decisions;
  session: Session;
  image?: CarImage;
  onBack: () => void;
}) {
  const color = PROFILE_COLOR[profile.id];
  const [trace, setTrace] = useState<(FeatureRequest & { priority: number }) | null>(null);
  const included = new Set(profile.requests.map((r) => r.id));
  const all = Object.values(decisions);
  const rejected = all.filter((d) => d.action === "reject");
  const keptOut = all.filter((d) => d.action === "keep" && !included.has(d.requestId));

  /* Every requirement of the session, so the matrix compares this profile with the others. */
  const union = new Map<string, FeatureRequest & { scoped: number; priority: number }>();
  profiles.forEach((p) => p.requests.forEach((r) => union.set(r.id, r)));
  const rows = [...union.values()].sort((a, b) => a.priority - b.priority);
  const wishes = new Map<string, MarketSignal>();
  profiles.forEach((p) => p.wishes.forEach((w) => wishes.set(w.id, w)));

  const options = profile.requests.flatMap((r) => r.relatedOptions);
  const optionTotal = options.reduce((s, o) => s + (o.priceEur ?? 0), 0);
  const covered = profile.requests.reduce((s, r) => s + r.scoped, 0);
  const signals = [...profile.wishes.map((s) => ({ s, wish: true })), ...profile.backing.filter((b) => !profile.wishes.includes(b)).map((s) => ({ s, wish: false }))];
  const date = new Date(session.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
  const seriesNo = cfg.name.split(" ")[0];

  const mark = (p: Profile, id: string, isWish = false) => {
    const has = isWish ? p.wishes.some((w) => w.id === id) : p.requests.some((r) => r.id === id);
    if (!has) return <span className="text-line">–</span>;
    return p.id === profile.id ? <span title="In this profile">■</span> : <span title="In another profile" className="text-muted">□</span>;
  };

  return (
    <div className="flex flex-col gap-5">
      <div data-no-print className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
          <ArrowLeft aria-hidden className="size-4" /> All profiles
        </button>
        <div className="flex items-center gap-2">
        <Link
          href={evidenceHref(session.id, profile.id)}
          className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition-colors hover:text-brand hover:ring-brand/40"
        >
          <FileSearch aria-hidden className="size-4" /> Evidence
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          title="Opens the print dialog: choose “Save as PDF”"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-deep"
        >
          <Download aria-hidden className="size-4" /> Download PDF
        </button>
        </div>
      </div>

      <RequestDetails
        req={trace}
        signals={trace ? [...profile.backing, ...profile.wishes].filter((sg) => sg.relatesTo.includes(trace.title)) : []}
        decision={trace ? decisions[trace.id] : undefined}
        priority={trace?.priority}
        onClose={() => setTrace(null)}
      />

      <article data-print-root className="flex flex-col gap-12 rounded-[22px] border border-line bg-surface pb-10 shadow-card print:border-0">
        {/* Cover */}
        <header className="relative isolate min-h-[440px] overflow-hidden rounded-t-[22px] bg-ink text-white">
          {image && <Image src={image.src} alt={image.alt} fill loading="eager" sizes="(min-width: 1024px) 70vw, 100vw" className="-z-10 object-cover" />}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/30 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
          <div className="flex min-h-[440px] flex-col justify-between p-8 sm:p-10">
            <div>
              <p className="text-6xl font-light tracking-tight sm:text-7xl">BMW {seriesNo}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">
                Profile {letter(rank)} · {profile.name}
              </p>
              <p className="mt-4 max-w-sm text-white/75">{profile.tagline}</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.2em]">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color.stroke }} />
                  {scopeLabel} · {date}
                </span>
                <span className="text-white/55">
                  Dixi requirement profile · Generation {session.id}
                  {session.createdBy && ` · ${session.createdBy}${session.createdByRole ? `, ${session.createdByRole}` : ""}`}
                </span>
              </div>
              {image && (
                <a href={image.page} target="_blank" rel="noreferrer" className="text-white/50 hover:text-white hover:underline">
                  {image.credit} · modified
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-12 px-6 sm:px-10">
          {/* At a glance: like "Fahrzeugpreise" */}
          <CatalogSection title="Profile at a glance">
            <div className="grid gap-8 md:grid-cols-2">
              <table className="w-full text-[13px]">
                <Band cols={2}>Score</Band>
                <tbody>
                  <Row label={profile.principles ? "L1 · Principle fit (assessor) and your priority" : "L1 · Series focus and your priority"} value={Math.round(profile.score.l1 * 100)} />
                  <Row label="L2 · Evidence covered" value={Math.round(profile.score.l2 * 100)} />
                  <Row label={`L3 · Social test (max ${Math.round(cfg.l3Weight * 100)}%)`} value={profile.score.l3 === null ? "not run" : Math.round(profile.score.l3 * 100)} />
                  <Row label="Total score" value={Math.round(profile.score.total * 100)} strong />
                </tbody>
              </table>
              <table className="w-full text-[13px]">
                <Band cols={2}>Scope</Band>
                <tbody>
                  <Row label="Series · market" value={`${cfg.name} (${cfg.id}) · ${scopeLabel}`} />
                  <Row label="Requirements" value={profile.requests.length} />
                  <Row label="Customer mentions covered" value={covered.toLocaleString("en")} />
                  <Row label="From the wishlist" value={profile.wishes.length} />
                  <Row label="Related options today (EUR incl. VAT)" value={listPrice(optionTotal || null)} strong />
                </tbody>
              </table>
            </div>
          </CatalogSection>

          {/* Requirements matrix: like "Sonderausstattungen" */}
          <CatalogSection
            title="Requirements"
            note={`In your priority order. Columns compare the profiles of this generation: ${profiles.map((p, i) => `${letter(i)} · ${p.name}`).join("   ")}.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="text-[11px] text-muted">
                    <th className="pb-2 text-left font-normal">Requirement</th>
                    <th className="w-16 pb-2 text-left font-normal">Code</th>
                    <th className="w-28 pb-2 text-right font-normal">Option today</th>
                    {profiles.map((p, i) => (
                      <th key={p.id} className="w-10 pb-2 text-center font-normal" title={`Profile ${letter(i)} · ${p.name}`}>
                        <span className={`inline-flex items-center gap-1 ${p.id === profile.id ? "font-semibold text-ink" : ""}`}>
                          <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: PROFILE_COLOR[p.id]?.stroke }} />
                          {letter(i)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {CATEGORIES.map((cat) => {
                  const list = rows.filter((r) => r.category === cat);
                  if (!list.length) return null;
                  const Icon = CATEGORY_ICON[cat];
                  return (
                    <tbody key={cat}>
                      <tr>
                        <td colSpan={3 + profiles.length} className="pt-5">
                          <p className="flex items-center gap-2 border-b border-ink/70 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
                            <Icon aria-hidden className="size-3.5" /> {cat}
                          </p>
                        </td>
                      </tr>
                      {list.map((r) => {
                        const o = r.relatedOptions[0];
                        const mine = included.has(r.id);
                        return (
                          <tr key={r.id} className={`border-b border-line align-top ${mine ? "" : "text-muted"}`}>
                            <td className="py-2.5 pr-4">
                              <p className={`flex items-center gap-1.5 ${mine ? "font-medium text-ink" : ""}`}>
                                {r.title} <span className="text-[11px] font-normal text-muted">#{r.priority}</span>
                                <button
                                  type="button"
                                  data-no-print
                                  onClick={() => setTrace(r)}
                                  aria-label={`Where “${r.title}” comes from`}
                                  title="Where this comes from: feedback, competitors and trends, and the decision"
                                  className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-brand"
                                >
                                  <Info aria-hidden className="size-3.5" />
                                </button>
                              </p>
                              {mine && <p className="mt-0.5 text-[12px] text-ink-soft">– {capitalise(draftTarget(r).replace(/^“[^”]+”: /, ""))}</p>}
                              {mine && r.relatedOptions.length > 1 && (
                                <p className="mt-0.5 text-[11px] text-muted">
                                  Also: {r.relatedOptions.slice(1).map((x) => `${x.code} ${x.name}`).join(" · ")}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 font-mono text-[11px] text-muted">{o ? o.code : r.id.split("-")[1]}</td>
                            <td className="py-2.5 text-right tabular-nums">{o ? listPrice(o.priceEur) : <span className="text-line">–</span>}</td>
                            {profiles.map((p) => (
                              <td key={p.id} className="py-2.5 text-center">
                                {mark(p, r.id)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
                {wishes.size > 0 && (
                  <tbody>
                    <tr>
                      <td colSpan={3 + profiles.length} className="pt-5">
                        <p className="flex items-center gap-2 border-b border-ink/70 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
                          <Star aria-hidden className="size-3.5" /> Wishlist · competitors &amp; trends
                        </p>
                      </td>
                    </tr>
                    {[...wishes.values()].map((w) => (
                      <tr key={w.id} className="border-b border-line align-top">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-ink">{w.title}</p>
                          <p className="mt-0.5 text-[12px] text-ink-soft">
                            – {w.kind === "competitor" ? `${w.competitor}: ` : ""}
                            {w.detail}
                          </p>
                        </td>
                        <td className="py-2.5 font-mono text-[11px] text-muted">{w.id}</td>
                        <td className="py-2.5 text-right text-line">–</td>
                        {profiles.map((p) => (
                          <td key={p.id} className="py-2.5 text-center">
                            {mark(p, w.id, true)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            <Legend />
          </CatalogSection>

          <div className="grid gap-12 lg:grid-cols-2">
            <CatalogSection title="Why this profile">
              <ol className="text-[13px]">
                {profile.why.map((w, i) => (
                  <li key={w} className="flex gap-3 border-b border-line py-2.5">
                    <span className="w-4 shrink-0 tabular-nums text-muted">{i + 1}</span>
                    <span className="text-ink-soft">{w}</span>
                  </li>
                ))}
              </ol>
            </CatalogSection>
            <CatalogSection title="Principles">
              <table className="w-full text-[13px]">
                <tbody>
                  {cfg.principles.map((p) => (
                    <tr key={p.id} className="border-b border-line align-top">
                      <td className="w-10 py-2.5 font-mono text-[11px] font-semibold text-l1">{p.id}</td>
                      <td className="py-2.5 text-ink-soft">{p.text}</td>
                      <td className="py-2.5 pl-3 text-right text-[11px] text-muted">{p.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profile.principles ? (
                profile.principles.tensions.length === 0 ? (
                  <p className="text-[11px] text-muted">
                    ■ The principle assessor found no tension with BMW principles in the {profile.principles.assessed} assessed requirements
                    {profile.principles.supports.length > 0 && ` (supports ${profile.principles.supports.join(", ")})`}.
                  </p>
                ) : (
                  <div className="text-[11px] text-human">
                    <p>□ {profile.principles.tensions.length} requirement{profile.principles.tensions.length > 1 ? "s" : ""} strain a principle:</p>
                    <ul className="list-disc pl-4">
                      {profile.principles.tensions.map((t) => (
                        <li key={t.title}>
                          {t.title} ({t.ids.join(", ")}): {t.rationale}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ) : (
                <p className="text-[11px] text-muted">□ Principles were not assessed for this build: L1 uses the series focus and your priority.</p>
              )}
            </CatalogSection>
          </div>

          <CatalogSection title="Competitors and trends">
            {signals.length === 0 ? (
              <p className="text-[13px] text-muted">No competitor or trend signal is linked to this profile.</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {signals.map(({ s, wish }) => {
                    const Icon = wish ? Star : SIGNAL_ICON[s.kind];
                    return (
                      <tr key={s.id} className="border-b border-line align-top">
                        <td className="w-8 py-2.5">
                          <Icon aria-hidden className={`size-4 ${wish ? "text-brand" : "text-l3"}`} fill={wish ? "currentColor" : "none"} />
                        </td>
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-ink">{s.kind === "competitor" ? `${s.competitor}: ${s.title}` : s.title}</p>
                          <p className="text-ink-soft">{s.detail}</p>
                        </td>
                        <td className="hidden w-36 py-2.5 text-[11px] text-muted sm:table-cell">
                          {wish ? "Wishlist" : `Backs ${s.relatesTo.length} request${s.relatesTo.length > 1 ? "s" : ""}`}
                        </td>
                        <td className="w-44 py-2.5 text-right text-[11px]">
                          {s.sources.slice(0, 1).map((src) => (
                            <a key={src.url} href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand hover:underline">
                              {src.label}
                              <ExternalLink aria-hidden className="size-3" />
                            </a>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CatalogSection>

          <CatalogSection title="Decision trail">
            {rejected.length === 0 && keptOut.length === 0 ? (
              <p className="text-[13px] text-muted">No rejections. Every request you kept is in this profile.</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {rejected.map((d) => (
                    <tr key={d.requestId} className="border-b border-line align-top">
                      <td className="w-24 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-bad">Rejected</td>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-ink">{d.title}</p>
                        <p className="text-ink-soft">“{d.reason}”</p>
                      </td>
                      <td className="w-44 py-2.5 text-right text-[11px] text-muted">
                        {d.by}
                        {d.role && <span className="block">{d.role}</span>}
                        {new Date(d.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                  {keptOut.map((d) => (
                    <tr key={d.requestId} className="border-b border-line align-top">
                      <td className="w-24 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Kept</td>
                      <td className="py-2.5 text-ink-soft" colSpan={2}>
                        {d.title} <span className="text-muted">· in another profile</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CatalogSection>

          <footer className="border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            <Legend />
            <p className="mt-2">
              Evidence: BMW customer feedback, customer studies, sales and the German option list (July 2026, EUR incl. 19% VAT). Competitor and trend signals link their
              public sources. Series fundamentals and competitor notes are example content; market principles come from the team&apos;s public-source research; the social test is simulated. {image && `${image.credit}, modified.`}
            </p>
          </footer>
        </div>
      </article>

      <GenerationChat session={session} profileId={profile.id} />
    </div>
  );
}

/* ---------- catalogue building blocks ---------- */

function CatalogSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold uppercase tracking-tight text-ink sm:text-2xl">{title}.</h2>
        {note && <p className="mt-1 text-[12px] text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Band({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <thead>
      <tr>
        <th colSpan={cols} className="bg-bg-soft px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          {children}
        </th>
      </tr>
    </thead>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <tr className="border-b border-line">
      <td className={`px-3 py-2 ${strong ? "font-semibold uppercase tracking-wide text-ink" : "text-ink-soft"}`}>{label}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</td>
    </tr>
  );
}

function Legend() {
  return (
    <p className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted">
      <span>■ In this profile</span>
      <span>□ In another profile</span>
      <span>– Not included</span>
      <span>–,– Included or no price on today&apos;s option list</span>
    </p>
  );
}
