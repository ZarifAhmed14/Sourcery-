"use client"

// /app/dashboard — recent sourcing runs (localStorage-only for the MVP, no auth dependency).
// Lets the user re-run a previous query in one click.

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { readRecentQueries, type RecentQuery } from "@/lib/sourcing-result-store"

export default function DashboardPage() {
  // Recent queries from localStorage.
  const [recent, setRecent] = useState<RecentQuery[]>([])

  // Hydrate once on mount.
  useEffect(() => {
    setRecent(readRecentQueries())
  }, [])

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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent runs</p>
        <h1 className="font-serif text-4xl text-foreground">Pick up where you left off</h1>
      </header>

      <ul className="space-y-2">
        {recent.map((r, i) => (
          <li key={`${r.ts}-${i}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-medium text-foreground">{r.query}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{new Date(r.ts).toLocaleString()}</span>
                <span>·</span>
                <span>{r.count} suppliers</span>
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
    </div>
  )
}
