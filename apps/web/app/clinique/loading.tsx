/**
 * Group-level fallback shown while any clinique/* route is mounting.
 * The sidebar + topbar are rendered by the parent layout — this only
 * skeletons the content area.
 */
export default function CliniqueLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      {/* Page heading */}
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-gray-200" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-gray-100" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-white p-5 space-y-3"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Main content skeleton — table-shaped */}
      <div className="rounded-2xl border border-border bg-white">
        <div className="border-b border-border p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
