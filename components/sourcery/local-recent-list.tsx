"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { readRecentQueries, type RecentQuery } from "@/lib/sourcing-result-store"
import { buildWorkspaceRerunHref } from "@/lib/workspace-rerun"

export function LocalRecentList() {
  const [recent, setRecent] = useState<RecentQuery[]>([])

  useEffect(() => {
    setRecent(readRecentQueries())
  }, [])

  if (recent.length === 0) {
    return (
      <Empty className="rounded-2xl border border-border/70 bg-card py-16">
        <EmptyHeader>
          <EmptyTitle>No recent searches</EmptyTitle>
          <EmptyDescription>Supplier searches you complete will show up here for one-click re-runs.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-full">
            <Link href="/app">
              Go to Workspace
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul className="space-y-2">
      {recent.map((row, index) => (
        <li
          key={`${row.ts}-${index}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-medium text-foreground">{row.query}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span>{new Date(row.ts).toLocaleString()}</span>
              <span>·</span>
              <span>{row.count} suppliers</span>
              {row.product ? (
                <>
                  <span>·</span>
                  <span>{row.product}</span>
                </>
              ) : null}
              {row.type ? (
                <>
                  <span>·</span>
                  <span>{row.type}</span>
                </>
              ) : null}
              {row.confidence ? (
                <>
                  <span>·</span>
                  <span className="capitalize">{row.confidence} confidence</span>
                </>
              ) : null}
              {row.bangladeshMode ? (
                <>
                  <span>·</span>
                  <span className="text-[#f97316]">Bangladesh Mode</span>
                </>
              ) : null}
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full bg-transparent">
            <Link
              href={buildWorkspaceRerunHref({
                query: row.query,
                bangladeshMode: row.bangladeshMode,
                category: row.category,
                product: row.product,
                type: row.type,
              })}
            >
              Re-run
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}
