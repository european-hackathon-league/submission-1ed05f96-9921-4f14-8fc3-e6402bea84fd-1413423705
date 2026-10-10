import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "./UserMenu";

/** App bar: logo, Dashboard, the one "New analysis" button, and who is deciding. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Dixi home" className="shrink-0">
          <Logo size={26} />
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <Link href="/dashboard" className="text-sm font-medium text-ink-soft hover:text-ink">
          Dashboard
        </Link>
        <Link href="/dashboard/new" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-white shadow-card hover:bg-brand-deep">
          <Plus aria-hidden className="size-4" /> New analysis
        </Link>
        <Link href="/dashboard/settings" aria-label="Settings" title="Scoring settings" className="flex size-9 items-center justify-center rounded-full text-ink-soft ring-1 ring-line hover:bg-bg-soft hover:text-ink">
          <SlidersHorizontal aria-hidden className="size-4" />
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
