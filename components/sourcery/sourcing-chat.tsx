"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Loader2,
  MapPin,
  MessageSquareText,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { usePreferences } from "@/lib/preferences-context"
import { saveLatestResult, pushRecentQuery, readShortlistIds, saveShortlistIds } from "@/lib/sourcing-result-store"
import { saveSearchAction } from "@/lib/sourcery/actions"
import { SUPPORTED_PRODUCT_CATALOG } from "@/lib/sourcery/supported-products"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"

type SupplierListResponse = {
  suppliers: Supplier[]
  count: number
  source: "demo" | "supabase"
}

type HealthResponse = {
  ok: boolean
  runtime?: {
    supabase?: boolean
    aiGeneration?: boolean
    aiGenerationProvider?: string
    embeddings?: boolean
  }
}

type BargainResponse = {
  message: string
  meta: {
    llm_mode: "ai" | "deterministic_fallback"
    ai_provider: string
  }
}

const STARTERS = [
  "Eco-friendly jute tote bags under $3, low MOQ, export-ready, BGMEA or ISO preferred",
  "GOTS-certified organic cotton hoodies, MOQ 300, lead time under 35 days",
  "Private label face serum manufacturer, MOQ under 1000, ISO 22716 preferred",
]

const LOADING_STEPS = [
  "Retrieval engine is matching supported products",
  "Discovery Agent is ranking supplier candidates",
  "Risk Agent is checking lead time, MOQ, and certifications",
  "Comparison layer is preparing shortlist evidence",
]

const REGION_OPTIONS: Array<{ value: SupplierRegion | "any"; label: string }> = [
  { value: "any", label: "All regions" },
  { value: "South Asia", label: "South Asia" },
  { value: "Southeast Asia", label: "Southeast Asia" },
  { value: "East Asia", label: "East Asia" },
  { value: "Europe", label: "Europe" },
  { value: "MENA", label: "MENA" },
]

const COUNTRY_OPTIONS = ["All countries", "Bangladesh", "India", "China", "Vietnam", "Turkey"]

const formatUSD = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : "TBD"

export function SourcingChat() {
  const searchParams = useSearchParams()
  const { bangladeshMode } = usePreferences()

  const [query, setQuery] = useState(STARTERS[0])
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [directorySource, setDirectorySource] = useState<"demo" | "supabase">("demo")
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [bargain, setBargain] = useState<BargainResponse | null>(null)
  const [bargainLoading, setBargainLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory>("accessories")
  const [selectedProduct, setSelectedProduct] = useState("jute tote bags")
  const [selectedCountry, setSelectedCountry] = useState("All countries")
  const [selectedRegion, setSelectedRegion] = useState<SupplierRegion | "any">(bangladeshMode ? "South Asia" : "any")
  const [maxPrice, setMaxPrice] = useState(5)
  const [maxLeadTime, setMaxLeadTime] = useState(45)
  const [topK, setTopK] = useState(4)

  useEffect(() => {
    const prefill = searchParams?.get("prefill")
    if (prefill) setQuery(prefill)
  }, [searchParams])

  useEffect(() => {
    setShortlist(readShortlistIds())
  }, [])

  useEffect(() => {
    setSelectedRegion(bangladeshMode ? "South Asia" : "any")
    setSelectedCountry(bangladeshMode ? "Bangladesh" : "All countries")
  }, [bangladeshMode])

  useEffect(() => {
    let active = true
    void fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        if (active) setHealth(data)
      })
      .catch(() => {
        if (active) setHealth(null)
      })

    void fetch("/api/suppliers?limit=12")
      .then((res) => res.json())
      .then((data: SupplierListResponse) => {
        if (!active) return
        setSuppliers(data.suppliers ?? [])
        setDirectorySource(data.source ?? "demo")
        setSelectedId((current) => current ?? data.suppliers?.[0]?.id ?? null)
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
      .filter(Boolean) as Array<{
      supplier: Supplier
      discovery: SourcingResult["discovery"][number]
      risk: SourcingResult["risk"][number]
      comparison: SourcingResult["comparison"][number]
    }>
  }, [result])

  const directoryPool = ranked.length > 0 ? ranked.map((item) => item.supplier) : suppliers

  const filteredPool = useMemo(() => {
    return directoryPool.filter((supplier) => {
      if (selectedCategory && supplier.category !== selectedCategory) return false
      if (selectedCountry !== "All countries" && supplier.country !== selectedCountry) return false
      if (selectedRegion !== "any" && supplier.region !== selectedRegion) return false
      if (supplier.unit_price_usd > maxPrice) return false
      if (supplier.lead_time_days > maxLeadTime) return false
      return true
    })
  }, [directoryPool, selectedCategory, selectedCountry, selectedRegion, maxPrice, maxLeadTime])

  const visibleRanked = useMemo(() => {
    if (ranked.length === 0) return []
    const visibleIds = new Set(filteredPool.map((supplier) => supplier.id))
    return ranked.filter((item) => visibleIds.has(item.supplier.id)).slice(0, topK)
  }, [filteredPool, ranked, topK])

  const selectedSupplier =
    (visibleRanked.find((item) => item.supplier.id === selectedId)?.supplier ??
      filteredPool.find((item) => item.id === selectedId) ??
      visibleRanked[0]?.supplier ??
      filteredPool[0] ??
      null)

  const selectedBundle = visibleRanked.find((item) => item.supplier.id === selectedSupplier?.id) ?? null

  const shortlistSuppliers = useMemo(
    () => directoryPool.filter((supplier) => shortlist.includes(supplier.id)).slice(0, 4),
    [directoryPool, shortlist],
  )

  const shortlistSummary = useMemo(() => {
    if (shortlistSuppliers.length === 0) return "Shortlist up to four suppliers to unlock compare, bargain, and simulation."
    const lowestRisk = shortlistSuppliers.reduce((best, current) =>
      current.risk_score < best.risk_score ? current : best,
    )
    const cheapest = shortlistSuppliers.reduce((best, current) =>
      current.unit_price_usd < best.unit_price_usd ? current : best,
    )
    return `${lowestRisk.name} is the safest current pick, while ${cheapest.name} is the cheapest supplier in the shortlist.`
  }, [shortlistSuppliers])

  const averageFitScore = useMemo(() => {
    if (!result || result.discovery.length === 0) return null
    const total = result.discovery.reduce((sum, item) => sum + item.fit_score, 0)
    return Math.round(total / result.discovery.length)
  }, [result])

  const mismatchWarning = useMemo(() => {
    const lowered = query.toLowerCase()
    const selectedGroup = SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === selectedCategory)
    if (!selectedGroup) return null
    const ownMatch = selectedGroup.products.some((product) => lowered.includes(product.toLowerCase()))
    if (ownMatch) return null
    const foreign = SUPPORTED_PRODUCT_CATALOG.find(
      (item) =>
        item.category !== selectedCategory &&
        item.products.some((product) => lowered.includes(product.toLowerCase())),
    )
    if (!foreign) return null
    return `Your brief sounds closer to ${foreign.label}, but the selected category is ${selectedGroup.label}. Adjust filters or continue anyway.`
  }, [query, selectedCategory])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    setError(null)
    setStatus("loading")
    setLoadingStep(0)

    const progress = window.setInterval(() => {
      setLoadingStep((step) => Math.min(step + 1, LOADING_STEPS.length - 1))
    }, 700)

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          bangladeshMode,
          topK: Math.max(topK, 4),
          category: selectedCategory,
          product: selectedProduct,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Sourcing failed (${res.status})`)
      }
      const data = (await res.json()) as SourcingResult
      setResult(data)
      setSelectedId(data.suppliers[0]?.id ?? null)
      setBargain(null)
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
      void saveSearchAction({
        query: trimmed,
        bangladeshMode,
        result: data,
        category: selectedCategory,
        product: selectedProduct,
      }).catch(() => undefined)
      setStatus("done")
    } catch (err) {
      setStatus("error")
      setError((err as Error).message)
    } finally {
      window.clearInterval(progress)
    }
  }

  const runJudgeDemo = () => {
    setSelectedCategory("accessories")
    setSelectedProduct("jute tote bags")
    setSelectedCountry("Bangladesh")
    setSelectedRegion("South Asia")
    setMaxPrice(3)
    setMaxLeadTime(35)
    setTopK(4)
    setQuery("Eco-friendly jute tote bags under $3, low MOQ, export-ready, BGMEA or ISO preferred")
    setError(null)
  }

  const toggleShortlist = (supplierId: string) => {
    setShortlist((current) => {
      const next = current.includes(supplierId)
        ? current.filter((item) => item !== supplierId)
        : [...current, supplierId].slice(0, 4)
      saveShortlistIds(next)
      return next
    })
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
        message: `Could not generate a bargain draft: ${(err as Error).message}`,
        meta: { llm_mode: "deterministic_fallback", ai_provider: "none" },
      })
    } finally {
      setBargainLoading(false)
    }
  }

  const copyBargain = async () => {
    if (!bargain?.message) return
    try {
      await navigator.clipboard.writeText(bargain.message)
    } catch {
      // ignore clipboard failures in demo mode
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="space-y-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Sourcing workspace</p>
              <h1 className="mt-2 text-2xl font-semibold text-[#16201d]">Guided filters</h1>
            </div>
            <Button
              type="button"
              onClick={runJudgeDemo}
              variant="outline"
              className="rounded-full border-[#d9b44a]/40 bg-[#fff8df] text-[#7a5b0f] hover:bg-[#fff3bf]"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Demo mode
            </Button>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Category</div>
            <div className="mt-3 grid gap-2">
              {SUPPORTED_PRODUCT_CATALOG.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(item.category)
                    setSelectedProduct(item.products[0])
                    setQuery(`${item.products[0]} suppliers, low MOQ, export-ready, certification preferred`)
                  }}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left text-sm transition",
                    selectedCategory === item.category
                      ? "border-[#2e7d65] bg-[#edf6f1] text-[#165c49]"
                      : "border-black/10 bg-white text-[#53605c] hover:text-[#16201d]",
                  )}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="mt-1 text-xs text-[#6d7a75]">{item.products.slice(0, 2).join(" • ")}</div>
                </button>
              ))}
            </div>
          </div>

          <FilterGroup label="Product">
            <select
              value={selectedProduct}
              onChange={(event) => setSelectedProduct(event.target.value)}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none"
            >
              {SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === selectedCategory)?.products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Country">
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Region">
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value as SupplierRegion | "any")}
              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterGroup>

          <RangeField label="Max unit price" value={maxPrice} min={1} max={30} suffix="$" onChange={setMaxPrice} />
          <RangeField label="Max lead time" value={maxLeadTime} min={10} max={90} suffix="d" onChange={setMaxLeadTime} />
          <RangeField label="Top K results" value={topK} min={3} max={6} suffix="" onChange={setTopK} />

          {bangladeshMode && (
            <div className="rounded-2xl border border-[#2e7d65]/15 bg-[#edf6f1] p-4 text-sm text-[#165c49]">
              <div className="font-semibold">Bangladesh Mode active</div>
              <p className="mt-1 leading-6">
                Bangladesh Mode softly prioritizes South Asian sourcing context and highlights Bangla negotiation support.
              </p>
            </div>
          )}
        </aside>

        <section className="space-y-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Sourcing brief</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#16201d]">Ranked supplier board</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d6965]">
                Start with a supported category, sharpen your product brief, and let Sourcery rank suppliers by fit, cost,
                lead time, and sourcing risk.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <MetaPill icon={Database} label={health?.runtime?.supabase ? "Retrieval ready" : directorySource} />
              <MetaPill icon={Sparkles} label={health?.runtime?.aiGenerationProvider ?? "generation ready"} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={5}
              disabled={status === "loading"}
              className="resize-none rounded-3xl border-[#d9ded8] bg-[#fbfaf6] text-base leading-7 shadow-none focus-visible:ring-[#2e7d65]"
              placeholder="Describe the supplier you need: product, MOQ, price target, lead time, and preferred certifications."
            />

            {mismatchWarning && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{mismatchWarning}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={status === "loading" || query.trim().length < 2}
                className="h-12 rounded-full bg-[#16201d] px-5 text-[#f7f4ec] hover:bg-[#24332f]"
              >
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Run supplier intelligence
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full bg-transparent">
                <Link href="/app/workflow">
                  How Sourcery works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </form>

          {status === "loading" && (
            <div className="rounded-3xl border border-[#2e7d65]/15 bg-[#edf6f1] p-4 text-sm text-[#165c49]">
              <div className="flex items-center gap-2 font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" />
                {LOADING_STEPS[loadingStep]}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#2e7d65] transition-all"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {status === "error" && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="flex flex-wrap gap-2 text-xs">
              <MetaPill icon={Database} label={result.meta.retrieval_mode} />
              <MetaPill icon={Sparkles} label={result.meta.llm_mode} />
              <MetaPill icon={Clock} label={`${result.meta.elapsed_ms} ms`} />
              <MetaPill icon={Check} label={result.meta.cached ? "cached" : "fresh"} />
              <MetaPill icon={Target} label={`${averageFitScore ?? 0}% confidence`} />
            </div>
          )}

          <div className="grid gap-4">
            {(visibleRanked.length > 0 ? visibleRanked : filteredPool.slice(0, topK).map((supplier, index) => ({
              supplier,
              discovery: {
                supplier_id: supplier.id,
                rank: index + 1,
                fit_score: Math.max(60, 93 - index * 5),
                explanation: `${supplier.name} is present in the supplier directory and ready for a live sourcing run.`,
                key_factors: [`${supplier.country} supply base`, `${supplier.category} match`],
                confidence: "medium" as const,
                confidence_reason: "Directory view before a fresh AI-backed sourcing run.",
              },
              risk: {
                supplier_id: supplier.id,
                risk_flags: [],
                bd_mode_adjusted: bangladeshMode,
                explanation: supplier.risk_notes ?? "Run sourcing to unlock a fuller risk explanation.",
                key_factors: [],
                confidence: "medium" as const,
                confidence_reason: "Preview mode",
              },
              comparison: {
                supplier_id: supplier.id,
                scorecard: {
                  price: supplier.unit_price_usd,
                  lead_time_days: supplier.lead_time_days,
                  moq: supplier.moq,
                  on_time_rate: supplier.on_time_rate,
                  quality_rating: supplier.quality_rating,
                },
                explanation: "Preview scorecard before a fresh sourcing run.",
                key_factors: [],
                confidence: "medium" as const,
                confidence_reason: "Preview mode",
              },
            }))).map((item) => (
              <article
                key={item.supplier.id}
                className={cn(
                  "rounded-3xl border p-5 transition",
                  selectedSupplier?.id === item.supplier.id
                    ? "border-[#2e7d65]/35 bg-[#f7fbf9] shadow-sm"
                    : "border-black/10 bg-[#fbfaf6]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#16201d] px-2.5 py-1 text-xs font-semibold text-white">#{item.discovery.rank}</span>
                      <h3 className="text-xl font-semibold text-[#16201d]">{item.supplier.name}</h3>
                      {item.supplier.bgmea_certified && <BadgeTag label="BGMEA" tone="green" />}
                      {item.supplier.source_type === "public_web" && <BadgeTag label="Public profile" tone="slate" />}
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#5d6965]">
                      <MapPin className="h-4 w-4 text-[#2e7d65]" />
                      {item.supplier.city}, {item.supplier.country}
                      <span className="text-[#9ba49f]">•</span>
                      <span className="capitalize">{item.supplier.category}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold text-[#16201d]">{Math.round(item.discovery.fit_score)}%</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">fit</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  <MetricCard label="Unit price" value={formatUSD(item.supplier.unit_price_usd)} />
                  <MetricCard label="MOQ" value={item.supplier.moq.toLocaleString()} />
                  <MetricCard label="Lead time" value={`${item.supplier.lead_time_days}d`} />
                  <MetricCard label="Rating" value={`${(item.supplier.rating ?? item.supplier.quality_rating).toFixed(1)}/5`} />
                  <MetricCard label="Risk" value={riskLabel(item.supplier.risk_score)} />
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm leading-6 text-[#475450]">{item.discovery.explanation}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {buildKeyPills(item.supplier, item.discovery.key_factors).map((pill) => (
                    <span key={pill} className="rounded-full bg-[#eef1ea] px-3 py-1 text-xs font-medium text-[#51605a]">
                      {pill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-[#5d6965]">
                    Confidence: <span className="font-medium text-[#16201d]">{item.discovery.confidence}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleShortlist(item.supplier.id)}
                      className="rounded-full bg-transparent"
                    >
                      {shortlist.includes(item.supplier.id) ? "Shortlisted" : "Shortlist"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedId(item.supplier.id)}
                      className="rounded-full bg-transparent"
                    >
                      Open detail
                      <ChevronRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Shortlist</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-[#16201d]">{shortlistSuppliers.length}/4 selected</h2>
              <Button asChild className="rounded-full bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]">
                <Link href="/app/compare">Compare selected</Link>
              </Button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">{shortlistSummary}</p>
          </div>

          <div className="space-y-3">
            {shortlistSuppliers.length > 0 ? (
              shortlistSuppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#16201d]">{supplier.name}</div>
                      <div className="mt-1 text-sm text-[#6d7a75]">
                        {supplier.country} • {formatUSD(supplier.unit_price_usd)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleShortlist(supplier.id)}
                      className="text-xs font-medium text-[#7a5b0f]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-sm leading-6 text-[#6d7a75]">
                Add suppliers from the ranked board so we can compare them side by side and run profit intelligence.
              </div>
            )}
          </div>

          {selectedSupplier ? (
            <div className="rounded-3xl border border-black/10 bg-[#fbfaf6] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Supplier profile</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#16201d]">{selectedSupplier.name}</h3>
                  <p className="mt-1 text-sm text-[#6d7a75]">
                    {selectedSupplier.city}, {selectedSupplier.country}
                  </p>
                </div>
                <RiskBadge score={selectedSupplier.risk_score} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <DetailRow label="Products" value={selectedSupplier.products?.slice(0, 3).join(", ") || selectedSupplier.subcategory} />
                <DetailRow label="Certifications" value={selectedSupplier.certifications.join(", ") || "Not listed"} />
                <DetailRow label="Operational fit" value={`MOQ ${selectedSupplier.moq}, lead ${selectedSupplier.lead_time_days}d, rating ${(selectedSupplier.rating ?? selectedSupplier.quality_rating).toFixed(1)}/5`} />
                <DetailRow label="Risk explanation" value={selectedBundle?.risk.explanation ?? selectedSupplier.risk_notes ?? "Run a live sourcing query to generate a fuller explanation."} />
              </div>

              <p className="mt-4 text-sm leading-6 text-[#4e5a55]">{selectedSupplier.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={runBargain}
                  disabled={bargainLoading}
                  className="rounded-full bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]"
                >
                  {bargainLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                  Bargain message
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href={`/app/suppliers/${selectedSupplier.id}`}>
                    Open full profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-transparent">
                  <Link href="/app/compare">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Profit & simulation
                  </Link>
                </Button>
              </div>

              {bargain && (
                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#16201d]">Bangla bargain draft</div>
                      <div className="text-xs text-[#6d7a75]">{bargain.meta.llm_mode}</div>
                    </div>
                    <Button type="button" variant="outline" onClick={copyBargain} className="rounded-full bg-transparent">
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#4e5a55]">{bargain.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 px-4 py-10 text-center text-sm text-[#6d7a75]">
              Pick a supplier to inspect the full profile.
            </div>
          )}

          <div className="rounded-2xl border border-black/10 bg-[#16201d] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">BuildFest proof</p>
            <p className="mt-2 text-sm leading-6 text-[#bdc8c2]">
              Workflow and health are still visible, but they now sit beside the product story instead of replacing it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full bg-white text-[#16201d] hover:bg-[#e8eee9]">
                <Link href="/app/workflow">Workflow</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10">
                <Link href="/app/health">Health</Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      {children}
    </div>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">
        <span>{label}</span>
        <span className="text-[#16201d]">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#2e7d65]"
      />
    </div>
  )
}

function MetaPill({ icon: Icon, label }: { icon: typeof Database; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#f7f4ec] px-3 py-1.5 text-[#495751]">
      <Icon className="h-3.5 w-3.5 text-[#2e7d65]" />
      {label}
    </span>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-base font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function BadgeTag({ label, tone }: { label: string; tone: "green" | "slate" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "green" && "bg-[#edf6f1] text-[#165c49]",
        tone === "slate" && "bg-[#eef1ea] text-[#5c6762]",
      )}
    >
      {label}
    </span>
  )
}

function RiskBadge({ score }: { score?: number }) {
  const label = riskLabel(score)
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        label.startsWith("Low") && "bg-emerald-50 text-emerald-700",
        label.startsWith("Medium") && "bg-amber-50 text-amber-700",
        label.startsWith("High") && "bg-red-50 text-red-700",
      )}
    >
      {label}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm leading-6 text-[#16201d]">{value}</div>
    </div>
  )
}

function buildKeyPills(supplier: Supplier, factors: string[]) {
  const pills = new Set<string>(factors.filter(Boolean))
  pills.add(`MOQ ${supplier.moq}`)
  pills.add(`${supplier.lead_time_days} day lead`)
  if (supplier.bgmea_certified) pills.add("BGMEA certified")
  if (supplier.certifications[0]) pills.add(supplier.certifications[0])
  return Array.from(pills).slice(0, 5)
}

function riskLabel(score?: number) {
  if (typeof score !== "number") return "Unknown risk"
  if (score <= 30) return `Low ${score}`
  if (score <= 60) return `Medium ${score}`
  return `High ${score}`
}
