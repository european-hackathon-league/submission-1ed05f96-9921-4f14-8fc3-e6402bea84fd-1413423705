/* Three-layer model with illustrative default weight shares per model. */

const LAYERS = [
  {
    key: "L1",
    name: "Principles",
    line: "Hard rules per market, owned by managers. Example: in Japan, the car must fit multi-storey car parks.",
    bar: "bg-l1 text-white",
    chip: "bg-l1-soft text-l1",
  },
  {
    key: "L2",
    name: "Evidence",
    line: "Customer studies, owner feedback, sales and quality reports. The main engine.",
    bar: "bg-l2 text-white",
    chip: "bg-l2-soft text-l2",
  },
  {
    key: "L3",
    name: "Signals",
    line: "Social media, search trends and concept tests. Low weight, tuned per model.",
    bar: "bg-l3 text-brand-deep",
    chip: "bg-l3-soft text-brand-deep",
  },
] as const;

const MODELS = [
  { name: "7 Series", note: "Signals barely count", weights: [55, 43, 2] },
  { name: "1 Series", note: "Younger buyers, more signal", weights: [45, 35, 20] },
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

      <div className="flex flex-col justify-center gap-8">
        {MODELS.map((m) => (
          <figure key={m.name}>
            <figcaption className="mb-2.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{m.name}</span>
              <span className="text-muted">{m.note}</span>
            </figcaption>
            <div
              className="flex h-12 overflow-hidden rounded-xl ring-1 ring-line"
              role="img"
              aria-label={`${m.name} default weights: principles ${m.weights[0]}%, evidence ${m.weights[1]}%, signals ${m.weights[2]}%`}
            >
              {LAYERS.map((l, i) => (
                <div
                  key={l.key}
                  className={`${l.bar} flex min-w-1 items-center justify-center text-xs font-semibold`}
                  style={{ width: `${m.weights[i]}%` }}
                >
                  {m.weights[i] >= 8 && (
                    <span>
                      {l.key} · {m.weights[i]}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {m.weights[2] < 8 && <p className="mt-1.5 text-right text-xs text-muted">L3 · {m.weights[2]}%</p>}
          </figure>
        ))}
        <p className="text-xs text-muted">Default weight shares. Managers can tune them per model.</p>
      </div>
    </div>
  );
}
