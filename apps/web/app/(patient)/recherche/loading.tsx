export default function RechercheLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDFA] to-white">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[#0891B2] to-[#0E7490] py-12 px-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-64 rounded-xl bg-white/20 animate-pulse mx-auto" />
          <div className="h-5 w-48 rounded-lg bg-white/15 animate-pulse mx-auto" />
          <div className="h-14 w-full rounded-2xl bg-white/20 animate-pulse mt-6" />
        </div>
      </div>

      {/* Results skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-5 w-40 rounded-lg bg-[#E6F4F1] animate-pulse mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E6F4F1] bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#F0FDFA] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-md bg-[#E6F4F1] animate-pulse" />
                  <div className="h-3 w-24 rounded-md bg-[#E6F4F1] animate-pulse" />
                </div>
              </div>
              <div className="h-3 w-full rounded-md bg-[#F0FDFA] animate-pulse" />
              <div className="h-3 w-3/4 rounded-md bg-[#F0FDFA] animate-pulse" />
              <div className="h-9 w-full rounded-xl bg-[#0891B2]/10 animate-pulse mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
