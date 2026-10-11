"use client";

import { ArrowLeft, FolderClock, Globe2, Layers, ListChecks, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GenerationList } from "@/components/pipeline/Generations";
import { deleteSession, pullSessions, readSessions, type Session } from "@/lib/pipeline/sessions";
import { MarketPicker } from "./MarketPicker";

type Tab = "generations" | "new";

/** The dashboard home. Two tabs, each its own route: /dashboard (earlier generations of profiles)
 *  and /dashboard/new (globe → series → pipeline). Generations live in this browser, read on mount. */
export function DashboardHome({ tab }: { tab: Tab }) {
  const [gens, setGens] = useState<Session[] | null>(null);

  useEffect(() => {
    /* Local copy first, then every generation stored in Supabase (when the backend is configured). */
    let live = true;
    const t = setTimeout(() => setGens(readSessions()), 0);
    pullSessions().then((all) => live && setGens(all));
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);

  const list = gens ?? [];
  const decisions = list.reduce((n, g) => n + Object.keys(g.decisions).length, 0);
  const combos = new Set(list.map((g) => `${g.series}-${g.scope}`)).size;
  const best = list.flatMap((g) => g.profiles.map((p) => ({ g, p }))).sort((a, b) => b.p.score.total - a.p.score.total)[0];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {tab === "new" ? (
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
              <ArrowLeft aria-hidden className="size-4" /> Generations
            </Link>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Dashboard</p>
          )}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{tab === "new" ? "New analysis" : "Generations"}</h1>
        </div>
      </div>

      {tab === "generations" && !gens && <div className="h-64 animate-pulse rounded-card bg-bg-soft" />}

      {tab === "generations" && gens && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<FolderClock aria-hidden className="size-4" />} label="Generations" value={list.length} />
            <Kpi icon={<Globe2 aria-hidden className="size-4" />} label="Cars × markets" value={combos} />
            <Kpi icon={<ListChecks aria-hidden className="size-4" />} label="Decisions logged" value={decisions} />
            <Kpi
              icon={<Trophy aria-hidden className="size-4" />}
              label={best ? `Top profile · ${best.g.seriesName} ${best.g.scopeLabel}` : "Top profile"}
              value={best ? `${best.p.name} ${Math.round(best.p.score.total * 100)}` : "–"}
              small
            />
          </dl>
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface p-10 text-center">
              <Layers aria-hidden className="size-6 text-muted" />
              <p className="text-sm text-muted">No generations yet. Run an analysis and build profiles; each build is saved here.</p>
              <Link href="/dashboard/new" className="h-10 rounded-full bg-brand px-5 pt-2.5 text-sm font-medium text-white shadow-card hover:bg-brand-deep">
                Start a new analysis
              </Link>
            </div>
          ) : (
            <>
              <GenerationList
                generations={list}
                onDelete={(id) => {
                  deleteSession(id);
                  setGens(readSessions());
                }}
              />
              <p className="text-xs text-muted">Saved in this browser. Each build of profiles is one generation: its decisions, priority, profiles and social test.</p>
            </>
          )}
        </>
      )}

      {tab === "new" && (
        <div className="-mx-4 rounded-[22px] bg-bg-soft sm:-mx-6">
          <MarketPicker />
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <dt className="flex items-center gap-1.5 truncate text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className={`mt-1 truncate font-semibold tracking-tight tabular-nums text-ink ${small ? "text-lg" : "text-3xl"}`}>{value}</dd>
    </div>
  );
}
