import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, Clock, Cloud, RotateCcw, SearchCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { LocalRecentList } from "@/components/sourcery/local-recent-list"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { buildWorkspaceRerunHref } from "@/lib/workspace-rerun"

type SavedSearchRow = {
  id: string
  query: string
  bangladesh_mode: boolean
  created_at: string
  metadata: { result_count?: number; confidence?: "high" | "medium" | "low"; country_diversity?: number; category?: string; product?: string; type?: string | null } | null
}

type LegacySavedSearchRow = {
  id: string
  query: string
  filters: { bangladesh_mode?: boolean; bangladeshMode?: boolean; type?: string | null } | null
  results_snapshot: unknown[] | null
  created_at: string
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <LocalHistoryShell mode="device" />
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => {
    return { data: { user: null } }
  })

  if (!user) {
    return <LocalHistoryShell mode="guest" />
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, query, bangladesh_mode, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(50)

  let rows = ((data ?? []) as unknown) as SavedSearchRow[]

  if (error) {
    const legacy = await supabase
      .from("saved_searches")
      .select("id, query, filters, results_snapshot, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    rows = legacy.error
      ? []
      : (((legacy.data ?? []) as unknown) as LegacySavedSearchRow[]).map((row) => ({
          id: row.id,
          query: row.query,
          bangladesh_mode: Boolean(row.filters?.bangladesh_mode ?? row.filters?.bangladeshMode ?? false),
          created_at: row.created_at,
          metadata: {
            result_count: Array.isArray(row.results_snapshot) ? row.results_snapshot.length : undefined,
            confidence: "medium",
            type: row.filters?.type ?? null,
          },
        }))
  }

  if (rows.length === 0) {
    return (
      <HistoryShell
        eyebrow="Cloud history"
        title="No saved runs yet"
        subtitle="Every signed-in supplier search will appear here for re-runs and audit trail review."
        status="Synced to Supabase"
      >
        <Empty className="rounded-lg border border-black/10 bg-white py-14 shadow-sm">
          <EmptyHeader>
            <EmptyTitle>No saved runs yet</EmptyTitle>
            <EmptyDescription>Find suppliers once and this page becomes your search memory.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
              <Link href="/app">
                Find suppliers
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </HistoryShell>
    )
  }

  return (
    <HistoryShell
      eyebrow="Cloud history"
      title="Search memory"
      subtitle="A judge-visible audit trail of the briefs the agents processed, when they ran, and what mode they used."
      status="Synced to Supabase"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Saved runs" value={String(rows.length)} />
        <Metric label="Latest run" value={new Date(rows[0].created_at).toLocaleDateString()} />
        <Metric label="BD mode runs" value={String(rows.filter((r) => r.bangladesh_mode).length)} />
      </div>

      <ul className="mt-5 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-semibold text-[#16201d]">{row.query}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6d7a75]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                  {typeof row.metadata?.result_count === "number" && <span>{row.metadata.result_count} suppliers</span>}
                  {row.metadata?.product && <span>{row.metadata.product}</span>}
                  {row.metadata?.type && <span>{row.metadata.type}</span>}
                  {row.metadata?.confidence && <span className="capitalize">{row.metadata.confidence} confidence</span>}
                  {row.bangladesh_mode && <span className="font-medium text-[#2e7d65]">Bangladesh Mode</span>}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-md bg-transparent">
                <Link
                  href={buildWorkspaceRerunHref({
                    query: row.query,
                    bangladeshMode: row.bangladesh_mode,
                    category: row.metadata?.category,
                    product: row.metadata?.product,
                    type: row.metadata?.type,
                  })}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Re-run
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </HistoryShell>
  )
}

function LocalHistoryShell({ mode }: { mode: "device" | "guest" }) {
  return (
    <HistoryShell
      eyebrow="Device history"
      title="Search memory"
      subtitle={mode === "device" ? "Supabase is not configured, so history is stored on this device." : "Guest runs stay on this device. Sign in later to sync across devices."}
      status="Local storage"
    >
      <LocalRecentList />
    </HistoryShell>
  )
}

function HistoryShell({
  eyebrow,
  title,
  subtitle,
  status,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  status: string
  children: ReactNode
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white/78 p-7 text-[#16201d] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">{eyebrow}</p>
            <h1 className="mt-3 font-serif text-5xl leading-none">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5d6965]">{subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-[#fffdf9] px-3 py-2 text-sm text-[#16201d]">
            <Cloud className="h-4 w-4 text-[#7a5b0f]" />
            {status}
          </div>
        </div>
      </section>
      {children}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <SearchCheck className="h-5 w-5 text-[#2e7d65]" />
      <div className="mt-3 text-2xl font-semibold text-[#16201d]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
    </div>
  )
}
