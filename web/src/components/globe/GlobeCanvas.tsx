"use client";

/* GlobeCanvas: the WebGL globe (react-globe.gl / three). Client-only; loaded by MarketGlobe via next/dynamic.
 * Light theme: pale sphere, flat light grey-blue countries, market countries in their market colour.
 *   hero:   slow auto-rotation, comment bubbles cycling on the visible side.
 *   picker: hover a market → highlight + tooltip, click → onSelect, camera flies to the selected market.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import { MARKETS, SAMPLE_COMMENTS, marketById, type MarketId, type SampleComment } from "@/lib/markets";
import { loadCountries, type CountryFeature } from "./world";

export interface GlobeCanvasProps {
  variant: "hero" | "picker";
  selected: MarketId | null;
  onSelect?: (id: MarketId) => void;
  showComments: boolean;
  autoRotate: boolean;
  /** Fixed square size in px; when undefined the canvas follows the container width. */
  size?: number;
  /** Called once the globe has rendered its first frame (used to fade out the skeleton). */
  onReady?: () => void;
}

/* ---------- colours (read from the CSS tokens at runtime) ---------- */

interface Palette {
  sphere: string;
  land: string;
  landSide: string;
  border: string;
  atmosphere: string;
  market: Record<MarketId, [number, number, number]>;
}

const FALLBACK: Record<string, string> = {
  "--brand-soft": "#eaf2fd", "--brand-sky": "#8ec5ff", "--line": "#e3e8ef", "--bg-soft": "#f5f7fb",
  "--eu": "#1c69d4", "--cn": "#e0483a", "--us": "#0f3d75", "--jp": "#7c5cd6",
};

function toRgb(color: string, ctx: CanvasRenderingContext2D | null): [number, number, number] | null {
  if (!ctx) return null;
  ctx.fillStyle = "#000000";
  ctx.fillStyle = color; // the browser normalises any CSS colour to #rrggbb or rgba()
  const v = String(ctx.fillStyle);
  if (v.startsWith("#") && v.length === 7) {
    return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(",").map((x) => parseFloat(x));
  return [r, g, b];
}

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [number, number, number];

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const ctx = document.createElement("canvas").getContext("2d");
  const get = (name: string): [number, number, number] => {
    const raw = style.getPropertyValue(name).trim() || FALLBACK[name];
    return toRgb(raw, ctx) ?? toRgb(FALLBACK[name], ctx) ?? [128, 128, 128];
  };
  const white: [number, number, number] = [255, 255, 255];
  const soft = get("--brand-soft");
  const sky = get("--brand-sky");
  const line = get("--line");
  const landBase = mix(line, sky, 0.18); // very light grey-blue
  return {
    sphere: rgba(mix(soft, white, 0.45), 1),
    land: rgba(landBase, 1),
    landSide: rgba(mix(landBase, sky, 0.3), 0.6),
    border: rgba(white, 0.9),
    atmosphere: rgba(sky, 1),
    market: { EU: get("--eu"), CN: get("--cn"), US: get("--us"), JP: get("--jp") },
  };
}

/* ---------- small browser hooks ---------- */

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function usePageVisible(): boolean {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.visibilityState !== "hidden",
    () => true,
  );
}

/* ---------- comment bubbles ---------- */

/** Live bubbles at once (plus one fading out): fewer on small globes. */
const MAX_LIVE = 2; // at most 2 comments on screen at a time
/** Card width scales down with the globe so it stays inside the canvas. */
const bubbleWidth = (dim: number) => Math.round(Math.min(164, Math.max(124, dim * 0.36)));
const EDGE = 4;
const TICK_MS = 500;   // how often we retire expired cards and pop new ones in
const LIFE_MS = 3000;  // each comment stays on the globe for 3 s
const ENTER_MS = 380;
const EXIT_MS = 260;

interface Bubble {
  comment: SampleComment;
  leaving: boolean;
  /** performance.now() when the card appeared. */
  born: number;
}

/** Angular distance in degrees between two lat/lng points. */
function angDist(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const c =
    Math.sin(aLat * r) * Math.sin(bLat * r) + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.cos((aLng - bLng) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
}

function buildBubble(c: SampleComment, reducedMotion: boolean, width: number): HTMLElement {
  // Root: 0x0 anchor positioned by the CSS2D renderer (it owns `transform` on this node).
  const root = document.createElement("div");
  root.style.pointerEvents = "none";
  root.style.transition = "opacity 250ms ease";
  root.dataset.bubble = String(width);

  const dotColor = c.sentiment === "good" ? "bg-good" : "bg-bad";
  if (!reducedMotion) {
    const ping = document.createElement("span");
    ping.className = `absolute block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 animate-ping ${dotColor}`;
    root.appendChild(ping);
  }
  const dot = document.createElement("span");
  dot.className = `absolute block size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${dotColor}`;
  root.appendChild(dot);

  // Positioner: places the card above the anchor; shifted/flipped per frame to stay inside the canvas.
  const pos = document.createElement("div");
  pos.className = "absolute left-0";
  pos.dataset.pos = "";
  pos.style.bottom = "8px";
  pos.style.transform = `translateX(${-width / 2}px)`;
  root.appendChild(pos);

  const card = document.createElement("div");
  card.className =
    "rounded-xl bg-surface px-2.5 py-2 text-left font-sans shadow-float ring-1 ring-line";
  card.dataset.card = "";
  card.style.width = `${width}px`;
  card.style.transformOrigin = "50% 100%";
  card.style.transition = reducedMotion
    ? `opacity ${ENTER_MS}ms ease`
    : `opacity ${ENTER_MS}ms ease, transform ${ENTER_MS}ms cubic-bezier(.34,1.56,.64,1)`;
  card.style.opacity = "0";
  card.style.transform = reducedMotion ? "none" : "translateY(14px) scale(.55)";

  const head = document.createElement("div");
  head.className = "flex items-center gap-1.5";
  const badge = document.createElement("span");
  badge.className = `inline-block size-1.5 shrink-0 rounded-full ${c.sentiment === "good" ? "bg-good" : "bg-bad"}`;
  badge.setAttribute("aria-hidden", "true");
  const title = document.createElement("span");
  title.className = `truncate text-[11px] font-semibold leading-tight ${c.brand === "BMW" ? "text-brand" : "text-ink"}`;
  title.textContent = c.model ? `${c.brand} ${c.model}` : c.brand;
  const tone = document.createElement("span");
  tone.className = `ml-auto shrink-0 rounded-full px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${c.sentiment === "good" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`;
  tone.textContent = c.sentiment === "good" ? "Good" : "Bad";
  head.append(badge, title, tone);

  const text = document.createElement("p");
  text.className = "mt-1 text-[11px] leading-snug text-ink-soft";
  text.textContent = `“${c.text}”`;

  const src = document.createElement("div");
  src.className = "mt-1.5 text-[9px] font-medium uppercase tracking-wider text-muted";
  src.textContent = `${c.source} · ${marketById(c.market).name}`;

  card.append(head, text, src);
  pos.appendChild(card);

  // Enter on the next frame so the transition runs.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      card.style.opacity = "1";
      card.style.transform = "none";
    }),
  );
  return root;
}

function setBubbleLeaving(el: HTMLElement, reducedMotion: boolean) {
  const card = el.querySelector<HTMLElement>("[data-card]");
  if (!card) return;
  card.style.transition = `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease-in`;
  card.style.opacity = "0";
  if (!reducedMotion) card.style.transform = "translateY(-8px) scale(.9)";
  el.querySelectorAll<HTMLElement>(".animate-ping").forEach((p) => p.remove());
}

/* ---------- picker market labels ---------- */

interface MarketLabel {
  kind: "label";
  id: MarketId;
  lat: number;
  lng: number;
}

/* ---------- component ---------- */

const HERO_POV = { lat: 28, lng: 40, altitude: 1.78 };
const PICKER_ALT = 1.75;

type HtmlDatum = Bubble | MarketLabel;
const isLabel = (d: HtmlDatum): d is MarketLabel => "kind" in d && d.kind === "label";

export default function GlobeCanvas({
  variant,
  selected,
  onSelect,
  showComments,
  autoRotate,
  size,
  onReady,
}: GlobeCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [measured, setMeasured] = useState(0);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  // client-only component (loaded with ssr:false), so the DOM is available during the first render
  const [palette] = useState<Palette>(() => readPalette());
  const [hovered, setHovered] = useState<MarketId | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisible();
  const active = onScreen && pageVisible;
  const isPicker = variant === "picker";
  const dim = size ?? measured;
  const dimRef = useRef(dim);
  useEffect(() => {
    dimRef.current = dim;
  }, [dim]);

  /* data + colours */
  useEffect(() => {
    let alive = true;
    loadCountries()
      .then((c) => alive && setCountries(c))
      .catch(() => alive && setCountries([]));
    return () => {
      alive = false;
    };
  }, []);

  /* size: follow the container width unless a fixed size is given */
  useEffect(() => {
    if (size) return;
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setMeasured(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  /* pause when off-screen */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    if (active) g.resumeAnimation();
    else g.pauseAnimation();
  }, [active, ready]);

  /* controls: rotation, zoom */
  const rotate = autoRotate; // with reduced motion it still turns, just very slowly (see below)
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    const c = g.controls();
    c.enableZoom = false;
    c.enablePan = false;
    c.enableRotate = true; // the user can always drag the globe
    c.autoRotate = false;  // rotation is driven below, so it reliably pauses for user drags
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.6;
  }, [ready, isPicker]);

  /* auto-rotation: turns continuously; pauses while the user drags and resumes 2.5 s after they let go */
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready || !rotate || !active) return;
    const c = g.controls();
    const DEG_PER_SEC = reducedMotion ? 1 : isPicker ? 3 : 5;
    const RESUME_MS = 2500;
    let dragging = false;
    let lastInteraction = -Infinity;
    const onStart = () => { dragging = true; };
    const onEnd = () => { dragging = false; lastInteraction = performance.now(); };
    c.addEventListener("start", onStart);
    c.addEventListener("end", onEnd);
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!dragging && now - lastInteraction > RESUME_MS) {
        const pov = g.pointOfView();
        g.pointOfView({ lat: pov.lat, lng: pov.lng + DEG_PER_SEC * dt, altitude: pov.altitude }, 0);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("start", onStart);
      c.removeEventListener("end", onEnd);
    };
  }, [ready, rotate, active, isPicker, reducedMotion]);

  /* camera: fly to the selected market (picker) */
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready || !isPicker || !selected) return;
    const m = marketById(selected);
    g.pointOfView({ lat: Math.max(-10, Math.min(45, m.lat - 6)), lng: m.lng, altitude: PICKER_ALT }, reducedMotion ? 0 : 1100);
  }, [selected, ready, isPicker, reducedMotion]);

  const handleReady = useCallback(() => {
    const g = globeRef.current;
    if (g) {
      if (isPicker && selected) {
        const m = marketById(selected);
        g.pointOfView({ lat: Math.max(-10, Math.min(45, m.lat - 6)), lng: m.lng, altitude: PICKER_ALT }, 0);
      } else {
        g.pointOfView(isPicker ? { lat: 30, lng: 40, altitude: PICKER_ALT } : HERO_POV, 0);
      }
    }
    setReady(true);
    onReady?.();
    // only the initial view matters here; later selections are handled by the effect above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- comment bubbles (hero) ---------- */
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const cursor = useRef(0);
  const bubbleEls = useRef(new Map<string, HTMLElement>());
  const commentsOn = showComments && !isPicker;

  useEffect(() => {
    if (!commentsOn || !ready || !active) return;
    const pick = (current: Bubble[]): SampleComment | null => {
      const g = globeRef.current;
      const pov = g ? g.pointOfView() : HERO_POV;
      const shown = current.filter((b) => !b.leaving).map((b) => b.comment);
      const n = SAMPLE_COMMENTS.length;
      for (let tries = 0; tries < n; tries++) {
        const c = SAMPLE_COMMENTS[(cursor.current + tries) % n];
        if (shown.some((s) => s.id === c.id)) continue;
        // facing the camera (with margin so it does not rotate away immediately)
        if (angDist(c.lat, c.lng, pov.lat, pov.lng) > 75) continue;
        // keep cards apart on screen so they don't pile up (card ≈ 188 x 90 px, drawn above its anchor)
        if (g) {
          const p = g.getScreenCoords(c.lat, c.lng, 0.02);
          const clash = shown.some((s) => {
            const q = g.getScreenCoords(s.lat, s.lng, 0.02);
            return Math.abs(p.x - q.x) < bubbleWidth(dimRef.current) * 0.85 && Math.abs(p.y - q.y) < 64;
          });
          if (clash) continue;
        } else if (shown.some((s) => angDist(s.lat, s.lng, c.lat, c.lng) < 15)) continue;
        cursor.current = (cursor.current + tries + 1) % n;
        return c;
      }
      return null;
    };

    const tick = () => {
      const now = performance.now();
      const maxLive = MAX_LIVE;
      let next = bubblesRef.current.filter((b) => !b.leaving);
      // 1. retire every card older than LIFE_MS (and any overflow if the container shrank)
      next = next.map((b, idx) => {
        const expired = now - b.born >= LIFE_MS || idx < next.length - maxLive;
        if (!expired) return b;
        const el = bubbleEls.current.get(b.comment.id);
        if (el) setBubbleLeaving(el, reducedMotion);
        return { ...b, leaving: true };
      });
      // 2. fill the free slots with new comments facing the camera, one pop per tick for a lively rhythm
      const live = next.filter((b) => !b.leaving);
      if (live.length < maxLive) {
        const c = pick(live);
        if (c) next = [...next, { comment: c, leaving: false, born: now }];
      }
      bubblesRef.current = next;
      setBubbles(next);
    };
    tick();
    const iv = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(iv);
  }, [commentsOn, ready, active, reducedMotion]);

  // physically remove bubbles once their exit transition is over
  useEffect(() => {
    if (!bubbles.some((b) => b.leaving)) return;
    const t = window.setTimeout(() => {
      const next = bubblesRef.current.filter((b) => {
        if (b.leaving) bubbleEls.current.delete(b.comment.id);
        return !b.leaving;
      });
      bubblesRef.current = next;
      setBubbles(next);
    }, EXIT_MS + 50);
    return () => window.clearTimeout(t);
  }, [bubbles]);

  /* ---------- html layer data ---------- */
  const labels = useMemo<MarketLabel[]>(
    () => MARKETS.map((m) => ({ kind: "label", id: m.id, lat: m.lat, lng: m.lng })),
    [],
  );
  const htmlData: HtmlDatum[] = isPicker ? labels : commentsOn ? bubbles : [];

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const labelEls = useRef(new Map<MarketId, HTMLButtonElement>());
  const makeHtml = useCallback(
    (d: object): HTMLElement => {
      const datum = d as HtmlDatum;
      if (isLabel(datum)) {
        const m = marketById(datum.id);
        const root = document.createElement("div");
        root.dataset.label = m.id;
        root.style.transition = "opacity 200ms ease";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.tabIndex = -1; // keyboard users use the accessible list in MarketGlobe
        btn.className =
          "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface/90 px-2.5 py-1 font-sans text-[11px] font-semibold text-ink shadow-card ring-1 ring-line backdrop-blur-sm transition hover:ring-brand";
        btn.style.pointerEvents = "auto";
        btn.style.cursor = "pointer";
        const dot = document.createElement("span");
        dot.className = "inline-block size-2 rounded-full";
        dot.style.background = `var(${m.colorVar})`;
        btn.append(dot, document.createTextNode(m.name));
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current?.(m.id);
        });
        btn.addEventListener("pointerenter", () => setHovered(m.id));
        btn.addEventListener("pointerleave", () => setHovered(null));
        root.appendChild(btn);
        labelEls.current.set(m.id, btn);
        return root;
      }
      const el = buildBubble(datum.comment, reducedMotion, bubbleWidth(dimRef.current));
      bubbleEls.current.set(datum.comment.id, el);
      return el;
    },
    [reducedMotion],
  );

  // reflect the selection on the label pills without recreating them
  useEffect(() => {
    labelEls.current.forEach((btn, id) => {
      const on = id === selected;
      btn.classList.toggle("ring-2", on);
      btn.classList.toggle("ring-brand", on);
      btn.classList.toggle("ring-line", !on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }, [selected, ready, htmlData.length]);

  const visibilityModifier = useCallback((el: HTMLElement, libVisible: boolean) => {
    // Market labels: also hide when their point faces away from the camera
    // (angular distance from the view centre > 85°), so a far-side label never shows through the globe.
    let visible = libVisible;
    const labelId = el.dataset.label as MarketId | undefined;
    const g = globeRef.current;
    if (visible && labelId && g) {
      const pov = g.pointOfView();
      const m = marketById(labelId);
      const rad = Math.PI / 180;
      const cos =
        Math.sin(pov.lat * rad) * Math.sin(m.lat * rad) +
        Math.cos(pov.lat * rad) * Math.cos(m.lat * rad) * Math.cos((pov.lng - m.lng) * rad);
      visible = cos > Math.cos(85 * rad);
    }
    el.style.opacity = visible ? "1" : "0";
    el.style.visibility = visible ? "visible" : "hidden";
    if (!visible || el.dataset.bubble === undefined) return;
    // Keep the bubble card inside the canvas: shift it horizontally, flip below the anchor near the top.
    const wrap = wrapRef.current;
    const pos = el.querySelector<HTMLElement>("[data-pos]");
    if (!wrap || !pos) return;
    const w = Number(el.dataset.bubble);
    const box = wrap.getBoundingClientRect();
    const a = el.getBoundingClientRect();
    const x = a.left - box.left;
    const y = a.top - box.top;
    const h = pos.offsetHeight || 90;
    const minShift = EDGE - x;
    const maxShift = box.width - EDGE - x - w;
    const shift = Math.max(minShift, Math.min(maxShift, -w / 2));
    pos.style.transform = `translateX(${Math.round(shift)}px)`;
    const below = y - h - 8 < EDGE;
    pos.style.bottom = below ? "auto" : "8px";
    pos.style.top = below ? "8px" : "auto";
  }, []);

  /* ---------- polygon styling ---------- */
  const marketOf = (d: object) => (d as CountryFeature).properties.market;

  const capColor = useCallback(
    (d: object) => {
      const m = marketOf(d);
      if (!m) return palette.land;
      const c = palette.market[m];
      if (!isPicker) return rgba(c, 0.82);
      if (m === selected) return rgba(c, 0.95);
      if (m === hovered) return rgba(c, 0.75);
      return rgba(c, selected ? 0.32 : 0.5);
    },
    [palette, isPicker, selected, hovered],
  );

  const sideColor = useCallback(
    (d: object) => {
      const m = marketOf(d);
      if (!m) return palette.landSide;
      return rgba(palette.market[m], isPicker && m !== selected ? 0.25 : 0.45);
    },
    [palette, isPicker, selected],
  );

  const altitude = useCallback(
    (d: object) => {
      const m = marketOf(d);
      if (!m) return 0.005;
      if (!isPicker) return 0.018;
      if (m === selected) return 0.05;
      if (m === hovered) return 0.032;
      return 0.014;
    },
    [isPicker, selected, hovered],
  );

  const strokeColor = useCallback(() => palette.border, [palette]);

  const handlePolygonHover = useCallback(
    (d: object | null) => {
      if (!isPicker) return;
      setHovered(d ? marketOf(d) : null);
    },
    [isPicker],
  );

  const handlePolygonClick = useCallback(
    (d: object) => {
      const m = marketOf(d);
      if (isPicker && m) onSelectRef.current?.(m);
    },
    [isPicker],
  );

  const pointerCursor = useCallback(
    (objType: string, d: object) => isPicker && objType === "polygon" && !!d && !!marketOf(d),
    [isPicker],
  );

  /* tooltip follows the pointer without re-rendering */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap) return;
    const r = wrap.getBoundingClientRect();
    tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
  }, []);

  const material = useMemo(
    () => new MeshPhongMaterial({ color: palette.sphere, emissive: palette.sphere, emissiveIntensity: 0.55, shininess: 6 }),
    [palette],
  );
  useEffect(() => () => material.dispose(), [material]);

  const hoveredMarket = isPicker && hovered ? marketById(hovered) : null;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      style={size ? { width: size, height: size } : undefined}
      onPointerMove={isPicker ? onPointerMove : undefined}
      onPointerLeave={isPicker ? () => setHovered(null) : undefined}
    >
      {dim > 0 && (
        <Globe
          ref={globeRef}
          width={dim}
          height={dim}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          animateIn={!reducedMotion}
          globeMaterial={material}
          showGraticules={false}
          showAtmosphere
          atmosphereColor={palette.atmosphere}
          atmosphereAltitude={0.16}
          onGlobeReady={handleReady}
          polygonsData={countries}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonCapCurvatureResolution={6}
          polygonsTransitionDuration={reducedMotion ? 0 : 350}
          onPolygonHover={handlePolygonHover}
          onPolygonClick={handlePolygonClick}
          showPointerCursor={pointerCursor}
          htmlElementsData={htmlData}
          htmlLat={(d: object) => (isLabel(d as HtmlDatum) ? (d as MarketLabel).lat : (d as Bubble).comment.lat)}
          htmlLng={(d: object) => (isLabel(d as HtmlDatum) ? (d as MarketLabel).lng : (d as Bubble).comment.lng)}
          htmlAltitude={isPicker ? 0.06 : 0.02}
          htmlElement={makeHtml}
          htmlElementVisibilityModifier={visibilityModifier}
          htmlTransitionDuration={0}
        />
      )}

      {isPicker && (
        <div
          ref={tipRef}
          role="tooltip"
          aria-hidden={!hoveredMarket}
          className="pointer-events-none absolute left-0 top-0 z-10 max-w-[240px] rounded-xl bg-surface/95 px-3 py-2 text-left shadow-float ring-1 ring-line backdrop-blur-sm transition-opacity duration-150"
          style={{ opacity: hoveredMarket ? 1 : 0 }}
        >
          {hoveredMarket && (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <span className="inline-block size-2 rounded-full" style={{ background: `var(${hoveredMarket.colorVar})` }} />
                {hoveredMarket.name}
                {hoveredMarket.id === selected && <span className="ml-1 text-[10px] font-medium text-brand">Selected</span>}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-ink-soft">{hoveredMarket.focus}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
