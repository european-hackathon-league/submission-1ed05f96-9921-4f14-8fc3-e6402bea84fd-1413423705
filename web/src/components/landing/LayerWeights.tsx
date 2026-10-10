/* Three-layer model with illustrative default weight shares per model (same split the pipeline uses:
 * L3 is fixed per series, L1 takes 45% of the rest, L2 the remainder). */

const LAYERS = [
  {
    key: "L1",
    name: "BMW principles",
    line: "The fundamentals the car must respect, owned by managers. Example: the 7 Series puts rear-seat comfort first.",
    bar: "bg-l1 text-white",
    chip: "bg-l1-soft text-l1",
  },
  {
    key: "L2",
    name: "Market evidence",
    line: "Customers, competitors and trends: feedback, studies, sales, today's option list and researched sources. The main engine.",
    bar: "bg-l2 text-white",
    chip: "bg-l2-soft text-l2",
  },
  {
    key: "L3",
    name: "Social test",
    line: "How the finished profiles do when posted. A low-weight tie-breaker, tuned per model.",
    bar: "bg-l3 text-ink",
    chip: "bg-l3-soft text-brand-deep",
  },
] as const;

const split = (l3: number): [number, number, number] => {
  const l1 = Math.round(45 * (1 - l3 / 100));
  return [l1, 100 - l1 - l3, l3];
};

const MODELS = [
  { name: "7 Series", note: "Social test barely counts", weights: split(2) },
  { name: "5 Series", note: "A light nudge", weights: split(8) },
  { name: "1 Series", note: "Younger buyers, more say", weights: split(20) },
];

export function LayerWeights() {
  return (
    <div className="mt-16 grid gap-10 rounded-card bg-surface p-6 shadow-card ring-1 ring-line sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-ink">Three layers, weighed per model</h3>
        <ul className="mt-6 space-y-5">
          {LAYERS.map((l) => (
            <li key={l.key} className="flex gap-4">
              <span className={`mt-0.5 h-6 shrink-0 rounded-md px-2 font-mono text-xs leading-6 font-semibold ${l.chip}`}>{l.key}</span>
              <div>
                <p className="font-semibold text-ink">{l.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{l.line}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center gap-7">
        {MODELS.map((m) => (
          <figure key={m.name}>
            <figcaption className="mb-2.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{m.name}</span>
              <span className="text-muted">
                {m.note} · <span className="font-medium text-ink-soft tabular-nums">L3 {m.weights[2]}%</span>
              </span>
            </figcaption>
            <div
              className="flex h-11 overflow-hidden rounded-xl ring-1 ring-line"
              role="img"
              aria-label={`${m.name} default weights: principles ${m.weights[0]}%, market evidence ${m.weights[1]}%, social test ${m.weights[2]}%`}
            >
              {LAYERS.map((l, i) => (
                <div
                  key={l.key}
                  className={`${l.bar} flex min-w-1 items-center justify-center text-xs font-semibold`}
                  style={{ width: `${m.weights[i]}%` }}
                >
                  {m.weights[i] >= 12 && (
                    <span>
                      {l.key} · {m.weights[i]}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </figure>
        ))}
        <p className="text-xs text-muted">Illustrative default shares. Managers can tune them per model.</p>
      </div>
    </div>
  );
}
