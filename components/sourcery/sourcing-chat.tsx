"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Clock,
  Database,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageSquareText,
  PackageSearch,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePreferences } from "@/lib/preferences-context"
import { saveLatestResult, pushRecentQuery } from "@/lib/sourcing-result-store"
import { saveSearchAction } from "@/lib/sourcery/actions"
import { SUPPORTED_PRODUCT_CATALOG } from "@/lib/sourcery/supported-products"
import { cn } from "@/lib/utils"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { Supplier, SupplierCategory } from "@/lib/types"

type SupplierListResponse = {
  suppliers: Supplier[]
  count: number
  source: "demo" | "supabase"
}

type HealthResponse = {
  ok: boolean
  service: string
  runtime?: Record<string, unknown>
}

type BargainResponse = {
  message: string
  meta: {
    llm_mode: "ai" | "deterministic_fallback"
    ai_provider: string
  }
}

type SimulationResponse = {
  simResults: Array<{
    supplier_id: string
    landed_cost: number
    gross_margin: number
    total_profit: number
    profit_rank: number
  }>
}

const STARTERS = [
  "Eco-friendly jute tote bags under $3, low MOQ, export-ready, BGMEA or ISO preferred",
  "GOTS-certified organic cotton hoodies, 320 GSM, MOQ 300, lead time under 35 days",
  "Private label skincare manufacturer for serums, ISO 22716, MOQ under 1000",
]

const GUIDED_CATEGORIES = SUPPORTED_PRODUCT_CATALOG

const LOADING_STEPS = [
  "Retrieval layer: matching supported product path",
  "Discovery Agent: ranking candidate suppliers",
  "Risk Agent: checking MOQ, lead time, certifications, and source type",
  "Comparison Agent: preparing shortlist evidence",
]

const formatUSD = (value?: number | null) =>
  typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value) : "TBD"

export function SourcingChat() {
  const [query, setQuery] = useState(STARTERS[0])
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [directorySource, setDirectorySource] = useState<"demo" | "supabase">("demo")
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [bargain, setBargain] = useState<BargainResponse | null>(null)
  const [bargainLoading, setBargainLoading] = useState(false)
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null)
  const [simulationLoading, setSimulationLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory>("accessories")
  const [selectedProduct, setSelectedProduct] = useState("jute tote bags")
  const { bangladeshMode } = usePreferences()
  const searchParams = useSearchParams()

  useEffect(() => {
    const prefill = searchParams?.get("prefill")
    if (prefill) setQuery(prefill)
  }, [searchParams])

  useEffect(() => {
    let active = true
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        if (active) setHealth(data)
      })
      .catch(() => {
        if (active) setHealth(null)
      })
    fetch("/api/suppliers?limit=8")
      .then((res) => res.json())
      .then((data: SupplierListResponse) => {
        if (!active) return
        setSuppliers(data.suppliers ?? [])
        setDirectorySource(data.source ?? "demo")
        setSelectedId(data.suppliers?.[0]?.id ?? null)
      })
      .catch(() => {
        if (active) setSuppliers([])
      })
    return () => {
      active = false
    }
  }, [])

  const ranked = useMemo(() => {
    if (!result) return []
    return result.discovery
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((discovery) => {
        const supplier = result.suppliers.find((item) => item.id === discovery.supplier_id)
        const risk = result.risk.find((item) => item.supplier_id === discovery.supplier_id)
        const comparison = result.comparison.find((item) => item.supplier_id === discovery.supplier_id)
        return supplier && risk && comparison ? { supplier, discovery, risk, comparison } : null
      })
      .filter(Boolean)
  }, [result])

  const displayedSuppliers = ranked.length > 0 ? ranked.map((item) => item!.supplier) : suppliers
  const selectedSupplier = displayedSuppliers.find((item) => item.id === selectedId) ?? displayedSuppliers[0] ?? null
  const selectedRank = ranked.find((item) => item?.supplier.id === selectedSupplier?.id)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    setError(null)
    setStatus("loading")
    setLoadingStep(0)

    const progress = window.setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, LOADING_STEPS.length - 1))
    }, 750)

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, bangladeshMode, topK: 6, category: selectedCategory, product: selectedProduct }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Sourcing failed (${res.status})`)
      }
      const data = (await res.json()) as SourcingResult
      setResult(data)
      setSelectedId(data.suppliers[0]?.id ?? null)
      saveLatestResult(data)
      pushRecentQuery({
        query: trimmed,
        bangladeshMode,
        count: data.suppliers.length,
        ts: new Date().toISOString(),
        category: selectedCategory,
        product: selectedProduct,
        confidence: data.meta.confidence,
      })
      void saveSearchAction({ query: trimmed, bangladeshMode, result: data, category: selectedCategory, product: selectedProduct }).catch(() => undefined)
      setStatus("done")
    } catch (err) {
      setStatus("error")
      setError((err as Error).message)
    } finally {
      window.clearInterval(progress)
    }
  }

  const toggleShortlist = (id: string) => {
    setShortlist((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const runBargain = async () => {
    if (!selectedSupplier) return
    setBargainLoading(true)
    setBargain(null)
    try {
      const res = await fetch("/api/bargain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: {
            name: selectedSupplier.name,
            country: selectedSupplier.country,
            unit_price_usd: selectedSupplier.unit_price_usd,
            moq: selectedSupplier.moq,
            lead_time_days: selectedSupplier.lead_time_days,
          },
          productDescription: query,
          orderQuantity: selectedSupplier.moq,
        }),
      })
      if (!res.ok) throw new Error(`Bargain failed (${res.status})`)
      setBargain((await res.json()) as BargainResponse)
    } catch (err) {
      setBargain({
        message: `Could not generate a bargain message: ${(err as Error).message}`,
        meta: { llm_mode: "deterministic_fallback", ai_provider: "none" },
      })
    } finally {
      setBargainLoading(false)
    }
  }

  const runSimulation = async () => {
    const candidates = (result?.suppliers ?? suppliers).slice(0, 5)
    if (candidates.length === 0) return
    setSimulationLoading(true)
    setSimulation(null)
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suppliers: candidates,
          baseInputs: {
            selling_price: 24,
            shipping_cost_per_unit: 1.5,
            customs_rate: 5,
            packaging_cost_per_unit: 0.8,
            order_quantity: 300,
          },
          deltas: {
            shipping_cost_delta_pct: 10,
            lead_time_delta_days: 7,
            order_quantity: 500,
            selling_price: 24,
            supplier_price_delta_pct: -5,
          },
        }),
      })
      if (!res.ok) throw new Error(`Simulation failed (${res.status})`)
      setSimulation((await res.json()) as SimulationResponse)
    } catch (err) {
      setSimulation({ simResults: [] })
      console.log("[sourcery] simulation panel failed:", (err as Error).message)
    } finally {
      setSimulationLoading(false)
    }
  }

  const runJudgeDemo = () => {
    setSelectedCategory("accessories")
    setSelectedProduct("jute tote bags")
    setQuery("Eco-friendly jute tote bags under $3, low MOQ, export-ready, BGMEA or ISO preferred")
    setError(null)
  }

  const exportShortlist = async () => {
    const candidates = (result?.suppliers ?? displayedSuppliers).slice(0, 10)
    if (candidates.length === 0) return
    setExporting(true)
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, suppliers: candidates }),
      })
      if (!res.ok) throw new Error(`Export failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "sourcery-shortlist.csv"
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid min-w-0 gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="w-full min-w-0 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Sourcing brief</p>
              <h1 className="mt-2 font-serif text-4xl leading-none text-[#16201d]">Command center</h1>
            </div>
            <div className="hidden rounded-md bg-[#edf6f1] px-3 py-2 text-xs font-semibold text-[#2e7d65] sm:block">BD mode aware</div>
          </div>
          <button
            type="button"
            onClick={runJudgeDemo}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-md border border-[#d9b44a]/50 bg-[#fff8df] px-3 py-3 text-left text-sm font-semibold text-[#7a5b0f] transition hover:border-[#d9b44a]"
          >
            <span className="min-w-0 text-wrap">Judge Demo Mode: load the safest 60-second query</span>
            <Sparkles className="h-4 w-4 shrink-0" />
          </button>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Choose a category we can answer</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GUIDED_CATEGORIES.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(item.category)
                      setSelectedProduct(item.products[0])
                      setQuery(`${item.products[0]} suppliers, low MOQ, export-ready, certification preferred`)
                    }}
                    className={cn(
                      "min-w-0 rounded-md border px-3 py-2 text-left text-sm transition",
                      selectedCategory === item.category
                        ? "border-[#2e7d65] bg-[#edf6f1] font-semibold text-[#165c49]"
                        : "border-black/10 bg-[#f7f4ec] text-[#53605c] hover:text-[#16201d]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Pick a product in the dataset</p>
              <div className="flex flex-wrap gap-2">
                {GUIDED_CATEGORIES.find((item) => item.category === selectedCategory)?.products.map((product) => (
                  <button
                    key={product}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product)
                      setQuery(`${product} suppliers, low MOQ, export-ready, certification preferred`)
                    }}
                    className={cn(
                      "max-w-full rounded-md border px-3 py-1.5 text-left text-sm transition",
                      selectedProduct === product
                        ? "border-[#d9b44a] bg-[#fff8df] font-semibold text-[#7a5b0f]"
                        : "border-black/10 bg-white text-[#53605c] hover:text-[#16201d]",
                    )}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-4 min-w-0 space-y-4">
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={7}
              disabled={status === "loading"}
              className="max-w-full resize-none rounded-md border-[#d9ded8] bg-[#fbfaf6] text-base leading-7 shadow-none focus-visible:ring-[#2e7d65]"
              placeholder="Use the category/product buttons above, then fine-tune MOQ, target price, lead time, and certifications..."
            />
            <Button disabled={status === "loading" || query.trim().length < 2} className="h-12 w-full rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]">
              {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageSearch className="mr-2 h-4 w-4" />}
              Run supplier intelligence
            </Button>
            {status === "loading" && (
              <div className="rounded-md border border-[#2e7d65]/20 bg-[#edf6f1] p-3 text-sm text-[#165c49]">
                <div className="flex items-center gap-2 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {LOADING_STEPS[loadingStep]}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#2e7d65] transition-all" style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }} />
                </div>
              </div>
            )}
          </form>

          <div className="mt-5 rounded-md border border-black/10 bg-[#fbfaf6] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">30-second AI workflow proof</p>
            <p className="mt-2 text-sm leading-6 text-[#53605c]">
              Sourcery uses a Supabase + pgvector knowledge layer, then Discovery, Risk, Bargain, and Simulation agents to move
              from product brief to supplier decision.
            </p>
            <Link href="/app/workflow" className="mt-2 inline-flex items-center text-sm font-semibold text-[#165c49]">
              Open proof page <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => setQuery(starter)}
                className="block w-full rounded-md border border-black/10 bg-[#f7f4ec] px-3 py-3 text-left text-sm leading-5 text-[#53605c] transition hover:border-[#2e7d65]/30 hover:text-[#16201d]"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 rounded-lg border border-black/10 bg-[#16201d] p-5 text-[#f7f4ec] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Live intelligence</p>
              <h2 className="mt-2 text-2xl font-semibold">Ranked supplier board</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <MetaPill icon={Database} label={result?.meta.retrieval_mode ?? directorySource} />
              <MetaPill icon={Sparkles} label={result?.meta.llm_mode ?? "ready"} />
              <MetaPill icon={Clock} label={result ? `${result.meta.elapsed_ms}ms` : health?.ok ? "health ok" : "checking"} />
            </div>
          </div>

          {status === "error" && error && (
            <div className="mt-5 rounded-md border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
          )}

          <div className="mt-5 grid gap-3">
            {(ranked.length > 0 ? ranked : suppliers.slice(0, 6).map((supplier, index) => ({
              supplier,
              discovery: {
                supplier_id: supplier.id,
                rank: index + 1,
                fit_score: Math.max(62, 96 - index * 5),
                explanation: `${supplier.name} is visible in the current supplier index and ready for sourcing comparison.`,
                key_factors: [],
                confidence: "medium" as const,
                confidence_reason: "Directory preview before a live sourcing run.",
              },
              risk: null,
              comparison: null,
            }))).map((item) => (
              <button
                key={item!.supplier.id}
                type="button"
                onClick={() => setSelectedId(item!.supplier.id)}
                className={cn(
                  "rounded-md border p-4 text-left transition",
                  selectedSupplier?.id === item!.supplier.id
                    ? "border-[#d9b44a] bg-white/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#d9b44a]">#{item!.discovery.rank}</span>
                      <h3 className="truncate font-semibold text-[#fffaf0]">{item!.supplier.name}</h3>
                      {item!.supplier.source_type === "public_web" && <span className="rounded bg-[#244d40] px-2 py-0.5 text-[10px] text-[#a9f2cf]">public</span>}
                      {item!.supplier.bgmea_certified && <span className="rounded bg-[#244d40] px-2 py-0.5 text-[10px] text-[#a9f2cf]">BGMEA</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#aeb8b3]">
                      <MapPin className="h-3 w-3" />
                      {item!.supplier.city}, {item!.supplier.country} · {item!.supplier.category}
                    </p>
                  </div>
                  <div className="hidden text-right min-[520px]:block">
                    <div className="text-lg font-semibold text-[#fffaf0]">{Math.round(item!.discovery.fit_score)}%</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[#aeb8b3]">fit</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs min-[520px]:grid-cols-4">
                  <BoardKpi label="Unit" value={formatUSD(item!.supplier.unit_price_usd)} />
                  <BoardKpi label="MOQ" value={item!.supplier.moq?.toLocaleString() ?? "TBD"} />
                  <BoardKpi label="Lead" value={`${item!.supplier.lead_time_days ?? "TBD"}d`} />
                  <BoardKpi label="Risk" value={`${item!.supplier.risk_score ?? "TBD"}`} />
                </div>
                <div className="mt-4 rounded-md border border-white/10 bg-black/10 p-3 text-xs leading-5 text-[#d7dfda]">
                  <span className="font-semibold text-[#d9b44a]">Why this rank:</span> {item!.discovery.explanation}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Supplier directory</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#16201d]">Indexed suppliers</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportShortlist} disabled={exporting} variant="outline" className="rounded-md bg-transparent">
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                CSV
              </Button>
              <Button asChild variant="outline" className="rounded-md bg-transparent">
                <Link href="/app/compare">
                  Compare
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border border-black/10">
            <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.45fr_0.75fr_0.7fr_0.45fr_0.45fr] bg-[#eef1ea] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#65716c]">
              <span>Supplier</span>
              <span>Category</span>
              <span>Location</span>
              <span>Risk</span>
              <span></span>
            </div>
            {displayedSuppliers.slice(0, 7).map((supplier) => (
              <div key={supplier.id} className="grid grid-cols-[1.45fr_0.75fr_0.7fr_0.45fr_0.45fr] items-center border-t border-black/10 px-4 py-3 text-sm">
                <button type="button" onClick={() => setSelectedId(supplier.id)} className="min-w-0 text-left font-medium text-[#16201d] hover:underline">
                  <span className="block truncate">{supplier.name}</span>
                  <span className="mt-1 block truncate text-xs font-normal text-[#6d7a75]">{supplier.certifications?.slice(0, 3).join(" · ") || "No certification listed"}</span>
                </button>
                <span className="capitalize text-[#53605c]">{supplier.category}</span>
                <span className="truncate text-[#53605c]">{supplier.country}</span>
                <RiskBadge score={supplier.risk_score} />
                <button type="button" onClick={() => toggleShortlist(supplier.id)} className="justify-self-end rounded-md border border-black/10 px-2 py-1 text-xs">
                  {shortlist.includes(supplier.id) ? "Saved" : "Save"}
                </button>
              </div>
            ))}
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          {selectedSupplier ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Supplier detail</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">{selectedSupplier.name}</h2>
                  <p className="mt-1 text-sm text-[#6d7a75]">{selectedSupplier.city}, {selectedSupplier.country}</p>
                </div>
                <RiskBadge score={selectedSupplier.risk_score} />
              </div>
              <p className="mt-5 text-sm leading-6 text-[#53605c]">{selectedSupplier.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <DetailStat icon={TrendingUp} label="Unit price" value={formatUSD(selectedSupplier.unit_price_usd)} />
                <DetailStat icon={PackageSearch} label="MOQ" value={selectedSupplier.moq?.toLocaleString() ?? "TBD"} />
                <DetailStat icon={Clock} label="Lead time" value={`${selectedSupplier.lead_time_days ?? "TBD"} days`} />
                <DetailStat icon={Star} label="Quality" value={`${selectedSupplier.quality_rating ?? "TBD"}/5`} />
              </div>
              <div className="mt-5 space-y-3">
                <Insight icon={BadgeCheck} title="Certifications" text={selectedSupplier.certifications?.join(", ") || "No certifications listed yet."} />
                <Insight icon={ShieldAlert} title="Risk note" text={selectedRank?.risk?.explanation ?? selectedSupplier.risk_notes ?? "Run sourcing for an AI-grounded risk explanation."} />
                <Insight icon={FileText} title="Why this match" text={selectedRank?.discovery.explanation ?? "Select a sourcing brief to generate explainable match reasoning."} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button onClick={runBargain} disabled={bargainLoading} className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]">
                  {bargainLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                  Bargain
                </Button>
                <Button onClick={runSimulation} disabled={simulationLoading} variant="outline" className="rounded-md bg-transparent">
                  {simulationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                  Simulate
                </Button>
              </div>
              <Button asChild variant="outline" className="mt-3 w-full rounded-md bg-transparent">
                <Link href={`/app/suppliers/${selectedSupplier.id}`}>
                  Open full supplier profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {(bargain || simulation) && (
                <div className="mt-5 space-y-3">
                  {bargain && (
                    <div className="rounded-md border border-black/10 bg-[#f7f4ec] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#16201d]">Backend bargain draft</p>
                        <span className="rounded bg-white px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#6d7a75]">
                          {bargain.meta.llm_mode}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#53605c]">{bargain.message}</p>
                    </div>
                  )}
                  {simulation && (
                    <div className="rounded-md border border-black/10 bg-[#f7f4ec] p-3">
                      <p className="text-sm font-semibold text-[#16201d]">Backend simulation</p>
                      {simulation.simResults[0] ? (
                        <p className="mt-2 text-sm leading-6 text-[#53605c]">
                          Current simulated winner has landed cost {formatUSD(simulation.simResults[0].landed_cost)} and total profit{" "}
                          {formatUSD(simulation.simResults[0].total_profit)} at rank #{simulation.simResults[0].profit_rank}.
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-[#53605c]">Simulation did not return a ranked result.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-[#6d7a75]">Run sourcing or load suppliers to inspect a supplier.</div>
          )}
        </aside>
      </section>
    </div>
  )
}

function MetaPill({ icon: Icon, label }: { icon: typeof Database; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[#d7dfda]">
      <Icon className="h-3.5 w-3.5 text-[#d9b44a]" />
      {label}
    </span>
  )
}

function BoardKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#87938e]">{label}</div>
      <div className="mt-1 font-semibold text-[#fffaf0]">{value}</div>
    </div>
  )
}

function RiskBadge({ score }: { score?: number }) {
  const level = typeof score === "number" ? (score <= 30 ? "low" : score <= 60 ? "medium" : "high") : "unknown"
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold capitalize",
        level === "low" && "bg-emerald-50 text-emerald-700",
        level === "medium" && "bg-amber-50 text-amber-700",
        level === "high" && "bg-red-50 text-red-700",
        level === "unknown" && "bg-slate-100 text-slate-600",
      )}
    >
      {typeof score === "number" ? `${level} ${score}` : "unknown"}
    </span>
  )
}

function DetailStat({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f7f4ec] p-3">
      <Icon className="h-4 w-4 text-[#2e7d65]" />
      <div className="mt-3 text-xs uppercase tracking-[0.14em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function Insight({ icon: Icon, title, text }: { icon: typeof Check; title: string; text: string }) {
  return (
    <div className="rounded-md border border-black/10 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#16201d]">
        <Icon className="h-4 w-4 text-[#2e7d65]" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[#53605c]">{text}</p>
    </div>
  )
}
