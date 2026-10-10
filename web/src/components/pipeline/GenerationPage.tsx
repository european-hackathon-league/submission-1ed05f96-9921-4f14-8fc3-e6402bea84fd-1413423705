"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readSessions, type Session } from "@/lib/pipeline/sessions";
import { GenerationView } from "./GenerationView";

export function GenerationPage() {
  const [state, setState] = useState<{ gen: Session | null } | null>(null);
  useEffect(() => {
    const load = () => setState({ gen: readSessions().find((g) => g.id === window.location.hash.slice(1)) ?? null });
    const t = setTimeout(load, 0);
    window.addEventListener("hashchange", load);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", load);
    };
  }, []);
  if (!state) return <div className="h-72 animate-pulse rounded-[20px] bg-bg-soft" />;
  if (!state.gen)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-ink">Generation not found</p>
        <p className="text-sm text-muted">It may have been deleted, or it was built in another browser.</p>
        <Link href="/dashboard" className="h-10 rounded-full bg-ink px-5 pt-2.5 text-sm font-medium text-white">
          All generations
        </Link>
      </div>
    );
  return <GenerationView key={state.gen.id} initial={state.gen} />;
}
