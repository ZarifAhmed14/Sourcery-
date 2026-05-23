import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { SupplierCategory } from "@/lib/types"

const LATEST_KEY = "sourcery.latest_result.v1"
const RECENT_KEY = "sourcery.recent_queries.v1"
const SHORTLIST_KEY = "sourcery.shortlist_ids.v1"
const WORKSPACE_KEY = "sourcery.workspace_state.v1"
const COMPARE_IDS_KEY = "sourcery.compare_ids.v1"
const WORKSPACE_RETURN_KEY = "sourcery.workspace_return.v1"

export type RecentQuery = {
  query: string
  bangladeshMode: boolean
  count: number
  ts: string
  category?: SupplierCategory
  product?: string
  confidence?: "high" | "medium" | "low"
}

export type WorkspaceState = {
  query: string
  hasSearched: boolean
  selectedCategory?: string
  selectedProduct?: string
  selectedCountry: string
  selectedRegion: string
  priceBand: string
  orderQuantity: string
  selectedVariant?: string | null
  selectedSize?: string | null
  selectedId?: string | null
  scrollY?: number
}

export function saveLatestResult(result: SourcingResult): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(LATEST_KEY, JSON.stringify(result))
  } catch {}
}

export function loadLatestResult(): SourcingResult | null {
  try {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(LATEST_KEY)
    return raw ? (JSON.parse(raw) as SourcingResult) : null
  } catch {
    return null
  }
}

export function pushRecentQuery(entry: RecentQuery): void {
  try {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(RECENT_KEY)
    const list: RecentQuery[] = raw ? JSON.parse(raw) : []
    const filtered = list.filter((x) => !(x.query === entry.query && x.bangladeshMode === entry.bangladeshMode))
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...filtered].slice(0, 10)))
  } catch {}
}

export function readRecentQueries(): RecentQuery[] {
  try {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentQuery[]) : []
  } catch {
    return []
  }
}

export function saveShortlistIds(ids: string[]): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify(ids.slice(0, 4)))
  } catch {}
}

export function readShortlistIds(): string[] {
  try {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(SHORTLIST_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveWorkspaceState(state: WorkspaceState): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state))
  } catch {}
}

export function readWorkspaceState(): WorkspaceState | null {
  try {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(WORKSPACE_KEY)
    return raw ? (JSON.parse(raw) as WorkspaceState) : null
  } catch {
    return null
  }
}

export function saveCompareSupplierIds(ids: string[]): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(COMPARE_IDS_KEY, JSON.stringify(ids))
  } catch {}
}

export function readCompareSupplierIds(): string[] {
  try {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(COMPARE_IDS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function markWorkspaceReturnIntent(): void {
  try {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(WORKSPACE_RETURN_KEY, "1")
  } catch {}
}

export function consumeWorkspaceReturnIntent(): boolean {
  try {
    if (typeof window === "undefined") return false
    const raw = window.sessionStorage.getItem(WORKSPACE_RETURN_KEY)
    if (raw !== "1") return false
    window.sessionStorage.removeItem(WORKSPACE_RETURN_KEY)
    return true
  } catch {
    return false
  }
}
