/* Icon vocabulary for the pipeline, so cards can stay short. Every icon has a text label for screen readers or a tooltip. */
import { Armchair, Car, Cpu, Flame, Hand, Sparkles, Swords, TrendingUp, Wrench, Zap } from "lucide-react";
import type { Urgency } from "@/lib/pipeline/profiles";
import type { Category, MarketSignal } from "@/lib/pipeline/types";

export const CATEGORY_ICON = { Exterior: Car, Interior: Armchair, Digital: Cpu, Powertrain: Zap } as const;

export const CATEGORY_TILE: Record<Category, string> = {
  Exterior: "bg-l1-soft text-l1",
  Interior: "bg-wait-soft text-wait",
  Digital: "bg-brand-soft text-brand",
  Powertrain: "bg-good-soft text-good",
};

export function CategoryTile({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const Icon = CATEGORY_ICON[category];
  const box = size === "sm" ? "size-7 rounded-lg" : "size-10 rounded-xl";
  return (
    <span title={category} className={`flex shrink-0 items-center justify-center ${box} ${CATEGORY_TILE[category]}`}>
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-5"} />
      <span className="sr-only">{category}</span>
    </span>
  );
}

const URGENCY_CLS: Record<Urgency, string> = { high: "text-human", medium: "text-wait", low: "text-muted/60" };

/** One to three flames. */
export function UrgencyFlames({ urgency }: { urgency: Urgency }) {
  const n = urgency === "high" ? 3 : urgency === "medium" ? 2 : 1;
  return (
    <span title={`${urgency} urgency`} className={`inline-flex items-center ${URGENCY_CLS[urgency]}`}>
      {Array.from({ length: n }, (_, i) => (
        <Flame key={i} aria-hidden className="-mx-px size-3.5" fill="currentColor" />
      ))}
      <span className="sr-only">{urgency} urgency</span>
    </span>
  );
}

export const TYPE_ICON = { wants: Sparkles, difficult: Hand, defect: Wrench } as const;
export const TYPE_LABEL = { wants: "wish it", difficult: "hard to use", defect: "defect" } as const;
export const TYPE_CLS = { wants: "text-brand", difficult: "text-wait", defect: "text-bad" } as const;

export const SIGNAL_ICON = { competitor: Swords, trend: TrendingUp } as const;

export function SignalBadge({ s }: { s: MarketSignal }) {
  const Icon = SIGNAL_ICON[s.kind];
  return (
    <span
      title={`${s.kind === "competitor" ? `${s.competitor}: ` : "Trend: "}${s.title}. ${s.detail}`}
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-l3-soft px-2 py-0.5 text-xs font-medium text-brand-deep ring-1 ring-l3/30"
    >
      <Icon aria-hidden className="size-3 shrink-0" />
      <span className="truncate">{s.kind === "competitor" ? s.competitor : s.title}</span>
    </span>
  );
}
