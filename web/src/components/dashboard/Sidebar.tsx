import { BookOpen, GitBranch, LayoutDashboard, ListChecks, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = { label: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; active?: boolean };

const NAV: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Requirements", icon: ListChecks },
  { label: "Lineage", icon: GitBranch },
  { label: "Weights", icon: SlidersHorizontal },
  { label: "Memory", icon: BookOpen },
];

/** Section nav: a slim sidebar on desktop, a scrollable tab row on small screens. Only Overview exists for now. */
export function Sidebar() {
  return (
    <nav aria-label="Dashboard sections" className="border-b border-line lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-6">
      <ul className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:flex-col lg:px-3 lg:py-0">
        {NAV.map(({ label, icon: Icon, active }) => (
          <li key={label} className="shrink-0">
            {active ? (
              <span
                aria-current="page"
                className="flex items-center gap-2.5 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-deep"
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </span>
            ) : (
              <span
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted/70"
              >
                <Icon aria-hidden className="size-4" />
                {label}
                <span className="hidden text-[0.65rem] uppercase tracking-wide text-muted/60 lg:ml-auto lg:inline">Soon</span>
                <span className="sr-only">(coming soon)</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
