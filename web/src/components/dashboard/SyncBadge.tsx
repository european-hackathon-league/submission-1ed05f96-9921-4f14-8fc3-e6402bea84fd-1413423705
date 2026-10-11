"use client";

import { Cloud, CloudOff, HardDrive } from "lucide-react";
import { useSync } from "@/lib/api";

/** Where decisions, generations and settings are stored right now: Supabase (via the backend) or only this browser. */
export function SyncBadge() {
  const s = useSync();
  const view =
    s.mode === "local"
      ? { Icon: HardDrive, text: "This browser", title: "No backend configured: decisions, generations and settings are stored in this browser only.", cls: "text-muted" }
      : s.mode === "error"
        ? { Icon: CloudOff, text: "Not saved", title: `Backend unreachable, kept in this browser: ${s.error ?? ""}`, cls: "text-bad" }
        : { Icon: Cloud, text: "Supabase", title: "Decisions, generations, settings and agent runs are stored in Supabase through the Dixi backend.", cls: "text-good" };
  return (
    <span title={view.title} className={`hidden items-center gap-1 text-xs font-medium sm:inline-flex ${view.cls}`}>
      <view.Icon aria-hidden className="size-3.5" /> {view.text}
    </span>
  );
}
