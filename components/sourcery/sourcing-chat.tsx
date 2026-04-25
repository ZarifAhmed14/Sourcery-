"use client"

// Main sourcing-chat experience. Sends a query + bangladeshMode flag to /api/source,
// shows a "thinking" status while the orchestrator runs, then renders supplier cards.

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SupplierCard } from "@/components/sourcery/supplier-card"
import { usePreferences } from "@/lib/preferences-context"
import { saveLatestResult, pushRecentQuery } from "@/lib/sourcing-result-store"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"

// Quick-start prompt suggestions to give first-time users an easy path in.
const STARTERS = [
  "GOTS-certified organic cotton oversized hoodies, 320 GSM, MOQ 300",
  "Vegan skincare manufacturer for serums and creams, ISO 22716, MOQ 1000",
  "Hand-knotted wool rugs, GoodWeave certified, custom designs",
  "Single-origin specialty coffee, Rainforest Alliance, 500 kg minimum",
]

export function SourcingChat() {
  // Controlled query input.
  const [query, setQuery] = useState("")
  // Status state machine: idle → submitting (network) → reasoning (LLM) → done | error.
  const [status, setStatus] = useState<"idle" | "submitting" | "reasoning" | "done" | "error">("idle")
  // The last orchestrator response — drives the result card grid.
  const [result, setResult] = useState<SourcingResult | null>(null)
  // Surfaceable error message.
  const [error, setError] = useState<string | null>(null)
  // Read BD-mode from the global preferences context.
  const { bangladeshMode } = usePreferences()
  // Pull the optional ?prefill=… param the dashboard's "Re-run" button uses.
  const searchParams = useSearchParams()
  const prefill = searchParams?.get("prefill") ?? null
  // One-shot prefill on mount when the link arrives with a query.
  useEffect(() => {
    if (prefill && !query) setQuery(prefill)
    // Intentionally only runs when `prefill` changes — we don't want to overwrite user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  // Submit handler — POSTs to the orchestrator API and renders results.
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 5) return
    setError(null)
    setStatus("submitting")

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, bangladeshMode }),
      })
      // Switch to reasoning state once the request is in flight.
      setStatus("reasoning")
      // Parse response.
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody?.error ?? `Request failed (${res.status})`)
      }
      const data = (await res.json()) as SourcingResult
      setResult(data)
      // Persist for the /app/compare hand-off.
      saveLatestResult(data)
      // Append to the recent-queries list for the dashboard.
      pushRecentQuery({ query: trimmed, bangladeshMode, count: data.suppliers.length, ts: new Date().toISOString() })
      setStatus("done")
    } catch (err) {
      console.log("[v0] sourcing-chat error:", (err as Error).message)
      setError((err as Error).message)
      setStatus("error")
    }
  }

  return (
    <div className="space-y-8">
      {/* Header — page intent. */}
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 01 / Sourcing</p>
        <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
          Describe your product. <span className="italic text-muted-foreground">We&apos;ll find the suppliers.</span>
        </h1>
      </header>

      {/* Form — large textarea + submit button + starter chips. */}
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. GOTS-certified organic cotton hoodies, 320 GSM heavyweight fleece, MOQ 300, lead time under 35 days, BSCI compliant"
          rows={4}
          className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          disabled={status === "submitting" || status === "reasoning"}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Starter chips. */}
          <div className="flex flex-wrap gap-2">
            {STARTERS.slice(0, 2).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {s.length > 60 ? `${s.slice(0, 57)}…` : s}
              </button>
            ))}
          </div>
          {/* Submit button. */}
          <Button type="submit" disabled={status === "submitting" || status === "reasoning" || query.trim().length < 5} className="rounded-full">
            {status === "submitting" || status === "reasoning" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sourcing
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Run sourcing agent
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Status — progressive copy describing what the orchestrator is doing. */}
      {(status === "submitting" || status === "reasoning") && (
        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-5">
          <Sparkles className="mt-0.5 h-5 w-5 animate-pulse text-foreground" aria-hidden />
          <div className="space-y-1.5 text-sm">
            <div className="font-medium text-foreground">Multi-agent orchestrator running…</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>· Retrieving candidates from supplier knowledge base</li>
              <li>· Discovery agent ranking by fit</li>
              <li>· Risk agent flagging exposure</li>
              <li>· Comparison agent building scorecards</li>
              {bangladeshMode && <li>· Bangladesh Mode adjustments applied</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Error state. */}
      {status === "error" && error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-50 p-4 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Result list. */}
      {result && status === "done" && (
        <section className="space-y-4">
          {/* Result meta strip. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-foreground">{result.suppliers.length} suppliers ranked</div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Confidence {result.meta.confidence} · {result.meta.country_diversity} countries
                {result.meta.cached ? " · cached" : ""}
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <Link href="/app/compare">
                Open comparison
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* The supplier cards themselves — one per shortlisted result. */}
          <div className="space-y-4">
            {result.discovery
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((d) => {
                const supplier = result.suppliers.find((s) => s.id === d.supplier_id)
                const risk = result.risk.find((r) => r.supplier_id === d.supplier_id)
                const comparison = result.comparison.find((c) => c.supplier_id === d.supplier_id)
                if (!supplier || !risk || !comparison) return null
                return (
                  <SupplierCard
                    key={d.supplier_id}
                    supplier={supplier}
                    discovery={d}
                    risk={risk}
                    comparison={comparison}
                    bangladeshMode={result.meta.bangladeshMode}
                  />
                )
              })}
          </div>
        </section>
      )}
    </div>
  )
}
