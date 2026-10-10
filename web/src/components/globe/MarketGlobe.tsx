"use client";

/* MarketGlobe: the shared globe used by the landing hero and the dashboard market picker.
 *
 * CONTRACT (other components rely on it; do not change the props without updating all users):
 *   <MarketGlobe variant="hero" />                         landing: auto-rotating globe, market countries highlighted,
 *                                                          sample comment bubbles (good/bad, BMW + competitors) pop up.
 *   <MarketGlobe variant="picker" selected={id} onSelect={fn} />
 *                                                          dashboard: click a market's countries (or its label) to select it;
 *                                                          the camera flies to the selected market.
 * The real WebGL implementation lives in ./GlobeCanvas (client-only, loaded with next/dynamic ssr:false).
 * This file is the stable entry point: square box, loading skeleton, accessible market buttons for the picker.
 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MarketId } from "@/lib/markets";
import { MARKETS } from "@/lib/markets";

export interface MarketGlobeProps {
  variant: "hero" | "picker";
  /** picker: currently selected market (highlighted stronger). */
  selected?: MarketId | null;
  /** picker: called when the user picks a market. */
  onSelect?: (id: MarketId) => void;
  /** hero: show the animated comment bubbles. Default true for hero. */
  showComments?: boolean;
  /** Default: true for hero, false for picker. */
  autoRotate?: boolean;
  /** Size of the square canvas area in px; defaults to fill the parent (width) with aspect-square. */
  size?: number;
  /** picker: render the accessible market buttons inside the globe square. Default true.
   *  Set false when the page offers its own keyboard-accessible market controls (e.g. the dashboard's market cards). */
  showMarketButtons?: boolean;
  className?: string;
}

function GlobeSkeleton() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="aspect-square w-[64%] animate-pulse rounded-full bg-gradient-to-br from-brand-soft via-white to-bg-soft shadow-[0_0_80px_10px_var(--brand-soft)] ring-1 ring-line" />
    </div>
  );
}

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), { ssr: false, loading: () => null });

export default function MarketGlobe({
  variant,
  selected = null,
  onSelect,
  showComments,
  autoRotate,
  size,
  showMarketButtons = true,
  className,
}: MarketGlobeProps) {
  const [ready, setReady] = useState(false);
  const isPicker = variant === "picker";

  // Next.js 16 keeps visited pages alive in the background (React <Activity>). Hiding a page runs effect
  // cleanups, and react-globe.gl treats that as unmount and destroys its WebGL renderer, so the canvas would
  // come back blank. When the page is shown again, remount the canvas with a new key so it re-initialises.
  const [mountKey, setMountKey] = useState(0);
  const wasHidden = useRef(false);
  useEffect(() => {
    if (wasHidden.current) {
      wasHidden.current = false;
      setReady(false);
      setMountKey((k) => k + 1);
    }
    return () => {
      wasHidden.current = true;
    };
  }, []);

  return (
    <div
      className={`relative ${size ? "" : "aspect-square w-full"} ${className ?? ""}`}
      style={size ? { width: size, height: size } : undefined}
      data-variant={variant}
    >
      {!ready && <GlobeSkeleton />}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
        aria-hidden={!isPicker || undefined}
        role={isPicker ? "img" : undefined}
        aria-label={isPicker ? "Interactive globe of the markets. Keyboard users can choose a market with the market buttons." : undefined}
      >
        <GlobeCanvas
          key={mountKey}
          variant={variant}
          selected={selected}
          onSelect={onSelect}
          showComments={showComments ?? !isPicker}
          autoRotate={autoRotate ?? !isPicker}
          size={size}
          onReady={() => setReady(true)}
        />
      </div>

      {isPicker && showMarketButtons && (
        <div
          role="group"
          aria-label="Choose a market"
          className="absolute inset-x-0 bottom-1 flex flex-wrap justify-center gap-1.5 px-2"
        >
          {MARKETS.map((m) => {
            const on = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect?.(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 backdrop-blur-sm transition-colors ${
                  on ? "bg-brand-soft text-brand-deep ring-brand" : "bg-surface/80 text-ink-soft ring-line hover:text-ink hover:ring-brand-sky"
                }`}
              >
                <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: `var(${m.colorVar})` }} />
                {m.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
