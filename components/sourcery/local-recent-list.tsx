// Client island that renders the device-local sourcing history (localStorage-backed).
// Used only by guests — signed-in users see the cloud-synced version directly in the
// dashboard server component.

"use client"

// Hooks for hydrating the localStorage-backed list on the client.
import { useEffect, useState } from "react"
// Next.js Link for re-run navigation.
import Link from "next/link"
// Icons that match the cloud variant.
import { ArrowRight, Clock } from "lucide-react"
// Shared design-system primitives.
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
// Existing localStorage helper that already powers the rest of the app.
import { readRecentQueries, type RecentQuery } from "@/lib/sourcing-result-store"

// Named export so the dashboard server component can import it as `{ LocalRecentList }`.
export function LocalRecentList() {
  // State for the queries we've read from localStorage.
  const [recent, setRecent] = useState<RecentQuery[]>([])

  // Hydrate once after mount — localStorage is unavailable on the server.
  useEffect(() => {
    setRecent(readRecentQueries())
  }, [])

  // Empty state mirrors the cloud variant for visual consistency.
  if (recent.length === 0) {
    return (
      <Empty className="rounded-2xl border border-border/70 bg-card py-16">
        <EmptyHeader>
          <EmptyTitle>No recent searches</EmptyTitle>
          <EmptyDescription>Sourcing runs you complete will show up here for one-click re-runs.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-full">
            <Link href="/app">
              Go to Sourcing
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  // Otherwise render the same row layout as the cloud list so the visual language stays consistent.
  return (
    <ul className="space-y-2">
      {recent.map((r, i) => (
        <li
          key={`${r.ts}-${i}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-medium text-foreground">{r.query}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span>{new Date(r.ts).toLocaleString()}</span>
              <span>·</span>
              <span>{r.count} suppliers</span>
              {r.product && (
                <>
                  <span>·</span>
                  <span>{r.product}</span>
                </>
              )}
              {r.confidence && (
                <>
                  <span>·</span>
                  <span className="capitalize">{r.confidence} confidence</span>
                </>
              )}
              {r.bangladeshMode && (
                <>
                  <span>·</span>
                  <span className="text-[#f97316]">Bangladesh Mode</span>
                </>
              )}
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
            <Link href={`/app?prefill=${encodeURIComponent(r.query)}`}>
              Re-run
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}
