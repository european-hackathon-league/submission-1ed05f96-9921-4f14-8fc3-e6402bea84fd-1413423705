"use client";

import Image from "next/image";
import { Heart, Megaphone, MessageCircle, Repeat2, Sparkles, Table2, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CAMPAIGN_DAYS, momentum, type Campaign } from "@/lib/pipeline/analytics";
import type { Profile } from "@/lib/pipeline/profiles";
import type { SeriesConfig } from "@/lib/pipeline/series";
import { buildPost } from "@/lib/pipeline/posts";

/* Colour follows the profile, never its rank (fixed slot per archetype). */
export const PROFILE_COLOR: Record<string, { stroke: string; bg: string; text: string }> = {
  fix: { stroke: "var(--series-1)", bg: "bg-series-1", text: "text-series-1" },
  tech: { stroke: "var(--series-2)", bg: "bg-series-2", text: "text-series-2" },
  comfort: { stroke: "var(--series-3)", bg: "bg-series-3", text: "text-series-3" },
};

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function Analytics({
  profiles,
  campaigns,
  cfg,
  scopeLabel,
  onLaunch,
}: {
  profiles: Profile[];
  campaigns: Campaign[] | null;
  cfg: SeriesConfig;
  scopeLabel: string;
  onLaunch: () => void;
}) {
  const posts = <Posts profiles={profiles} campaigns={campaigns} cfg={cfg} scopeLabel={scopeLabel} />;
  if (!campaigns) {
    return (
      <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-4 rounded-card border border-dashed border-l3/60 bg-l3-soft/40 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-l3 shadow-card">
          <Megaphone aria-hidden className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Test the profiles on social media</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
            Post each profile in {scopeLabel} and track reactions for {CAMPAIGN_DAYS} days. For the {cfg.name} this L3 signal moves the score by at most{" "}
            <strong>{Math.round(cfg.l3Weight * 100)}%</strong>.
          </p>
        </div>
        <button type="button" onClick={onLaunch} className="h-10 rounded-full bg-brand px-5 text-sm font-medium text-white shadow-card hover:bg-brand-deep">
          Launch test (simulated)
        </button>
      </section>
      {posts}
      </div>
    );
  }

  const byId = new Map(campaigns.map((c) => [c.profileId, c]));
  const ranked = [...campaigns].sort((a, b) => b.l3 - a.l3);
  const leader = profiles.find((p) => p.id === ranked[0].profileId)!;
  const lead = ranked[0].l3 - ranked[1].l3;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium text-l3">Simulated campaign: no real posts were made. Connect a social channel to replace it with live data.</p>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Trophy aria-hidden className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Tracking best · social score</p>
          <p className="text-lg font-semibold tracking-tight text-ink">
            {leader.name} <span className="font-normal text-muted">leads by {Math.round(lead * 100)} points</span>
          </p>
          <p className="text-xs text-muted">Social score = half engagement rate, half share of positive reactions.</p>
        </div>
        <p className="text-sm text-ink-soft sm:max-w-xs sm:text-right">
          Final scores already include this test at {Math.round(cfg.l3Weight * 100)}% weight.
        </p>
      </section>

      <ul className="grid gap-3 md:grid-cols-3">
        {profiles.map((p) => {
          const c = byId.get(p.id)!;
          const m = momentum(c);
          const up = m >= 0;
          return (
            <li key={p.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span aria-hidden className={`size-2.5 rounded-full ${PROFILE_COLOR[p.id].bg}`} />
                {p.name}
                <span className="ml-auto text-xs font-normal text-muted">
                  Social score <span className="text-base font-semibold tabular-nums text-ink">{Math.round(c.l3 * 100)}</span>
                </span>
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Reach" value={compact(c.impressions)} />
                <Stat label="Engagement" value={pct(c.engagement)} />
                <Stat label="Positive" value={pct(c.positive, 0)} />
              </dl>
              <p className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${up ? "text-good" : "text-bad"}`}>
                {up ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
                {up ? "+" : ""}
                {Math.round(m * 100)}% engagement, week 2 vs week 1
              </p>
            </li>
          );
        })}
      </ul>

      {posts}

      <EngagementChart profiles={profiles} campaigns={campaigns} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] text-muted">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/* Line chart: daily engagement rate per profile. One axis, 2px lines, crosshair + tooltip, direct end labels, table view. */
function EngagementChart({ profiles, campaigns }: { profiles: Profile[]; campaigns: Campaign[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  /* Draw at the container's real width so text stays at its true size. */
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [table]);
  const H = 280;
  const pad = { l: 44, r: 120, t: 16, b: 30 };
  const max = Math.max(...campaigns.flatMap((c) => c.days.map((d) => d.engagement))) * 1.1;
  const x = (day: number) => pad.l + ((day - 1) / (CAMPAIGN_DAYS - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, max / 3, (2 * max) / 3].map((v) => Math.round(v * 1000) / 1000);
  const name = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  /* End labels: keep at least 16px apart so close lines don't collide. */
  const labelY = new Map<string, number>();
  [...campaigns]
    .map((c) => ({ id: c.profileId, y: y(c.days[c.days.length - 1].engagement) }))
    .sort((a, b) => a.y - b.y)
    .forEach((l, i, arr) => {
      const prev = i > 0 ? labelY.get(arr[i - 1].id)! : -Infinity;
      labelY.set(l.id, Math.max(l.y, prev + 16));
    });

  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold text-ink">Engagement rate per day</h3>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-3 text-xs text-ink-soft sm:flex">
            {campaigns.map((c) => (
              <li key={c.profileId} className="flex items-center gap-1.5">
                <span aria-hidden className={`h-0.5 w-3.5 rounded-full ${PROFILE_COLOR[c.profileId].bg}`} />
                {name(c.profileId)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            aria-pressed={table}
            onClick={() => setTable((v) => !v)}
            title={table ? "Show chart" : "Show table"}
            className="flex size-8 items-center justify-center rounded-full text-muted ring-1 ring-line hover:text-ink"
          >
            <Table2 aria-hidden className="size-4" />
            <span className="sr-only">{table ? "Show chart" : "Show table"}</span>
          </button>
        </div>
      </div>

      {table ? (
        <div className="overflow-x-auto px-5 py-4">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="text-xs text-muted">
              <tr>
                <th className="text-left font-normal">Day</th>
                {campaigns.map((c) => (
                  <th key={c.profileId} className="font-normal">
                    {name(c.profileId)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              {campaigns[0].days.map((d, i) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1 text-left">{d.day}</td>
                  {campaigns.map((c) => (
                    <td key={c.profileId}>{pct(c.days[i].engagement, 2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} className="relative py-3">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block"
            role="img"
            aria-label={`Engagement rate per day for ${campaigns.map((c) => name(c.profileId)).join(", ")}`}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              const day = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (CAMPAIGN_DAYS - 1)) + 1;
              setHover(day >= 1 && day <= CAMPAIGN_DAYS ? day : null);
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[12px]">
                  {pct(t, 0)}
                </text>
              </g>
            ))}
            {[1, 7, 14].map((d) => (
              <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="fill-muted text-[12px]">
                Day {d}
              </text>
            ))}
            {hover && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeDasharray="3 3" strokeWidth={1} />}
            {campaigns.map((c) => {
              const col = PROFILE_COLOR[c.profileId].stroke;
              const last = c.days[c.days.length - 1];
              return (
                <g key={c.profileId}>
                  <polyline
                    fill="none"
                    stroke={col}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={c.days.map((d) => `${x(d.day)},${y(d.engagement)}`).join(" ")}
                  />
                  <circle cx={x(last.day)} cy={y(last.engagement)} r={4} fill={col} stroke="var(--surface)" strokeWidth={2} />
                  <text x={x(last.day) + 10} y={labelY.get(c.profileId)! + 4} className="fill-ink-soft text-[12px] font-medium">
                    {name(c.profileId)}
                  </text>
                  {hover && (
                    <circle cx={x(hover)} cy={y(c.days[hover - 1].engagement)} r={4.5} fill={col} stroke="var(--surface)" strokeWidth={2} />
                  )}
                </g>
              );
            })}
          </svg>
          {hover && (
            <div
              className="pointer-events-none absolute top-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-float"
              style={{ left: `calc(${(x(hover) / W) * 100}% + ${hover > CAMPAIGN_DAYS / 2 ? "-170px" : "12px"})` }}
            >
              <p className="mb-1 font-semibold text-ink">Day {hover}</p>
              {[...campaigns]
                .sort((a, b) => b.days[hover - 1].engagement - a.days[hover - 1].engagement)
                .map((c) => (
                  <p key={c.profileId} className="flex items-center justify-between gap-4 text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className={`size-2 rounded-full ${PROFILE_COLOR[c.profileId].bg}`} />
                      {name(c.profileId)}
                    </span>
                    <span className="tabular-nums text-ink">{pct(c.days[hover - 1].engagement, 2)}</span>
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- the posts: one story per profile ---------- */

function Posts({ profiles, campaigns, cfg, scopeLabel }: { profiles: Profile[]; campaigns: Campaign[] | null; cfg: SeriesConfig; scopeLabel: string }) {
  const byId = new Map((campaigns ?? []).map((c) => [c.profileId, c]));
  const leader = campaigns ? [...campaigns].sort((a, b) => b.l3 - a.l3)[0]?.profileId : null;
  return (
    <section aria-labelledby="posts-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="posts-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles aria-hidden className="size-4 text-l3" /> The posts · one story per profile
        </h3>
        <p className="text-xs text-muted">Built from what {scopeLabel} customers asked for. {campaigns ? "Results after 14 days." : "Ready to post."}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {profiles.map((p) => {
          const post = buildPost(p, cfg, scopeLabel);
          const c = byId.get(p.id);
          const eng = c ? c.impressions * c.engagement : 0;
          return (
            <li key={p.id} className={`flex flex-col overflow-hidden rounded-card border bg-surface shadow-card ${leader === p.id ? "border-brand/50 ring-2 ring-brand/15" : "border-line"}`}>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: PROFILE_COLOR[p.id]?.stroke }}>
                  {p.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-[0.7rem] text-muted">
                    Concept test · {cfg.name} · {scopeLabel}
                  </p>
                </div>
                {leader === p.id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-medium text-brand-deep">
                    <Trophy aria-hidden className="size-3" /> Best
                  </span>
                )}
              </div>
              <figure className="relative aspect-square bg-bg-soft">
                <Image src={post.image} alt={post.alt} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                <figcaption className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur">AI-generated image</figcaption>
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-4 pb-3 pt-10 text-lg font-semibold leading-tight tracking-tight text-white">
                  {post.headline}
                </p>
              </figure>
              {c && (
                <div className="flex items-center gap-4 border-b border-line px-4 py-2.5 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1.5" title="Likes">
                    <Heart aria-hidden className="size-4 text-bad" fill="currentColor" />
                    {compact(eng * 0.72)}
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Comments">
                    <MessageCircle aria-hidden className="size-4" />
                    {compact(eng * 0.16)}
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Shares">
                    <Repeat2 aria-hidden className="size-4" />
                    {compact(c.shares)}
                  </span>
                  <span className="ml-auto text-xs font-medium text-good" title="Share of positive reactions">
                    {pct(c.positive, 0)} positive
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
                <p className="leading-relaxed text-ink-soft">{post.caption}</p>
                <p className="mt-auto text-xs text-brand">{post.hashtags.join(" ")}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[0.7rem] text-muted">Images are AI-generated concept visuals (no real car, logo or person). Copy is drafted from each profile&apos;s top requests.</p>
    </section>
  );
}
