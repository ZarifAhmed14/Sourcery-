"use client"

// /app/compare — comparison view for the latest sourcing run.
// Reads the SourcingResult from localStorage (saved by the chat page) so we don't
// re-pay the orchestrator for the hand-off. Hosts ProfitPanel + SimulationPanel.

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfitPanel } from "@/components/sourcery/profit-panel"
import { SimulationPanel } from "@/components/sourcery/simulation-panel"
import { BargainDialog } from "@/components/sourcery/bargain-dialog"
import { loadLatestResult } from "@/lib/sourcing-result-store"
import { DEFAULT_PROFIT_INPUTS, type ProfitInputs } from "@/lib/profit"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

export default function ComparePage() {
  // Loaded sourcing result — null until the client effect runs.
  const [result, setResult] = useState<SourcingResult | null>(null)
  // Profit inputs — owned at the page level so both panels share state.
  const [profitInputs, setProfitInputs] = useState<ProfitInputs>(DEFAULT_PROFIT_INPUTS)

  // Hydrate the result from localStorage exactly once on mount.
  useEffect(() => {
    setResult(loadLatestResult())
  }, [])

  // Slice down to the top 5 suppliers by Discovery rank for a focused comparison.
  const top5 = useMemo(() => {
    if (!result) return []
    const top5Discovery = result.discovery.slice().sort((a, b) => a.rank - b.rank).slice(0, 5)
    return top5Discovery.map((d) => result.suppliers.find((s) => s.id === d.supplier_id)!).filter(Boolean)
  }, [result])

  // Empty state when nothing has been sourced yet.
  if (!result || top5.length === 0) {
    return (
      <Empty className="rounded-2xl border border-border/70 bg-card py-16">
        <EmptyHeader>
          <EmptyTitle>No sourcing run yet</EmptyTitle>
          <EmptyDescription>Run a sourcing query first — the comparison view will load your top 5 suppliers automatically.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-full">
            <Link href="/app">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Go to Sourcing
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-10">
      {/* Page header. */}
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Step 02 / Compare</p>
        <h1 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
          Top 5 suppliers, <span className="italic text-muted-foreground">side by side.</span>
        </h1>
        <p className="text-sm text-muted-foreground">For: {result.meta.query}</p>
      </header>

      {/* Profit Engine. */}
      <ProfitPanel suppliers={top5} inputs={profitInputs} onChange={setProfitInputs} />

      {/* Simulation Engine. */}
      <SimulationPanel suppliers={top5} baseInputs={profitInputs} />

      {/* Bargain Copilot row — only when BD mode + South Asia. */}
      {result.meta.bangladeshMode && (
        <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Bargain Copilot</p>
          <h2 className="font-serif text-2xl text-foreground">Reach out in Bangla</h2>
          <p className="text-sm text-muted-foreground">Generate culturally-appropriate Bangla outreach for South Asian suppliers in your shortlist.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {top5
              .filter((s) => s.region === "South Asia")
              .map((s) => (
                <BargainDialog key={s.id} supplier={s} productDescription={result.meta.query} orderQuantity={profitInputs.order_quantity} />
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
