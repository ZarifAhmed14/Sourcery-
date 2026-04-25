// /app/dashboard — sourcing run history. Server Component that decides between
// cloud-backed history (signed-in users) and device-local history (everyone else).

// Server-side Supabase client for reading the signed-in user's saved searches.
import { createClient } from "@/lib/supabase/server"
// Client-only fallback list (reads localStorage). Used when there's no auth session.
import { LocalRecentList } from "@/components/sourcery/local-recent-list"
// Client-only re-run button reused for cloud rows too.
import Link from "next/link"
import { ArrowRight, Cloud, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

// Shape of a row coming back from the saved_searches table.
type SavedSearchRow = {
  id: string
  query: string
  bangladesh_mode: boolean
  created_at: string
  metadata: { result_count?: number; confidence?: "high" | "medium" | "low"; country_diversity?: number } | null
}

// Server Component — async function executed on the server every request.
export default async function DashboardPage() {
  // Build the request-bound Supabase client.
  const supabase = await createClient()
  // Identify the user (returns null for guests).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Guests see the existing client-side localStorage list — no auth required.
  if (!user) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent runs</p>
          <h1 className="font-serif text-4xl text-foreground">Pick up where you left off</h1>
          <p className="text-sm text-muted-foreground">
            History is stored on this device only.{" "}
            <Link href="/auth/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>{" "}
            to sync runs across devices.
          </p>
        </header>
        {/* Client island — reads localStorage, renders empty state if needed. */}
        <LocalRecentList />
      </div>
    )
  }

  // Authenticated path — pull the user's saved runs from Supabase. RLS limits this to their own rows.
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, query, bangladesh_mode, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(50)
  // Log any errors but never crash the page.
  if (error) console.log("[v0] dashboard saved_searches read failed:", error.message)
  // Cast through unknown to satisfy strict typing of the metadata jsonb column.
  const rows = ((data ?? []) as unknown) as SavedSearchRow[]

  // No saved runs yet — show the same empty state pattern as the guest view.
  if (rows.length === 0) {
    return (
      <Empty className="rounded-2xl border border-border/70 bg-card py-16">
        <EmptyHeader>
          <EmptyTitle>No saved runs yet</EmptyTitle>
          <EmptyDescription>Every sourcing run you complete will be saved here automatically.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-full">
            <Link href="/app">
              Run your first sourcing
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
        {/* Eyebrow — small uppercase mono label. */}
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Cloud history</p>
        {/* Editorial-serif headline matching the rest of the app. */}
        <h1 className="font-serif text-4xl text-foreground">Pick up where you left off</h1>
        {/* Subtle confirmation that runs are syncing. */}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Cloud className="h-3.5 w-3.5" aria-hidden /> Synced to your account
        </p>
      </header>

      {/* List of saved runs — each row is re-runnable in one click via /app?prefill=. */}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="line-clamp-1 text-sm font-medium text-foreground">{r.query}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <span>{new Date(r.created_at).toLocaleString()}</span>
                {/* Optional supplier count when present in metadata. */}
                {typeof r.metadata?.result_count === "number" && (
                  <>
                    <span>·</span>
                    <span>{r.metadata.result_count} suppliers</span>
                  </>
                )}
                {/* Optional confidence pill. */}
                {r.metadata?.confidence && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{r.metadata.confidence} confidence</span>
                  </>
                )}
                {/* Bangladesh mode flag — same orange accent as the toggle. */}
                {r.bangladesh_mode && (
                  <>
                    <span>·</span>
                    <span className="text-[#f97316]">Bangladesh Mode</span>
                  </>
                )}
              </div>
            </div>
            {/* One-click re-run by piping the query into /app?prefill=. */}
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
