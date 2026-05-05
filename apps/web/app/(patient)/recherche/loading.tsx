export default function RechercheLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 dark:bg-gray-900">
      {/* Sticky search header skeleton — mirrors recherche-client layout to avoid CLS on hand-off */}
      <div className="sticky top-16 z-20 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-12 flex-1 animate-pulse rounded-xl border-2 border-border bg-white" />
            <div className="h-12 w-12 animate-pulse rounded-xl border-2 border-border bg-white lg:hidden" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_400px]">
          <aside className="hidden lg:block space-y-4">
            <div className="h-32 animate-pulse rounded-xl bg-white" />
            <div className="h-48 animate-pulse rounded-xl bg-white" />
            <div className="h-32 animate-pulse rounded-xl bg-white" />
          </aside>
          <div>
            {/* Mobile map/list toggle slot — reserve 36px so live page doesn't shift footer */}
            <div className="mb-4 h-9 lg:hidden" />
            {/* 20 single-col cards matching the live recherche-client internal skeleton */}
            <div className="grid gap-3" aria-hidden>
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5"
                >
                  <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                    <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-24 h-[600px] animate-pulse rounded-2xl bg-white" />
          </aside>
        </div>
      </div>
    </div>
  );
}
