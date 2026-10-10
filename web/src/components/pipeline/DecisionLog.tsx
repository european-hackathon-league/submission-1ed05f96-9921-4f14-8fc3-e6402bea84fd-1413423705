import type { Decisions } from "@/lib/pipeline/profiles";

/** Every keep / reject (with reason) / wishlist decision, newest first. `full` drops the scroll cap. */
export function DecisionLog({ decisions, full }: { decisions: Decisions; full?: boolean }) {
  const list = Object.values(decisions).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Decisions</h2>
      {list.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">Nothing decided yet. Keep or reject requests; each decision is logged here with its reason.</p>
      ) : (
        <ul className={`divide-y divide-line ${full ? "" : "max-h-80 overflow-y-auto"}`}>
          {list.map((d) => (
            <li key={d.requestId} className="px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${d.action === "keep" ? "text-good" : d.action === "wish" ? "text-brand" : "text-bad"}`}>
                  {d.action === "keep" ? "Kept" : d.action === "wish" ? "Wishlist" : "Rejected"}
                </span>
                <span className="truncate font-medium text-ink">{d.title}</span>
              </p>
              {d.reason && <p className="mt-0.5 text-ink-soft">“{d.reason}”</p>}
              <p className="mt-0.5 text-xs text-muted">
                <span className="font-medium text-ink-soft">{d.by}</span>
                {d.role && ` (${d.role})`} · {new Date(d.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
