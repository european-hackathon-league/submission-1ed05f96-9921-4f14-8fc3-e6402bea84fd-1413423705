"use client";

import { Check, ExternalLink, GripVertical, History, Info, RotateCcw, Tag, TrendingUp, Undo2, Users, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Decision, Urgency } from "@/lib/pipeline/profiles";
import type { Scored } from "@/lib/pipeline/scoring";
import type { Category, FeatureRequest, MarketSignal, OptionItem } from "@/lib/pipeline/types";
import { CATEGORY_TILE, CategoryTile, SIGNAL_ICON, SignalBadge, TYPE_CLS, TYPE_ICON, TYPE_LABEL, UrgencyFlames } from "./icons";

export const CATEGORY_CLS: Record<Category, string> = CATEGORY_TILE;

export const euro = (n: number) => `€${n.toLocaleString("de-DE")}`;

export function OptionChip({ o }: { o: OptionItem }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-bg-soft px-2 py-1 text-xs text-ink-soft ring-1 ring-line" title={o.group}>
      <Tag aria-hidden className="size-3 shrink-0 text-muted" />
      <span className="font-mono text-[0.7rem] text-muted">{o.code}</span>
      <span className="truncate">{o.name}</span>
      <span className="shrink-0 font-medium tabular-nums text-ink">{o.priceEur === null ? "included" : euro(o.priceEur)}</span>
    </span>
  );
}

export function IconButton({ label, onClick, tone, children }: { label: string; onClick: () => void; tone: "keep" | "reject" | "plain"; children: React.ReactNode }) {
  const cls =
    tone === "keep"
      ? "bg-brand text-white shadow-card hover:bg-brand-deep"
      : tone === "reject"
        ? "text-human ring-1 ring-human/30 hover:bg-human-soft"
        : "text-muted ring-1 ring-line hover:text-ink";
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`flex size-8 items-center justify-center rounded-full transition-colors ${cls}`}>
      {children}
    </button>
  );
}

export function RequestCard({
  req,
  rank,
  onMove,
  dragOffset,
  dropHint,
  flash,
  onHandlePointerDown,
  scoped,
  scopeLabel,
  urgency,
  decision,
  signals,
  focused,
  onKeep,
  onReject,
  onUndo,
  onDetails,
  scored,
}: {
  req: FeatureRequest;
  /** The PM's priority position (1 = top). */
  rank: number;
  /** Move one place up (-1) or down (+1). */
  onMove: (dir: -1 | 1) => void;
  /** Pixels this card follows the pointer while it is dragged; undefined when not dragged. */
  dragOffset?: number;
  /** Show the drop line above or below this card. */
  dropHint?: "before" | "after" | null;
  /** Briefly true right after the card moved. */
  flash: boolean;
  /** Pointer pressed on the drag handle: the list takes over from here. */
  onHandlePointerDown: (e: React.PointerEvent) => void;
  scoped: number;
  scopeLabel: string;
  urgency: Urgency;
  decision?: Decision;
  /** Market signals (trends, competitors) that back this request. */
  signals: MarketSignal[];
  /** True while the PM looks at one of these signals. */
  focused: boolean;
  onKeep: () => void;
  onReject: () => void;
  onUndo: () => void;
  onDetails: () => void;
  /** Dixi score with decision memory (see lib/pipeline/scoring.ts). */
  scored: Scored;
}) {
  const dragging = dragOffset !== undefined;
  const state = decision?.action;
  const backed = signals.length > 0;
  const frame =
    state === "keep"
      ? "border-good/50 ring-1 ring-good/20"
      : state === "reject"
        ? "border-line opacity-70"
        : scored.state === "rejected"
          ? "border-bad/25 bg-bad-soft/25"
          : focused
          ? "border-l3 ring-2 ring-l3/40"
          : backed
            ? "border-l3/50"
            : "border-line";

  return (
    <li
      id={`req-${req.id}`}
      data-req={req.id}
      className={`relative scroll-mt-24 rounded-xl border bg-surface shadow-card ${frame} ${
        dragging
          ? "z-30 !border-brand shadow-float ring-4 ring-brand/15"
          : "transition-[border-color,box-shadow,opacity,background-color] duration-300"
      } ${flash ? "!border-brand !bg-brand-soft ring-4 ring-brand/20" : ""}`}
      style={dragging ? { transform: `translateY(${dragOffset}px) scale(1.01)`, cursor: "grabbing" } : undefined}
    >
      {dropHint && !dragging && (
        <span aria-hidden className={`pointer-events-none absolute inset-x-1 z-20 flex items-center ${dropHint === "before" ? "-top-[5px]" : "-bottom-[5px]"}`}>
          <span className="size-2.5 rounded-full border-2 border-brand bg-surface" />
          <span className="h-0.5 flex-1 rounded-full bg-brand" />
        </span>
      )}
      <div className="flex items-center gap-2.5 px-2.5 py-2 sm:gap-3">
        <button
          type="button"
          onPointerDown={onHandlePointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onMove(-1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onMove(1);
            }
          }}
          aria-label={`Priority ${rank}. Drag, or use the arrow keys, to move ${req.title}`}
          title="Drag to change priority (or focus and use ↑ ↓)"
          className="flex shrink-0 cursor-grab touch-none select-none items-center gap-0.5 rounded-md py-1 pr-1 text-muted hover:bg-bg-soft hover:text-ink active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
          <span className="w-5 text-right text-xs font-semibold tabular-nums">{rank}</span>
        </button>
        <CategoryTile category={req.category} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate text-sm font-semibold tracking-tight ${state === "reject" ? "text-muted line-through decoration-1" : "text-ink"}`}>{req.title}</h3>
            <UrgencyFlames urgency={urgency} />
            <MemoryBadge scored={scored} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1 font-medium text-ink-soft" title={`${scoped} mentions · ${scopeLabel}${scoped !== req.mentions ? ` (${req.mentions} in all markets)` : ""}`}>
              <Users aria-hidden className="size-3.5" />
              <span className="tabular-nums">{scoped}</span>
              <span className="sr-only">mentions in {scopeLabel}</span>
            </span>
            {(["wants", "difficult", "defect"] as const).map((k) => {
              const Icon = TYPE_ICON[k];
              return (
                <span key={k} className="inline-flex items-center gap-1 tabular-nums" title={`${req.types[k]} ${TYPE_LABEL[k]}`}>
                  <Icon aria-hidden className={`size-3.5 ${TYPE_CLS[k]}`} />
                  {req.types[k]}
                  <span className="sr-only">{TYPE_LABEL[k]}</span>
                </span>
              );
            })}
            {req.relatedOptions.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Related options on today's price list">
                <Tag aria-hidden className="size-3.5" />
                {req.relatedOptions.length}
                <span className="sr-only">related options</span>
              </span>
            )}
            {signals.slice(0, 3).map((s) => (
              <SignalBadge key={s.id} s={s} />
            ))}
          </div>
        </div>

        <ScorePill scored={scored} />
        {state ? (
          <div className="flex shrink-0 items-center gap-2">
            <span
              title={decision?.reason ? `Why: ${decision.reason}` : undefined}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${state === "keep" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}
            >
              {state === "keep" ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
              {state === "keep" ? "Kept" : "Rejected"}
            </span>
            <IconButton label="Undo" tone="plain" onClick={onUndo}>
              <Undo2 aria-hidden className="size-4" />
            </IconButton>
          </div>
        ) : (
          <div className="flex shrink-0 gap-2">
            <IconButton label={`Reject: ${req.title}`} tone="reject" onClick={onReject}>
              <X aria-hidden className="size-4" />
            </IconButton>
            <IconButton label={`Keep: ${req.title}`} tone="keep" onClick={onKeep}>
              <Check aria-hidden className="size-4" />
            </IconButton>
          </div>
        )}

        <button
          type="button"
          onClick={onDetails}
          aria-label={`Details: ${req.title}`}
          title="Details"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-bg-soft hover:text-brand"
        >
          <Info aria-hidden className="size-4" />
        </button>
      </div>

      {state === "reject" && decision?.reason && (
        <p className="mx-4 mb-3 rounded-lg bg-bad-soft/60 px-3 py-1.5 text-xs text-ink-soft">
          <span className="font-semibold text-bad">Why:</span> {decision.reason}
          <span className="ml-1.5 text-muted">
            — {decision.by}, {new Date(decision.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </p>
      )}

    </li>
  );
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Dixi score (0–100). Tooltip shows how it is built. */
export function ScorePill({ scored }: { scored: Scored }) {
  const p = scored.parts;
  const tone = scored.state === "rejected" ? "text-bad ring-bad/30" : scored.state === "resurfaced" ? "text-wait ring-wait/40" : "text-ink ring-line";
  return (
    <span
      title={`Dixi score ${scored.score}: demand ${Math.round(p.demand * 100)}, market backing ${Math.round(p.backing * 100)}, principle fit ${Math.round(p.fit * 100)}${
        scored.state === "rejected" ? ` · lowered from ${scored.base} by a past reject` : ""
      }`}
      className={`hidden w-11 shrink-0 flex-col items-center rounded-lg py-0.5 ring-1 sm:flex ${tone}`}
    >
      <span className="text-sm font-semibold tabular-nums leading-tight">{scored.score}</span>
      <span className="text-[0.55rem] uppercase tracking-wider text-muted">score</span>
    </span>
  );
}

/** What decision memory says about this request: rejected before, resurfaced, or kept before. */
export function MemoryBadge({ scored }: { scored: Scored }) {
  const m = scored.memory;
  if (!m || !scored.state) return null;
  if (scored.state === "rejected")
    return (
      <span title={`Rejected on ${shortDate(m.at)} by ${m.by}: “${m.reason ?? ""}”`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-bad-soft px-2 py-0.5 text-[0.7rem] font-medium text-bad">
        <History aria-hidden className="size-3" /> Rejected {shortDate(m.at)}
      </span>
    );
  if (scored.state === "resurfaced")
    return (
      <span
        title={`Rejected on ${shortDate(m.at)} by ${m.by}, but demand grew ${Math.round((scored.growth ?? 0) * 100)}% since`}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-wait-soft px-2 py-0.5 text-[0.7rem] font-medium text-wait"
      >
        <TrendingUp aria-hidden className="size-3" /> Resurfaced +{Math.round((scored.growth ?? 0) * 100)}%
      </span>
    );
  return (
    <span title={`Kept on ${shortDate(m.at)} by ${m.by}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 text-[0.7rem] font-medium text-good">
      <RotateCcw aria-hidden className="size-3" /> Kept before
    </span>
  );
}

/** Side panel with everything behind one request. Opens from the info icon; Esc or the backdrop closes it. */
export function RequestDetails({
  req,
  signals,
  scored,
  decision,
  priority,
  onClose,
}: {
  req: FeatureRequest | null;
  signals: MarketSignal[];
  scored?: Scored;
  /** The PM decision behind this request, when shown from a profile. */
  decision?: Decision;
  priority?: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (req && !d.open) d.showModal();
    else if (!req && d.open) d.close();
  }, [req]);
  const markets = req
    ? Object.entries(req.byMarket)
        .filter(([, n]) => (n ?? 0) > 0)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    : [];
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={req ? `Details: ${req.title}` : "Details"}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(440px,100vw)] max-w-none border-l border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/25"
    >
      {req && (
        <div className="flex flex-col gap-5 p-5 text-sm">
          <div className="flex items-start gap-3">
            <CategoryTile category={req.category} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">
                {req.id} · {req.category}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">{req.title}</h2>
            </div>
            <IconButton label="Close" tone="plain" onClick={onClose}>
              <X aria-hidden className="size-4" />
            </IconButton>
          </div>
          <p className="text-ink-soft">{req.summary}</p>

          {decision && (
            <Block title="Decision trail">
              <ol className="relative flex flex-col gap-3 border-l border-line pl-4 text-xs">
                <li className="relative">
                  <span aria-hidden className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-l2 ring-2 ring-surface" />
                  <p className="font-medium text-ink">Found in customer feedback</p>
                  <p className="text-muted">
                    {req.mentions} mentions · {req.sources.map((x) => x.name).join(", ")}
                  </p>
                </li>
                {signals.length > 0 && (
                  <li className="relative">
                    <span aria-hidden className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-l3 ring-2 ring-surface" />
                    <p className="font-medium text-ink">Backed by {signals.length} competitor feature{signals.length > 1 ? "s" : ""} or trend{signals.length > 1 ? "s" : ""}</p>
                    <p className="text-muted">{signals.map((x) => (x.kind === "competitor" ? x.competitor : x.title)).join(" · ")}</p>
                  </li>
                )}
                <li className="relative">
                  <span aria-hidden className={`absolute -left-[21px] top-0.5 size-2.5 rounded-full ring-2 ring-surface ${decision.action === "reject" ? "bg-bad" : "bg-human"}`} />
                  <p className="font-medium text-ink">
                    {decision.action === "keep" ? "Kept" : decision.action === "reject" ? "Rejected" : "Wishlisted"} by {decision.by}
                    {priority !== undefined && ` · priority #${priority}`}
                  </p>
                  <p className="text-muted">
                    {decision.role && `${decision.role} · `}
                    {new Date(decision.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    {decision.mentionsAt !== undefined && ` · ${decision.mentionsAt} customers asking then`}
                  </p>
                  {decision.reason && <p className="mt-0.5 text-ink-soft">“{decision.reason}”</p>}
                </li>
                <li className="relative">
                  <span aria-hidden className="absolute -left-[21px] top-0.5 size-2.5 rounded-full bg-brand ring-2 ring-surface" />
                  <p className="font-medium text-ink">Placed in this profile by the agent</p>
                  <p className="text-muted">Following your priority order and the profile&apos;s theme.</p>
                </li>
              </ol>
            </Block>
          )}

          {scored && (
            <Block title="Dixi score">
              <div className="flex items-center gap-4">
                <p className="text-3xl font-semibold tabular-nums">{scored.score}</p>
                <dl className="grid flex-1 grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      ["Demand", scored.parts.demand],
                      ["Market backing", scored.parts.backing],
                      ["Principle fit", scored.parts.fit],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium tabular-nums text-ink">{Math.round(v * 100)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {scored.memory && (
                <div className={`mt-3 rounded-lg p-3 text-xs ${scored.state === "rejected" ? "bg-bad-soft/60" : scored.state === "resurfaced" ? "bg-wait-soft" : "bg-good-soft"}`}>
                  <p className="font-semibold text-ink">
                    {scored.state === "rejected" ? "Rejected in an earlier generation" : scored.state === "resurfaced" ? "Rejected before, now resurfaced" : "Kept in an earlier generation"}
                  </p>
                  {scored.memory.reason && <p className="mt-0.5 text-ink-soft">“{scored.memory.reason}”</p>}
                  <p className="mt-1 text-muted">
                    {scored.memory.by}
                    {scored.memory.role && ` (${scored.memory.role})`} · {shortDate(scored.memory.at)} · {scored.memory.scopeLabel} · {scored.memory.generationId}
                  </p>
                  <p className="mt-1 text-muted">
                    Customers asking then: {scored.memory.mentionsAt ?? "–"}
                    {scored.growth !== null && ` (${scored.growth >= 0 ? "+" : ""}${Math.round(scored.growth * 100)}%)`}
                    {scored.state === "rejected" && ` · score lowered from ${scored.base} (memory strength ${Math.round(scored.strength * 100)}%)`}
                  </p>
                </div>
              )}
            </Block>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(["wants", "difficult", "defect"] as const).map((k) => {
              const Icon = TYPE_ICON[k];
              return (
                <div key={k} className="rounded-xl bg-bg-soft p-2.5 text-center">
                  <Icon aria-hidden className={`mx-auto size-4 ${TYPE_CLS[k]}`} />
                  <p className="mt-1 text-lg font-semibold tabular-nums">{req.types[k]}</p>
                  <p className="text-xs text-muted">{TYPE_LABEL[k]}</p>
                </div>
              );
            })}
          </div>

          {signals.length > 0 && (
            <Block title="Competitors & trends">
              <ul className="flex flex-col gap-2">
                {signals.map((sg) => {
                  const Icon = SIGNAL_ICON[sg.kind];
                  return (
                    <li key={sg.id} className="flex items-start gap-2 text-ink-soft">
                      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-l3" />
                      <span>
                        <span className="font-medium text-ink">{sg.kind === "competitor" ? `${sg.competitor}: ${sg.title}` : sg.title}.</span> {sg.detail}{" "}
                        {sg.sources.slice(0, 1).map((src) => (
                          <a key={src.url} href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline">
                            {src.label}
                            <ExternalLink aria-hidden className="size-3" />
                          </a>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Block>
          )}

          {req.relatedOptions.length > 0 && (
            <Block title="On today's option list (DE, July 2026)">
              <div className="flex flex-wrap gap-1.5">
                {req.relatedOptions.map((o) => (
                  <OptionChip key={o.code} o={o} />
                ))}
              </div>
            </Block>
          )}

          <Block title="Customers say">
            {req.quotes.length ? (
              <ul className="flex flex-col gap-2">
                {req.quotes.map((q) => (
                  <li key={q} className="border-l-2 border-brand/30 pl-2.5 text-ink-soft">
                    “{q}”
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No quotes in this data set.</p>
            )}
          </Block>

          <div className="grid grid-cols-2 gap-4">
            <MiniTable title="Markets" rows={markets.map(([m, n]) => [m === "OTHER" ? "Other" : m, n ?? 0])} />
            <MiniTable title="Channels" rows={req.sources.map((x) => [x.name, x.count])} />
          </div>
          <Block title="BMW taxonomy">
            <ul className="flex flex-col gap-0.5 text-xs text-muted">
              {req.taxonomy.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Block>
        </div>
      )}
    </dialog>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      {children}
    </div>
  );
}

function MiniTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-0.5 text-ink-soft">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-3 tabular-nums">
            <span>{k}</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
