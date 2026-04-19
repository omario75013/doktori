export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-[#F0FDFA] to-white border-b border-[#E6F4F1] py-12 px-4">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="h-7 w-48 rounded-xl bg-[#E6F4F1] animate-pulse mx-auto" />
          <div className="h-5 w-80 rounded-lg bg-[#F0FDFA] animate-pulse mx-auto" />
        </div>
      </div>

      {/* Articles skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E6F4F1] bg-white overflow-hidden shadow-sm"
            >
              <div className="h-44 w-full bg-[#F0FDFA] animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 rounded-md bg-[#E6F4F1] animate-pulse" />
                <div className="h-5 w-full rounded-md bg-[#E6F4F1] animate-pulse" />
                <div className="h-4 w-5/6 rounded-md bg-[#F0FDFA] animate-pulse" />
                <div className="h-4 w-4/6 rounded-md bg-[#F0FDFA] animate-pulse" />
                <div className="h-3 w-24 rounded-md bg-[#F0FDFA] animate-pulse mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
