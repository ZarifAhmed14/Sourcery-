"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, GitCompare, LineChart, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfitPanel } from "@/components/sourcery/profit-panel"
import { SimulationPanel } from "@/components/sourcery/simulation-panel"
import { TermLabel } from "@/components/sourcery/term-help"
import { loadLatestResult, readShortlistIds } from "@/lib/sourcing-result-store"
import { DEFAULT_PROFIT_INPUTS, type ProfitInputs } from "@/lib/profit"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatMoney } from "@/lib/currency"
import { usePreferences } from "@/lib/preferences-context"
import { getProductImage } from "@/lib/product-images"

export default function ComparePage() {
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [profitInputs, setProfitInputs] = useState<ProfitInputs>(DEFAULT_PROFIT_INPUTS)
  const [shortlistIds, setShortlistIds] = useState<string[]>([])
  const { bangladeshMode } = usePreferences()

  useEffect(() => {
    setResult(loadLatestResult())
    setShortlistIds(readShortlistIds())
  }, [])

  const top5 = useMemo(() => {
    if (!result) return []
    const selected = new Set(shortlistIds)
    const ranked = result.discovery
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((d) => result.suppliers.find((s) => s.id === d.supplier_id)!)
      .filter(Boolean)
    const shortlisted = ranked.filter((supplier) => selected.has(supplier.id))
    return (shortlisted.length > 0 ? shortlisted : ranked).slice(0, 5)
  }, [result, shortlistIds])

  if (!result || top5.length === 0) {
    return (
      <Empty className="rounded-lg border border-black/10 bg-white py-16 shadow-sm">
        <EmptyHeader>
          <EmptyTitle>No sourcing run yet</EmptyTitle>
          <EmptyDescription>Run supplier intelligence first. Compare will load your top candidates automatically.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
            <Link href="/app">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Go to workspace
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const best = top5[0]
  const lowestRisk = top5.reduce((candidate, supplier) => (supplier.risk_score < candidate.risk_score ? supplier : candidate), best)
  const lowestUnit = top5.reduce((candidate, supplier) => (supplier.unit_price_usd < candidate.unit_price_usd ? supplier : candidate), best)
  const productName = best.products?.[0] ?? best.subcategory
  const productImage = getProductImage({ supplier: best, product: productName })

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/10 bg-white/78 p-7 text-[#16201d] shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Decision desk</p>
            <h1 className="mt-3 text-5xl font-semibold leading-none tracking-tight md:text-6xl">Compare the shortlist.</h1>
            <p className="mt-4 text-sm leading-6 text-[#5d6965]">Query: {result.meta.query}</p>
          </div>
          <div className="min-w-[260px] overflow-hidden rounded-xl border border-black/10 bg-[#16201d] text-[#f7f4ec] shadow-sm">
            <div className="h-36 overflow-hidden bg-[#ece7dc]">
              <img src={productImage.src} alt={productImage.alt} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9b44a]">Selected product</span>
              <strong className="mt-1 block text-lg text-white">{productName}</strong>
              <span className="mt-1 block text-sm text-[#bdc8c2]">{top5.length} suppliers ready for margin and simulation review</span>
            </div>
          </div>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <ProofPill icon={GitCompare} label={`${top5.length} suppliers`} detail="top-ranked candidates" />
          <ProofPill icon={ShieldCheck} label="Risk checked" detail="score, lead, certification" />
          <ProofPill icon={LineChart} label="Profit ready" detail="margin and landed cost" />
          <ProofPill icon={LineChart} label="Simulation" detail="profit stress test" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 text-[#d9b44a]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Recommendation summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">{best.name} is the current front-runner.</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d6965]">
                {lowestRisk.name} carries the lowest risk, while {lowestUnit.name} has the lowest unit price. Use the profit panel below to decide whether margin or operational reliability matters more for this order.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DecisionMetric label="Fastest lead" value={`${Math.min(...top5.map((s) => s.lead_time_days))}d`} />
          <DecisionMetric label="Lowest risk" value={`${lowestRisk.risk_score}/100`} />
          <DecisionMetric label="Lowest unit" value={formatMoney(lowestUnit.unit_price_usd, bangladeshMode)} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-[#f7f4ec] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Side-by-side review</p>
            <h2 className="mt-1 text-xl font-semibold text-[#16201d]">Decision table</h2>
          </div>
          <TrendingUp className="h-5 w-5 text-[#7a5b0f]" />
        </div>
        <div className="grid grid-cols-[1.25fr_0.65fr_0.55fr_0.55fr_0.55fr_0.75fr] gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a75]">
          <span>Supplier</span>
          <span>Location</span>
          <TermLabel label="Unit" />
          <TermLabel label="MOQ" />
          <TermLabel label="Lead" />
          <TermLabel label="Risk" />
        </div>
        {top5.map((supplier, index) => (
          <div key={supplier.id} className="grid grid-cols-[1.25fr_0.65fr_0.55fr_0.55fr_0.55fr_0.75fr] items-center gap-3 border-t border-black/10 px-5 py-4 text-sm">
            <div>
              <div className="font-semibold text-[#16201d]">#{index + 1} {supplier.name}</div>
              <div className="mt-1 text-xs text-[#6d7a75]">{supplier.certifications.slice(0, 3).join(", ") || "Certification not listed"}</div>
            </div>
            <span className="text-[#53605c]">{supplier.country}</span>
            <span className="font-semibold text-[#16201d]">{formatMoney(supplier.unit_price_usd, bangladeshMode)}</span>
            <span className="text-[#53605c]">{supplier.moq.toLocaleString()}</span>
            <span className="text-[#53605c]">{supplier.lead_time_days}d</span>
            <span className="w-fit rounded-full bg-[#f1ede3] px-3 py-1 text-xs font-semibold text-[#51605a]">{supplier.risk_score}/100</span>
          </div>
        ))}
      </section>

      <ProfitPanel suppliers={top5} inputs={profitInputs} onChange={setProfitInputs} />
      <SimulationPanel suppliers={top5} baseInputs={profitInputs} />
    </div>
  )
}

function DecisionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">
        <TermLabel label={label} />
      </div>
      <div className="mt-3 text-3xl font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function ProofPill({
  icon: Icon,
  label,
  detail,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  detail: string
}) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0d1714] p-3">
      <Icon className="h-4 w-4 text-[#d9b44a]" />
      <div className="mt-3 text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 text-xs text-[#bdc8c2]">{detail}</div>
    </div>
  )
}
