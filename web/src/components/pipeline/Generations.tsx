"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Star, Trash2, Trophy, X } from "lucide-react";
import { CAR_IMAGES } from "@/lib/car-images";
import { generationHref, sessionTime, type Session } from "@/lib/pipeline/sessions";
import { PROFILE_COLOR } from "./Analytics";

/** Cards for earlier generations of profiles; each opens its own dashboard. */
export function GenerationList({ generations, onDelete }: { generations: Session[]; onDelete: (id: string) => void }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {generations.map((g) => {
        const all = Object.values(g.decisions);
        const kept = all.filter((d) => d.action === "keep").length;
        const rejected = all.filter((d) => d.action === "reject").length;
        const wished = all.filter((d) => d.action === "wish").length;
        const best = [...g.profiles].sort((a, b) => b.score.total - a.score.total)[0];
        const img = CAR_IMAGES[g.series].front;
        return (
          <li key={g.id} className="group relative">
            <Link
              href={generationHref(g.id)}
              className="flex h-full overflow-hidden rounded-[20px] border border-line bg-surface shadow-card transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-float motion-reduce:transition-none"
            >
              <div className="relative w-36 shrink-0 overflow-hidden bg-ink sm:w-44">
                <Image src={img.src} alt="" fill sizes="176px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/30" />
                <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-white backdrop-blur">{g.series}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2 pr-8">
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight text-ink">
                      {g.seriesName} · {g.scopeLabel}
                    </p>
                    <p className="text-xs text-muted">
                      {sessionTime(g.createdAt)}
                      {g.createdBy && ` · ${g.createdBy}`} · <span className="font-mono">{g.id}</span>
                    </p>
                  </div>
                </div>
                {best && (
                  <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <Trophy aria-hidden className="size-3.5 text-brand" />
                    <span className="truncate">
                      Best fit: <span className="font-medium text-ink">{best.name}</span>
                    </span>
                    <span className="ml-auto text-base font-semibold tabular-nums text-ink">{Math.round(best.score.total * 100)}</span>
                  </p>
                )}
                <div className="flex gap-1">
                  {g.profiles.map((p) => (
                    <span key={p.id} title={p.name} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: PROFILE_COLOR[p.id]?.stroke }} />
                  ))}
                </div>
                <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Check aria-hidden className="size-3.5 text-good" />{kept} kept</span>
                  <span className="inline-flex items-center gap-1"><X aria-hidden className="size-3.5 text-bad" />{rejected} rejected</span>
                  {wished > 0 && <span className="inline-flex items-center gap-1"><Star aria-hidden className="size-3.5 text-brand" />{wished}</span>}
                  {g.campaigns && <span className="inline-flex items-center gap-1"><BarChart3 aria-hidden className="size-3.5 text-l3" />social test</span>}
                  <ArrowRight aria-hidden className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => onDelete(g.id)}
              aria-label={`Delete generation ${g.id}`}
              title="Delete generation"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-bad-soft hover:text-bad focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
