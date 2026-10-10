/* Dixi logo (light mode). Named after the Dixi 3/15, BMW's first car (1928).
 * Mark: a globe (the markets we listen to) crossed by a decision track.
 * The track runs from a light-blue signal, through BMW-blue evidence, to an M-red node: the human sign-off.
 */
type LogoProps = { className?: string; withWordmark?: boolean; size?: number };

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} role="img" aria-label="Dixi">
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--brand)" strokeWidth="2.4" />
      <ellipse cx="20" cy="20" rx="7" ry="16" fill="none" stroke="var(--brand)" strokeWidth="1.4" opacity=".35" />
      <path d="M4.5 20h31" stroke="var(--brand)" strokeWidth="1.4" opacity=".35" />
      <path d="M7 27 C 13 27, 15 13, 22 13 S 30 19, 33.5 19" fill="none" stroke="var(--brand-deep)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="7" cy="27" r="2.7" fill="var(--brand-sky)" />
      <circle cx="22" cy="13" r="2.7" fill="var(--brand)" />
      <circle cx="33.5" cy="19" r="3" fill="var(--human)" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true, size = 32 }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="text-[1.35rem] font-semibold tracking-tight text-ink">
          di<span className="text-brand">xi</span>
        </span>
      )}
    </span>
  );
}
