// Loading skeleton shown while the supplier detail page fetches its row from Supabase.
// Skeletons mirror the actual layout dimensions so the page doesn't shift on load.

// Reusable shadcn Skeleton primitive.
import { Skeleton } from "@/components/ui/skeleton"

// Default export becomes the suspense boundary for /app/suppliers/[id].
export default function SupplierLoading() {
  return (
    // Constrain to the same max width as the real detail page.
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Eyebrow slot. */}
      <Skeleton className="h-4 w-40" />
      {/* Title slot — editorial headline height. */}
      <Skeleton className="mt-6 h-12 w-3/4" />
      {/* Subtitle / location row. */}
      <Skeleton className="mt-3 h-5 w-1/2" />

      {/* Stat grid — five cells matching the real card layout. */}
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
        {/* Render 5 stat skeleton cards. */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            {/* Stat label. */}
            <Skeleton className="h-3 w-16" />
            {/* Stat value. */}
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      {/* Description block. */}
      <div className="mt-12 space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-9/12" />
      </div>
    </main>
  )
}
