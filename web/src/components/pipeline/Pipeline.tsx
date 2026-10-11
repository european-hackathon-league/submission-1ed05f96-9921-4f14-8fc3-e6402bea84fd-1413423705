"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Database, History, Info, ListChecks, Loader2, MessageSquareText, Radar, Sparkles, Star, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CarImage } from "@/lib/car-images";
import type { MarketScope } from "@/lib/dashboard-data";
import { marketById } from "@/lib/markets";
import { currentUser } from "@/lib/user";
import {
  MIN_KEPT_TO_BUILD,
  URGENCY_RULE,
  buildProfiles,
  marketVolume,
  scopedMentions,
  signalsFor,
  urgencyOf,
  type Decision,
  type Decisions,
  type Urgency,
} from "@/lib/pipeline/profiles";
import type { SeriesConfig } from "@/lib/pipeline/series";
import { MARKET_SIGNALS } from "@/lib/pipeline/market-signals";
import { useResearch } from "@/lib/pipeline/research";
import { useAssessment, usePrinciples, type AssessInput } from "@/lib/pipeline/principles";
import { logDecision, logUndo, pullDecisions } from "@/lib/pipeline/decision-log";
import { CATEGORIES, type Category, type FeatureRequest, type MarketSignal, type SeriesData } from "@/lib/pipeline/types";
import { generationHref, newSessionId, pullSessions, readSessions, saveSession, type Session } from "@/lib/pipeline/sessions";
import { buildMemory, scoreRequest } from "@/lib/pipeline/scoring";
import { useScoring } from "@/lib/pipeline/scoring-store";
import { RejectDialog } from "./RejectDialog";
import { BannerStat, CarBanner } from "./CarBanner";
import { DecisionLog } from "./DecisionLog";
import { RequestCard, RequestDetails } from "./RequestCard";
import { SignalsPanel } from "./SignalsPanel";
import { PrinciplesPanel } from "./PrinciplesPanel";

type Stage = "analysing" | "review" | "building" | "profiles";

const STEPS: { id: Stage; label: string }[] = [
  { id: "analysing", label: "AI analysis" },
  { id: "review", label: "Your decisions" },
  { id: "building", label: "Build profiles" },
  { id: "profiles", label: "Dashboard" },
];


/* Decisions live in the browser for now (per market + series). */
const storageKey = (scope: MarketScope, series: string) => `dixi:decisions:${scope}:${series}`;
const priorityKey = (scope: MarketScope, series: string) => `dixi:priority:${scope}:${series}`;
function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: keep it in memory */
  }
}
function readDecisions(key: string): Decisions {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Decisions;
  } catch {
    return {};
  }
}
function writeDecisions(key: string, d: Decisions) {
  try {
    localStorage.setItem(key, JSON.stringify(d));
  } catch {
    /* storage blocked: decisions stay in memory */
  }
}

export function Pipeline({
  scope,
  cfg,
  data,
  origin,
  images,
}: {
  scope: MarketScope;
  cfg: SeriesConfig;
  data: SeriesData;
  origin: "bmw" | "example";
  images?: { front: CarImage; second: CarImage };
}) {
  const scopeLabel = scope === "ALL" ? "all markets" : marketById(scope).name;
  const volume = marketVolume(data, scope);
  const fallback = scope !== "ALL" && volume === 0;
  const key = storageKey(scope, cfg.id);

  const [stage, setStage] = useState<Stage>("analysing");
  const [decisions, setDecisions] = useState<Decisions>({});
  const [category, setCategory] = useState<Category | "All">("All");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [rejecting, setRejecting] = useState<FeatureRequest | null>(null);
  const router = useRouter();
  const [focus, setFocus] = useState<string | null>(null);
  /** The PM's priority order (request ids). Empty = default order by mentions. */
  const [order, setOrder] = useState<string[]>([]);
  const [backedOnly, setBackedOnly] = useState(false);
  const [details, setDetails] = useState<FeatureRequest | null>(null);

  /* L2 market signals: the last live run of the research agent (backend) for this market + series, else the saved research. */
  const research = useResearch(scope, cfg.id);
  const signals = useMemo(
    () => signalsFor(research.result?.signals ?? MARKET_SIGNALS, cfg.id, scope),
    [research.result, cfg.id, scope],
  );
  const signalsByTitle = useMemo(() => {
    const m = new Map<string, MarketSignal[]>();
    signals.forEach((sg) => sg.relatesTo.forEach((t) => m.set(t, [...(m.get(t) ?? []), sg])));
    return m;
  }, [signals]);
  const focusTitles = new Set(signals.find((sg) => sg.id === focus)?.relatesTo ?? []);

  /* L1: principles for this market + series (Supabase) and the principle assessor's fit per request. */
  const principles = usePrinciples(scope, cfg.id);
  const assessment = useAssessment(scope, cfg.id);
  /* What the assessor gets: aggregate request data only (title, category, mention count, backing signal titles). */
  const assessInputs: AssessInput[] = useMemo(
    () =>
      data.requests
        .map((r) => ({ id: r.id, title: r.title, category: r.category, mentions: scopedMentions(r, scope, fallback), backing: (signalsByTitle.get(r.title) ?? []).map((sg) => sg.title) }))
        .filter((r) => r.mentions > 0),
    [data.requests, scope, fallback, signalsByTitle],
  );

  /* Saved decisions are restored when the analysis finishes (client only, so the server HTML stays stable). */
  /* Decision memory: earlier generations, read when the list opens. */
  const [generations, setGenerations] = useState<Session[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const scoring = useScoring();
  const memory = useMemo(() => buildMemory(generations, cfg.id, scope, scoring), [generations, cfg.id, scope, scoring]);

  /* Earlier generations (decision memory) and the current decisions come from the backend when it is configured:
   * generations from Supabase, decisions folded from the server's append-only history. Local copies otherwise. */
  const finishAnalysis = useCallback(async () => {
    setGenerations(await pullSessions());
    const remote = await pullDecisions(cfg.id, scope);
    const d = remote ?? readDecisions(key);
    if (remote) writeDecisions(key, remote);
    setDecisions(d);
    setOrder(readJson<string[]>(priorityKey(scope, cfg.id), []));
    setStage("review");
  }, [key, scope, cfg.id]);

  /* State updaters stay pure (React may run them twice); the server write happens once, outside. */
  const decide = useCallback(
    (item: { id: string; title: string }, action: Decision["action"], reason?: string, mentionsAt?: number) => {
      const who = currentUser();
      const d: Decision = { requestId: item.id, title: item.title, action, reason, mentionsAt, by: who.name, role: who.role, at: new Date().toISOString() };
      setDecisions((prev) => {
        const next = { ...prev, [item.id]: d };
        writeDecisions(key, next);
        return next;
      });
      logDecision(cfg.id, scope, d);
    },
    [key, cfg.id, scope],
  );
  const undo = useCallback(
    (id: string) => {
      const old = decisions[id];
      setDecisions((prev) => {
        const next = { ...prev };
        delete next[id];
        writeDecisions(key, next);
        return next;
      });
      if (old) logUndo(cfg.id, scope, old, currentUser().name, currentUser().role);
    },
    [key, cfg.id, scope, decisions],
  );

  const rows = useMemo(
    () =>
      data.requests
        .map((r) => ({ req: r, scoped: scopedMentions(r, scope, fallback) }))
        .filter((x) => x.scoped > 0)
        .map((x, _i, all) => {
          const max = Math.max(...all.map((y) => y.scoped));
          const scored = scoreRequest(x.req, x.scoped, max, signalsByTitle.get(x.req.title)?.length ?? 0, cfg.focus, memory, scoring, undefined, assessment.fits.get(x.req.id)?.fit);
          return { ...x, urgency: urgencyOf(x.scoped), scored };
        })
        /* Default order = Dixi score (demand, market backing, principle fit, decision memory). The PM's drag order wins. */
        .sort((a, b) => {
          const ia = order.indexOf(a.req.id);
          const ib = order.indexOf(b.req.id);
          if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
          return b.scored.score - a.scored.score || b.scoped - a.scoped;
        }),
    [data.requests, scope, fallback, order, signalsByTitle, cfg.focus, memory, scoring, assessment.fits],
  );

  /* Reordering works on the full list, so moving inside a filtered view keeps everything else in place. */
  const saveOrder = (ids: string[]) => {
    setOrder(ids);
    writeJson(priorityKey(scope, cfg.id), ids);
  };
  /* Feedback while reordering: the dragged row dims, the moved row flashes, and rows slide to their new place (FLIP). */
  /* Pointer-based dragging (mouse, trackpad and touch): the row follows the pointer, a line shows where it lands. */
  const [drag, setDrag] = useState<{ id: string; startY: number; dy: number; target: string | null; where: "before" | "after" } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markMoved = (id: string) => {
    setFlash(id);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 900);
  };
  const listRef = useRef<HTMLUListElement>(null);
  const positions = useRef(new Map<string, number>());
  const orderKey = rows.map((r) => r.req.id).join();
  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    ul.querySelectorAll<HTMLElement>("[data-req]").forEach((el) => {
      const id = el.dataset.req!;
      const top = el.getBoundingClientRect().top;
      next.set(id, top);
      const before = positions.current.get(id);
      if (!reduce && before !== undefined && Math.abs(before - top) > 1) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: "translateY(0)" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    });
    positions.current = next;
  }, [orderKey]);

  const moveBefore = (dragged: string, target: string, where: "before" | "after" = "before") => {
    const ids = rows.map((r) => r.req.id).filter((id) => id !== dragged);
    ids.splice(ids.indexOf(target) + (where === "after" ? 1 : 0), 0, dragged);
    saveOrder(ids);
    markMoved(dragged);
  };
  const moveStep = (id: string, dir: -1 | 1, visibleIds: string[]) => {
    const neighbour = visibleIds[visibleIds.indexOf(id) + dir];
    if (!neighbour) return;
    const ids = rows.map((r) => r.req.id);
    const a = ids.indexOf(id);
    const b = ids.indexOf(neighbour);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    saveOrder(ids);
    markMoved(id);
  };
  const startDrag = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDrag({ id, startY: e.clientY, dy: 0, target: null, where: "before" });
  };
  useEffect(() => {
    if (!drag) return;
    const id = drag.id;
    const startY = drag.startY;
    let last: { target: string | null; where: "before" | "after" } = { target: null, where: "before" };
    let scrolled = 0;
    const onMove = (e: PointerEvent) => {
      if (e.clientY < 90) {
        window.scrollBy(0, -14);
        scrolled -= 14;
      } else if (e.clientY > window.innerHeight - 110) {
        window.scrollBy(0, 14);
        scrolled += 14;
      }
      const others = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-req]") ?? [])].filter((el) => el.dataset.req !== id);
      const below = others.find((el) => {
        const r = el.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2;
      });
      last = below ? { target: below.dataset.req!, where: "before" } : { target: others.at(-1)?.dataset.req ?? null, where: "after" };
      setDrag((d) => (d ? { ...d, dy: e.clientY - startY + scrolled, ...last } : d));
    };
    const onUp = () => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-req="${id}"]`);
      if (el) positions.current.set(id, el.getBoundingClientRect().top); // slide from where it was dropped
      setDrag(null);
      if (last.target) moveBefore(id, last.target, last.where);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  const rankOf = (id: string) => rows.findIndex((r) => r.req.id === id) + 1;

  const counts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    rows.forEach((r) => (c[r.req.category] += 1));
    return c;
  }, [rows]);

  const visible = rows.filter(
    (r) =>
      (category === "All" || r.req.category === category) &&
      (urgency === "all" || r.urgency === urgency) &&
      (!backedOnly || signalsByTitle.has(r.req.title)) &&
      (!focus || focusTitles.has(r.req.title)) &&
      (showHidden || !r.scored.hidden),
  );
  const hiddenCount = rows.filter((r) => r.scored.hidden).length;
  const wishlist = useMemo(() => signals.filter((sg) => decisions[sg.id]?.action === "wish"), [signals, decisions]);
  const kept = useMemo(() => rows.filter((r) => decisions[r.req.id]?.action === "keep").map((r) => r.req), [rows, decisions]);
  const rejectedCount = rows.filter((r) => decisions[r.req.id]?.action === "reject").length;
  const open = rows.length - kept.length - rejectedCount;

  const profiles = useMemo(
    () => (kept.length >= MIN_KEPT_TO_BUILD ? buildProfiles(kept, cfg, scope, fallback, null, wishlist, signals, assessment.fits) : []),
    [kept, cfg, scope, fallback, wishlist, signals, assessment.fits],
  );

  /* Built: save the generation and open its dashboard. The pipeline's job ends here. */
  const finishBuild = useCallback(() => {
    const id = newSessionId();
    saveSession({
      id,
      createdAt: new Date().toISOString(),
      createdBy: currentUser().name,
      createdByRole: currentUser().role,
      scope,
      scopeLabel,
      series: cfg.id,
      seriesName: cfg.name,
      slug: cfg.slug,
      profiles,
      decisions,
      order: rows.map((r) => r.req.id),
      campaigns: null,
      researchRunId: research.result?.id ?? null,
      assessmentId: assessment.result?.id ?? null,
    });
    router.push(generationHref(id));
  }, [scope, scopeLabel, cfg, profiles, decisions, rows, router, research.result, assessment.result]);

  /* "Edit and rebuild" from a generation: /dashboard/<market>/<series>#session=<id> loads its decisions and priority. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.slice(1)).get("session");
    if (!id) return;
    const t = setTimeout(() => {
      const all = readSessions();
      setGenerations(all);
      const g = all.find((x) => x.id === id);
      if (!g) return;
      setDecisions(g.decisions);
      setOrder(g.order);
      writeDecisions(key, g.decisions);
      writeJson(priorityKey(scope, cfg.id), g.order);
      setStage("review");
    }, 0);
    return () => clearTimeout(t);
  }, [key, scope, cfg.id]);

  const build = () => {
    setStage("building");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <div className="flex flex-col gap-6">
      <Header cfg={cfg} scope={scope} scopeLabel={scopeLabel} volume={fallback ? marketVolume(data, "ALL") : volume} requests={rows.length} signals={signals.length} origin={origin} image={images?.front} />

      <Stepper stage={stage} canBuild={false} onGo={(s) => (s === "building" ? build() : setStage(s))} />

      {fallback && (
        <div role="note" className="flex gap-3 rounded-card border border-wait/30 bg-wait-soft/60 p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-wait" />
          <p className="text-ink-soft">
            <span className="font-semibold text-ink">What we don&apos;t know:</span> there are no customer comments for the {cfg.name} from {scopeLabel} in this data set. The list
            below uses every market instead, so treat it with lower confidence and check it against {scopeLabel} customer studies and sales.
          </p>
        </div>
      )}

      {stage === "analysing" && (
        <Analysis
          cfg={cfg}
          data={data}
          scopeLabel={scopeLabel}
          rows={rows.length}
          signals={signals.length}
          liveResearch={research.result !== null}
          principles={principles === undefined ? undefined : (principles?.length ?? null)}
          volume={fallback ? marketVolume(data, "ALL") : volume}
          assess={assessment.available ? () => assessment.ensure(assessInputs) : null}
          onDone={finishAnalysis}
        />
      )}

      {stage === "building" && <Building count={kept.length} onDone={finishBuild} />}

      {stage === "review" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="req-heading" className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-3">
              <SignalsPanel
                signals={signals}
                decisions={decisions}
                focus={focus}
                onFocus={(id) => {
                  setFocus(id);
                  if (id) {
                    setCategory("All");
                    setUrgency("all");
                  }
                }}
                onWish={(sg, on) => (on ? decide(sg, "wish") : undo(sg.id))}
                scopeLabel={scopeLabel}
                research={research}
                onResearch={() => research.run({ featureRequests: rows.map((r) => r.req.title) })}
              />
              <h2 id="req-heading" className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
                Feature requests
                <span className="text-sm font-normal text-muted">· {rows.length}</span>
                {order.length > 0 && (
                  <button type="button" onClick={() => saveOrder([])} className="ml-auto text-xs font-normal text-muted hover:text-brand">
                    Reset priority
                  </button>
                )}
                <span
                  className="text-muted"
                  title={`Drag to set your priority: profiles follow it. Keep what should shape the next ${cfg.name}; every reject needs a reason. Flames = urgency: 3 from ${URGENCY_RULE.high} mentions, 2 from ${URGENCY_RULE.medium}.`}
                >
                  <Info aria-hidden className="size-4" />
                  <span className="sr-only">How it works</span>
                </span>
              </h2>
              {focus && (
                <p className="flex items-center gap-2 text-sm text-ink-soft">
                  <Radar aria-hidden className="size-4 text-l3" />
                  Showing feedback that matches “{signals.find((sg) => sg.id === focus)?.title}”.
                  <button type="button" onClick={() => setFocus(null)} className="text-brand hover:underline">
                    Show all
                  </button>
                </p>
              )}
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
                  {(["All", ...CATEGORIES] as const).map((c) => (
                    <Chip key={c} on={category === c} onClick={() => setCategory(c)}>
                      {c} <span className="tabular-nums opacity-60">{c === "All" ? rows.length : counts[c]}</span>
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <Chip on={backedOnly} onClick={() => setBackedOnly((v) => !v)}>
                  <Radar aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
                  Backed by market
                </Chip>
                <div role="group" aria-label="Urgency" className="inline-flex self-start rounded-full bg-bg-soft p-1 ring-1 ring-line">
                  {(["all", "high", "medium", "low"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={urgency === u}
                      onClick={() => setUrgency(u)}
                      className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${urgency === u ? "bg-surface font-medium text-ink shadow-card" : "text-muted hover:text-ink"}`}
                    >
                      {u === "all" ? "Any" : u}
                    </button>
                  ))}
                </div>
                </div>
              </div>
            </div>

            {hiddenCount > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-bg-soft px-3 py-2 text-xs text-ink-soft ring-1 ring-line">
                <History aria-hidden className="size-3.5 text-muted" />
                {hiddenCount} request{hiddenCount > 1 ? "s" : ""} rejected in earlier generations {showHidden ? "shown" : "hidden"} by decision memory.
                <button type="button" onClick={() => setShowHidden((v) => !v)} className="font-medium text-brand hover:underline">
                  {showHidden ? "Hide" : "Show"}
                </button>
                <Link href="/dashboard/settings" className="ml-auto text-muted hover:text-brand">
                  Scoring settings
                </Link>
              </p>
            )}
            {visible.length === 0 ? (
              <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">No requests match these filters.</p>
            ) : (
              <ul ref={listRef} className="flex flex-col gap-1.5">
                {visible.map(({ req, scoped, urgency: u, scored }) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    rank={rankOf(req.id)}
                    onMove={(dir) => moveStep(req.id, dir, visible.map((v) => v.req.id))}
                    dragOffset={drag?.id === req.id ? drag.dy : undefined}
                    dropHint={drag && drag.id !== req.id && drag.target === req.id ? drag.where : null}
                    flash={flash === req.id}
                    onHandlePointerDown={(e) => startDrag(req.id, e)}
                    scoped={scoped}
                    scopeLabel={fallback ? "all markets" : scopeLabel}
                    urgency={u}
                    decision={decisions[req.id]}
                    signals={signalsByTitle.get(req.title) ?? []}
                    focused={focusTitles.has(req.title)}
                    scored={scored}
                    onKeep={() => decide(req, "keep", undefined, scoped)}
                    onReject={() => setRejecting(req)}
                    onUndo={() => undo(req.id)}
                    onDetails={() => setDetails(req)}
                  />
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-6 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
            <DecisionLog decisions={decisions} />
            <PrinciplesPanel principles={principles} assessment={assessment} onAssess={() => void assessment.run(assessInputs)} />
            <Context data={data} scope={scope} />
          </aside>
        </div>
      )}

      {stage === "review" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-good">{kept.length} kept</span> · <span className="font-semibold text-bad">{rejectedCount} rejected</span> · {open} open
              {wishlist.length > 0 && (
                <>
                  {" "}· <Star aria-hidden className="inline size-3.5 align-[-2px] text-brand" fill="currentColor" /> <span className="font-semibold text-brand">{wishlist.length} on wishlist</span>
                </>
              )}
              {kept.length < MIN_KEPT_TO_BUILD && <span className="text-muted"> · keep at least {MIN_KEPT_TO_BUILD} to build</span>}
            </p>
            <button
              type="button"
              disabled={kept.length < MIN_KEPT_TO_BUILD}
              onClick={build}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles aria-hidden className="size-4" /> Build profiles
            </button>
          </div>
        </div>
      )}

      <RequestDetails
        req={details}
        signals={details ? signalsByTitle.get(details.title) ?? [] : []}
        scored={details ? rows.find((r) => r.req.id === details.id)?.scored : undefined}
        fit={details ? assessment.fits.get(details.id) : undefined}
        onClose={() => setDetails(null)}
      />

      <RejectDialog
        request={rejecting}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) decide(rejecting, "reject", reason, rows.find((r) => r.req.id === rejecting.id)?.scoped);
          setRejecting(null);
        }}
      />
    </div>
  );
}

/* ---------- pieces ---------- */

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${on ? "bg-ink font-medium text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:ring-brand/40"}`}
    >
      {children}
    </button>
  );
}

function Header({
  cfg,
  scope,
  scopeLabel,
  volume,
  requests,
  signals,
  origin,
  image,
}: {
  cfg: SeriesConfig;
  scope: MarketScope;
  scopeLabel: string;
  volume: number;
  requests: number;
  signals: number;
  origin: "bmw" | "example";
  image?: CarImage;
}) {
  return (
    <CarBanner image={image} eager>
      <Link href={`/dashboard/${scope.toLowerCase()}`} className="inline-flex items-center gap-1 self-start text-sm text-white/70 transition-colors hover:text-white">
        <ArrowLeft aria-hidden className="size-4" /> {scopeLabel}
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-sky">{cfg.segment.split(" · ")[0]}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          {cfg.name} <span className="text-white/55">· {scopeLabel}</span>
        </h1>
        <p className="mt-1 text-sm text-white/70">{cfg.segment.split(" · ")[1]}</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <BannerStat value={volume.toLocaleString("en")} label="customer comments" icon={<MessageSquareText aria-hidden className="size-4" />} />
        <BannerStat value={requests} label="feature requests" icon={<ListChecks aria-hidden className="size-4" />} />
        <BannerStat value={signals} label="competitors & trends" icon={<Radar aria-hidden className="size-4" />} />
      </div>
      <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-white/50">
        <Database aria-hidden className="size-3" />
        {origin === "bmw" ? "BMW hackathon data · local only" : "Example data"}
      </p>
    </CarBanner>
  );
}

function Stepper({ stage, canBuild, onGo }: { stage: Stage; canBuild: boolean; onGo: (s: Stage) => void }) {
  const idx = STEPS.findIndex((s) => s.id === stage);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const reachable = s.id === "review" ? idx > 0 : s.id === "profiles" ? canBuild && idx >= 2 : false;
        const body = (
          <>
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                active ? "bg-brand text-white" : done ? "bg-good-soft text-good" : "bg-bg-soft text-muted ring-1 ring-line"
              }`}
            >
              {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
            </span>
            <span className={active ? "font-medium text-ink" : "text-muted"}>{s.label}</span>
          </>
        );
        return (
          <li key={s.id} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            {reachable && !active ? (
              <button type="button" onClick={() => onGo(s.id)} className="flex items-center gap-2 rounded-full hover:underline">
                {body}
              </button>
            ) : (
              <span className="flex items-center gap-2">{body}</span>
            )}
            {i < STEPS.length - 1 && <ArrowRight aria-hidden className="size-3.5 text-line" />}
          </li>
        );
      })}
    </ol>
  );
}

/** The analysis, step by step. Each line says where its data comes from. The principle assessor step is a real call to
 *  the backend agent (or reuses the cached assessment of the same request set); the other steps show work done before. */
function Analysis({
  cfg,
  data,
  scopeLabel,
  rows,
  signals,
  liveResearch,
  principles,
  volume,
  assess,
  onDone,
}: {
  cfg: SeriesConfig;
  data: SeriesData;
  scopeLabel: string;
  rows: number;
  signals: number;
  liveResearch: boolean;
  /** undefined = still loading, null = unavailable. */
  principles: number | null | undefined;
  volume: number;
  assess: (() => Promise<unknown>) | null;
  onDone: () => void;
}) {
  /* Plain words, no layer codes. Social media (L3) is not part of this analysis: it comes after the profiles exist. */
  type Step = { text: string; run?: () => Promise<unknown> };
  const groups: { title: string; steps: Step[] }[] = [
    {
      title: "BMW principles",
      steps: [
        {
          text:
            typeof principles === "number"
              ? `Loaded ${principles} L1 principles for the ${cfg.name} in ${scopeLabel}: series fundamentals, market and Group principles (Supabase)`
              : principles === undefined
                ? `Loading L1 principles for the ${cfg.name} in ${scopeLabel} from Supabase`
                : `Using the ${cfg.name}'s ${cfg.principles.length} series fundamentals: market and Group principles unavailable (backend not connected or not answering)`,
        },
      ],
    },
    {
      title: "Market evidence",
      steps: [
        { text: `Reading ${volume.toLocaleString("en")} customer comments from ${scopeLabel}, grouped by BMW's feedback taxonomy (data script)` },
        { text: `Adding customer studies${data.sales.length ? ", sales volumes" : ""}${data.options.length ? ` and ${data.options.length} options from today's price list` : ""}` },
        { text: liveResearch ? `Competitors & trends: last live research run (${signals} signals, sources checked)` : `Competitors & trends: saved research (${signals} signals). Run the research agent for a live search` },
      ],
    },
    {
      title: "Building the list",
      steps: [
        { text: "Linking requests to competitors and trends" },
        { text: `Scoring urgency: ${rows} feature requests ready` },
        assess
          ? { text: `Principle assessor (AI): rating ${rows} requests against the L1 principles, assumptions kept separate`, run: assess }
          : { text: "Principle fit: series focus only (connect the backend for the AI principle assessor)" },
      ],
    },
  ];
  const steps = groups.flatMap((g) => g.steps);
  const [done, setDone] = useState(0);
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pause = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 100 : ms));
    (async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        const run = steps[i].run;
        if (run) await run().catch(() => null);
        else await pause(450);
        if (!cancelled) setDone(i + 1);
      }
      await pause(300);
      if (!cancelled) finish();
    })();
    return () => {
      cancelled = true;
    };
    // The steps are fixed for one analysis; re-running on every render would call the agent again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-xl rounded-card border border-line bg-surface p-6 shadow-card">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Sparkles aria-hidden className="size-4 text-brand" /> Dixi is analysing the {cfg.name} for {scopeLabel}
      </p>
      <ol className="mt-4 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={s.text} className={`flex flex-col gap-2.5 text-sm transition-opacity duration-300 ${i <= done ? "opacity-100" : "opacity-30"}`}>
            {groups.map((g) =>
              g.steps[0] === s ? (
                <span key={g.title} className={`text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted ${i > 0 ? "mt-2" : ""}`}>
                  {g.title}
                </span>
              ) : null,
            )}
            <span className="flex items-center gap-2.5">
            {i < done ? (
              <Check aria-hidden className="size-4 text-good" />
            ) : i === done ? (
              <Loader2 aria-hidden className="size-4 animate-spin text-brand motion-reduce:animate-none" />
            ) : (
              <span aria-hidden className="size-4 rounded-full ring-1 ring-line" />
            )}
            <span className={i < done ? "text-ink-soft" : "text-ink"}>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={finish} className="mt-5 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
        Skip
      </button>
    </section>
  );
}

function Building({ count, onDone }: { count: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <section aria-live="polite" className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-card border border-line bg-surface p-8 text-center shadow-card">
      <Loader2 aria-hidden className="size-6 animate-spin text-brand motion-reduce:animate-none" />
      <p className="font-medium text-ink">Building profiles from your {count} kept requests</p>
      <p className="text-sm text-muted">Combining them with BMW&apos;s principles, weighing customer, competitor and trend evidence, and leaving out everything you rejected.</p>
    </section>
  );
}

function Context({ data, scope }: { data: SeriesData; scope: MarketScope }) {
  const studies = data.studies.filter((s) => scope === "ALL" || s.market === scope).sort((a, b) => a.score - b.score);
  const sales = data.sales.filter((s) => scope === "ALL" || s.market === scope);
  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">More evidence</h2>
      <div className="flex flex-col gap-4 px-4 py-4 text-sm">
        {data.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">What owners like (keep it)</p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {data.strengths.slice(0, 5).map((s) => (
                <li key={s.title} className="flex justify-between gap-3 text-ink-soft">
                  <span>{s.title}</span>
                  <span className="tabular-nums text-muted">{s.mentions}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Customer study: weakest scores</p>
          {studies.length ? (
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {studies.slice(0, 5).map((s) => (
                <li key={`${s.market}-${s.attribute}`} className="flex justify-between gap-3 text-ink-soft">
                  <span className="truncate">
                    {scope === "ALL" && <span className="mr-1 text-xs text-muted">{s.market}</span>}
                    {s.attribute}
                  </span>
                  <span className="tabular-nums text-muted">{s.score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-muted">No study for this market and series.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Sales (units)</p>
          {sales.length ? (
            <table className="mt-1.5 w-full text-left tabular-nums">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="font-normal">Market</th>
                  <th className="text-right font-normal">2024</th>
                  <th className="text-right font-normal">2025</th>
                  <th className="text-right font-normal">2030*</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {sales.map((s) => (
                  <tr key={s.market}>
                    <td>{s.market}</td>
                    {[s.y2024, s.y2025, s.y2030].map((v, i) => (
                      <td key={i} className="text-right">
                        {v === null ? "–" : v.toLocaleString("en")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-1.5 text-muted">No sales figures for this market.</p>
          )}
          {sales.length > 0 && <p className="mt-1 text-xs text-muted">*2030 is a forecast.</p>}
        </div>
      </div>
    </section>
  );
}
