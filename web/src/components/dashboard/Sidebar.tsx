import type { ComponentType } from "react";

export type NavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Small count or dot next to the label. */
  badge?: React.ReactNode;
};

/** Section nav: a slim sidebar on desktop, a scrollable tab row on small screens.
 *  Shown once the pipeline has built profiles (profiles dashboard). */
export function Sidebar({ items, active, onSelect, label = "Dashboard sections" }: { items: NavItem[]; active: string; onSelect: (id: string) => void; label?: string }) {
  return (
    <nav aria-label={label} className="border-b border-line lg:w-52 lg:shrink-0 lg:border-b-0 lg:border-r lg:pr-3">
      <ul className="flex gap-1 overflow-x-auto py-2 lg:flex-col lg:py-0">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const on = id === active;
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  on ? "bg-brand-soft font-medium text-brand-deep" : "text-ink-soft hover:bg-bg-soft hover:text-ink"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {label}
                {badge !== undefined && <span className="ml-auto text-xs tabular-nums text-muted">{badge}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
