"use client"

import Image from "next/image"
import Link from "next/link"
import type { ComponentType } from "react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, GitCompare, LineChart, Mail, Plane, ShieldCheck, ShipWheel, Sparkles, TrendingUp, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfitPanel } from "@/components/sourcery/profit-panel"
import { SimulationPanel } from "@/components/sourcery/simulation-panel"
import { TermLabel } from "@/components/sourcery/term-help"
import { loadLatestResult, readCompareSupplierIds, readShortlistIds, readWorkspaceState } from "@/lib/sourcing-result-store"
import { DEFAULT_PROFIT_INPUTS, type ProfitInputs } from "@/lib/profit"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatMoney } from "@/lib/currency"
import { usePreferences } from "@/lib/preferences-context"
import { getProductImage, getProductVariantImage } from "@/lib/product-images"
import type { Supplier } from "@/lib/types"
import { BackNavButton } from "@/components/sourcery/back-nav-button"
import { inferSupplierLogisticsLane } from "@/lib/sourcery/supplier-profile-enrichment"

function resultModeLabel(meta?: SourcingResult["meta"] | null) {
  if (!meta) return "Focused review"
  return meta.result_mode === "ai_ranked" ? "AI-ranked" : "Data-ranked"
}

function confidenceLabel(meta?: SourcingResult["meta"] | null, supplierCount = 0) {
  if (!meta) return "Single supplier review"
  if (meta.result_quality === "limited_supplier_pool" || supplierCount < 3) return "Limited supplier pool"
  if (meta.result_quality === "high_confidence") return "High confidence"
  if (meta.result_quality === "rules_based_fallback") return "Standard confidence"
  return "Standard confidence"
}

function rankingReason(args: {
  supplier: Supplier
  rank: number
  result: SourcingResult | null
}) {
  const { supplier, rank, result } = args
  const discovery = result?.discovery.find((item) => item.supplier_id === supplier.id)
  const product = supplier.products?.[0] ?? supplier.subcategory
  const score = discovery ? `${Math.round(discovery.fit_score)}% fit` : "focused profile"
  const factors = discovery?.key_factors?.filter(Boolean).slice(0, 2).join(", ")
  const frontRunner = rank === 1 ? "Current front-runner" : "Backup comparison option"

  return `${frontRunner}: ${score} for ${product}, with ${formatMoney(supplier.unit_price_usd, false)} unit cost, ${supplier.moq.toLocaleString()} MOQ, and ${supplier.lead_time_days} day lead. ${
    factors ? `Signals: ${factors}.` : ""
  }`.trim()
}

function buyerWarning(meta?: SourcingResult["meta"] | null, supplierCount = 0) {
  if (!meta) return "This view is focused on one supplier, so compare it against alternatives before placing a real order."
  if (meta.result_quality === "limited_supplier_pool" || supplierCount < 3) {
    return "The supplier pool is narrow for this search. Use the profit view for screening, then verify samples, final quote, and delivery terms before committing."
  }
  return null
}

export default function ComparePage() {
  const searchParams = useSearchParams()
  const supplierId = searchParams.get("supplier")
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [profitInputs, setProfitInputs] = useState<ProfitInputs>(DEFAULT_PROFIT_INPUTS)
  const [shortlistIds, setShortlistIds] = useState<string[]>([])
  const [singleSupplier, setSingleSupplier] = useState<Supplier | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const { bangladeshMode } = usePreferences()

  useEffect(() => {
    const workspaceState = readWorkspaceState()
    setResult(loadLatestResult())
    setShortlistIds(readShortlistIds())
    setCompareIds(readCompareSupplierIds())
    setSelectedProduct(workspaceState?.selectedProduct ?? null)
    setSelectedVariant(workspaceState?.selectedVariant ?? null)
  }, [])

  useEffect(() => {
    let active = true
    if (!supplierId) {
      setSingleSupplier(null)
      return () => {
        active = false
      }
    }

    void fetch(`/api/suppliers/${supplierId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        setSingleSupplier((data?.supplier as Supplier | undefined) ?? null)
      })
      .catch(() => {
        if (active) setSingleSupplier(null)
      })

    return () => {
      active = false
    }
  }, [supplierId])

  const top5 = useMemo(() => {
    if (singleSupplier) return [singleSupplier]
    if (!result) return []
    const selected = new Set(shortlistIds)
    const compareSelected = new Set(compareIds)
    const ranked = result.discovery
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((d) => result.suppliers.find((s) => s.id === d.supplier_id)!)
      .filter(Boolean)
    const shortlisted = ranked.filter((supplier) => selected.has(supplier.id))
    const compareVisible = ranked.filter((supplier) => compareSelected.has(supplier.id))
    const source = shortlisted.length > 0 ? shortlisted : compareVisible.length > 0 ? compareVisible : ranked
    return source.slice(0, 5)
  }, [compareIds, result, shortlistIds, singleSupplier])

  if ((!result && !singleSupplier) || top5.length === 0) {
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
  const productName = selectedVariant ?? best.products?.[0] ?? best.subcategory
  const productImage =
    selectedProduct && selectedVariant
      ? getProductVariantImage(selectedProduct, selectedVariant, 0)
      : getProductImage({ supplier: best, product: productName })
  const compareQuery = result?.meta.query ?? `Focused review for ${best.name}`
  const singleMode = top5.length === 1
  const backTarget = supplierId ? `/app/suppliers/${supplierId}` : "/app"
  const warning = buyerWarning(result?.meta, top5.length)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackNavButton
          fallbackHref={backTarget}
          label={supplierId ? "Back to supplier profile" : "Back to workspace"}
          preserveWorkspace={!supplierId}
        />
        {supplierId && result ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
              <Link href={`/app/suppliers/${supplierId}/contact`}>
                <Mail className="mr-1.5 h-4 w-4" />
                Contact supplier
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
              <Link href="/app/compare">
                <GitCompare className="mr-1.5 h-4 w-4" />
                Compare with other suppliers
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-black/10 bg-white/78 p-7 text-[#16201d] shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Decision desk</p>
            <h1 className="mt-3 text-5xl font-semibold leading-none tracking-tight md:text-6xl">
              {singleMode ? "Profit and simulation review." : "Compare the shortlist."}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#5d6965]">Query: {compareQuery}</p>
          </div>
          <div className="min-w-[260px] overflow-hidden rounded-xl border border-black/10 bg-[#16201d] text-[#f7f4ec] shadow-sm">
            <div className="h-36 overflow-hidden bg-[#ece7dc]">
              <Image
                src={productImage.src}
                alt={productImage.alt}
                width={640}
                height={288}
                priority
                sizes="(max-width: 768px) 100vw, 320px"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9b44a]">Selected product</span>
              <strong className="mt-1 block text-lg text-white">{productName}</strong>
              <span className="mt-1 block text-sm text-[#bdc8c2]">{top5.length} suppliers ready for margin and simulation review</span>
            </div>
          </div>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <ProofPill icon={GitCompare} label={`${top5.length} supplier${top5.length > 1 ? "s" : ""}`} detail={singleMode ? "focused review" : "top-ranked candidates"} />
          <ProofPill icon={ShieldCheck} label={resultModeLabel(result?.meta)} detail={confidenceLabel(result?.meta, top5.length)} />
          <ProofPill icon={LineChart} label="Profit ready" detail="margin and landed cost" />
          <ProofPill icon={LineChart} label="Simulation" detail="profit stress test" />
        </div>
        {warning ? (
          <div className="mt-5 rounded-lg border border-[#d9b44a]/25 bg-[#fff8df] px-4 py-3 text-sm leading-6 text-[#6b5a24]">
            {warning}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
            <Link href={`/app/suppliers/${best.id}/contact`}>
              <Mail className="mr-1.5 h-4 w-4" />
              Contact front-runner
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 text-[#d9b44a]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Recommendation summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">
                {singleMode ? `${best.name} under decision review.` : `${best.name} is the current front-runner.`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5d6965]">
                {singleMode
                  ? "Use the profit panel and simulation below to see whether this supplier still works after shipping, customs, and pricing assumptions are added."
                  : `${lowestRisk.name} carries the lowest risk, while ${lowestUnit.name} has the lowest unit price. ${rankingReason({ supplier: best, rank: 1, result })}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DecisionMetric label="Fastest lead" value={`${Math.min(...top5.map((s) => s.lead_time_days))}d`} />
          <DecisionMetric label="Lowest risk" value={`${lowestRisk.risk_score}/100`} />
          <DecisionMetric label="Lowest unit price" value={formatMoney(lowestUnit.unit_price_usd, bangladeshMode)} />
        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <LineChart className="mt-1 h-5 w-5 text-[#d9b44a]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Logistics route review</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">How these suppliers are most likely to deliver</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              This gives the same buyer-facing freight logic from the supplier profile inside the profit and simulation view, so landed-cost thinking stays tied to the route.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {top5.map((supplier, index) => {
            const lane = inferSupplierLogisticsLane({ supplier })
            return (
              <div key={supplier.id} className="rounded-xl border border-black/10 bg-[#f7f4ec] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">#{index + 1} {lane.modeLabel}</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#16201d]">{supplier.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#16201d]">
                    <LogisticsIcon mode={lane.mode} />
                    ETA {lane.etaLabel}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <RouteStop label="Comes from" value={lane.originLabel} />
                  <div className="hidden justify-center md:flex">
                    <ArrowRight className="h-5 w-5 text-[#7a857f]" />
                  </div>
                  <RouteStop label="Ends up at" value={lane.destinationLabel} detail={lane.destinationDetail} />
                </div>

                <p className="mt-4 text-sm leading-6 text-[#5d6965]">{lane.rationale}</p>
              </div>
            )
          })}
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
          <TermLabel label="Unit price" />
          <TermLabel label="MOQ" />
          <TermLabel label="Lead" />
          <TermLabel label="Risk" />
        </div>
        {top5.map((supplier, index) => (
          <div key={supplier.id} className="grid grid-cols-[1.25fr_0.65fr_0.55fr_0.55fr_0.55fr_0.75fr] items-center gap-3 border-t border-black/10 px-5 py-4 text-sm">
            <div>
              <div className="font-semibold text-[#16201d]">#{index + 1} {supplier.name}</div>
              <div className="mt-1 text-xs text-[#6d7a75]">{supplier.certifications.slice(0, 3).join(", ") || "Certification not listed"}</div>
              <div className="mt-2 text-xs leading-5 text-[#53605c]">{rankingReason({ supplier, rank: index + 1, result })}</div>
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

function LogisticsIcon({ mode }: { mode: "ship" | "air" | "road" }) {
  if (mode === "air") return <Plane className="h-4 w-4" />
  if (mode === "road") return <Truck className="h-4 w-4" />
  return <ShipWheel className="h-4 w-4" />
}

function RouteStop({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#16201d]">{value}</div>
      {detail ? <div className="mt-1 text-xs leading-5 text-[#5d6965]">{detail}</div> : null}
    </div>
  )
}
