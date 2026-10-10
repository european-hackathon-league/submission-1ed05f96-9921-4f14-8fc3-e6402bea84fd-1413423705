/** Calm placeholder while the market overview streams in. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading market overview" className="flex animate-pulse flex-col gap-6 motion-reduce:animate-none">
      <div className="h-16 w-64 rounded-lg bg-bg-soft" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-card bg-bg-soft" />
        ))}
      </div>
      <div className="h-96 rounded-card bg-bg-soft" />
    </div>
  );
}
