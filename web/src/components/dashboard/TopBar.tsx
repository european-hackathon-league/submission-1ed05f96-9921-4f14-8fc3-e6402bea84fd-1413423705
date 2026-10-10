import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Minimal app bar: logo home, section label, sample-data badge. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Dixi home" className="shrink-0">
          <Logo size={26} />
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <span className="text-sm font-medium text-ink-soft">Dashboard</span>
      </div>
    </header>
  );
}
