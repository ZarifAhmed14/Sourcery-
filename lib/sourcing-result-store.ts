// Tiny localStorage shim that stores the most recent SourcingResult so the
// /app/compare page can hand-off without re-running the orchestrator.
// Also keeps a short "Recent searches" list for the sidebar.

import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { SupplierCategory } from "@/lib/types"

// Storage keys — namespaced under sourcery.* so they don't collide with anything else.
const LATEST_KEY = "sourcery.latest_result.v1"
const RECENT_KEY = "sourcery.recent_queries.v1"

// Stable summary shape used for the recent searches list.
export type RecentQuery = {
  // Original query string entered by the user.
  query: string
  // Whether Bangladesh Mode was active for that run.
  bangladeshMode: boolean
  // Number of suppliers returned.
  count: number
  // ISO timestamp when the run completed.
  ts: string
  category?: SupplierCategory
  product?: string
  confidence?: "high" | "medium" | "low"
}

// Persist the latest sourcing result so /app/compare can pick it up without re-fetching.
export function saveLatestResult(result: SourcingResult): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(LATEST_KEY, JSON.stringify(result))
  } catch (err) {
    console.log("[v0] saveLatestResult error:", (err as Error).message)
  }
}

// Read the latest sourcing result on the comparison page.
export function loadLatestResult(): SourcingResult | null {
  try {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(LATEST_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SourcingResult
  } catch (err) {
    console.log("[v0] loadLatestResult error:", (err as Error).message)
    return null
  }
}

// Append a query to the rolling recent-searches list (capped at 10 entries).
export function pushRecentQuery(entry: RecentQuery): void {
  try {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(RECENT_KEY)
    const list: RecentQuery[] = raw ? JSON.parse(raw) : []
    // Drop duplicates of the same query+mode combo.
    const filtered = list.filter((x) => !(x.query === entry.query && x.bangladeshMode === entry.bangladeshMode))
    const next = [entry, ...filtered].slice(0, 10)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch (err) {
    console.log("[v0] pushRecentQuery error:", (err as Error).message)
  }
}

// Read the recent searches list for the sidebar/dashboard.
export function readRecentQueries(): RecentQuery[] {
  try {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentQuery[]) : []
  } catch (err) {
    console.log("[v0] readRecentQueries error:", (err as Error).message)
    return []
  }
}
