"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  Copy,
  Loader2,
  MapPin,
  MessageSquareText,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const DEFAULT_COUNTRIES = ["Any country", "Bangladesh", "India", "Pakistan", "Vietnam", "China", "Turkey", "Morocco"]
const REGION_OPTIONS: Array<"Any region" | SupplierRegion> = [
  "Any region",
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Europe",
  "MENA",
  "Africa",
  "North America",
  "South America",
]

const formatUSD = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : "TBD"

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function SourcingChat() {
  const searchParams = useSearchParams()
  const { bangladeshMode } = usePreferences()

  const [query, setQuery] = useState(STARTERS[0])
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [bargain, setBargain] = useState<BargainResponse | null>(null)
  const [bargainLoading, setBargainLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory>("accessories")
  const [selectedProduct, setSelectedProduct] = useState("jute tote bags")
  const [selectedCountry, setSelectedCountry] = useState("Any country")
  const [selectedRegion, setSelectedRegion] = useState<"Any region" | SupplierRegion>("Any region")
  const [targetPriceMin, setTargetPriceMin] = useState("")
  const [targetPriceMax, setTargetPriceMax] = useState("")
  const [orderQuantity, setOrderQuantity] = useState("")

  useEffect(() => {
    const prefill = searchParams?.get("prefill")
    if (prefill) setQuery(prefill)
  }, [searchParams])

  useEffect(() => {
    setShortlist(readShortlistIds())
  }, [])

  useEffect(() => {
    let active = true
    void fetch("/api/suppliers?limit=12")
      .then((res) => res.json())
      .then((data: SupplierListResponse) => {
        if (!active) return
        setSuppliers(data.suppliers ?? [])
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

  const availableProducts = useMemo(
    () => SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === selectedCategory)?.products ?? [],
    [selectedCategory],
  )

  const countryOptions = useMemo(() => {
    const dynamic = Array.from(new Set(suppliers.map((supplier) => supplier.country).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    )
    return Array.from(new Set([...DEFAULT_COUNTRIES, ...dynamic]))
  }, [suppliers])

  const filteredPool = useMemo(() => {
    const minPrice = parseOptionalNumber(targetPriceMin)
    const maxPrice = parseOptionalNumber(targetPriceMax)
    const desiredQty = parseOptionalNumber(orderQuantity)

    return directoryPool.filter((supplier) => {
      if (selectedCategory && supplier.category !== selectedCategory) return false
      if (selectedProduct) {
        const productNeedle = selectedProduct.toLowerCase()
        const productMatch =
          supplier.subcategory.toLowerCase().includes(productNeedle) ||
          supplier.products?.some((product) => product.toLowerCase().includes(productNeedle))
        if (!productMatch) return false
      }
      if (selectedCountry !== "Any country" && supplier.country !== selectedCountry) return false
      if (selectedRegion !== "Any region" && supplier.region !== selectedRegion) return false
      if (typeof minPrice === "number" && supplier.unit_price_usd < minPrice) return false
      if (typeof maxPrice === "number" && supplier.unit_price_usd > maxPrice) return false
      if (typeof desiredQty === "number" && supplier.moq > desiredQty) return false
      return true
    })
  }, [directoryPool, orderQuantity, selectedCategory, selectedCountry, selectedProduct, selectedRegion, targetPriceMax, targetPriceMin])

  const visibleRanked = useMemo(() => {
    if (ranked.length === 0) return []
    const visibleIds = new Set(filteredPool.map((supplier) => supplier.id))
    return ranked.filter((item) => visibleIds.has(item.supplier.id)).slice(0, 4)
  }, [filteredPool, ranked])

  const selectedSupplier =
    (visibleRanked.find((item) => item.supplier.id === selectedId)?.supplier ??
      filteredPool.find((item) => item.id === selectedId) ??
      visibleRanked[0]?.supplier ??
      filteredPool[0] ??
      null)

  const selectedBundle = visibleRanked.find((item) => item.supplier.id === selectedSupplier?.id) ?? null

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

  const executeSourcing = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return

    setError(null)
    setStatus("loading")

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          bangladeshMode,
          topK: 4,
          category: selectedCategory,
          product: selectedProduct,
          country: selectedCountry === "Any country" ? null : selectedCountry,
          region: selectedRegion === "Any region" ? null : selectedRegion,
          targetUnitPriceMin: parseOptionalNumber(targetPriceMin) ?? null,
          targetUnitPriceMax: parseOptionalNumber(targetPriceMax) ?? null,
          orderQuantity: parseOptionalNumber(orderQuantity) ?? null,
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
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await executeSourcing()
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
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-5 rounded-2xl border border-black/10 bg-white/72 p-5 shadow-sm backdrop-blur-sm">
          <div className="grid gap-4">
            <FilterBlock label="Category">
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  const category = value as SupplierCategory
                  setSelectedCategory(category)
                  const nextProduct = SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === category)?.products[0] ?? ""
                  setSelectedProduct(nextProduct)
                  if (nextProduct) {
                    setQuery(`${nextProduct} suppliers, low MOQ, export-ready, certification preferred`)
                  }
                }}
              >
                <SelectTrigger className="w-full border-black/10 bg-[#f7f4ec] text-[#16201d]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
                  {SUPPORTED_PRODUCT_CATALOG.map((item) => (
                    <SelectItem key={item.category} value={item.category}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBlock>

            <FilterBlock label="Product">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-full border-black/10 bg-[#f7f4ec] text-[#16201d]">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
                  {availableProducts.map((product) => (
                    <SelectItem key={product} value={product} className="capitalize">
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBlock>

            <FilterBlock label="Country">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full border-black/10 bg-[#f7f4ec] text-[#16201d]">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
                  {countryOptions.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBlock>

            <FilterBlock label="Region">
              <Select value={selectedRegion} onValueChange={(value) => setSelectedRegion(value as "Any region" | SupplierRegion)}>
                <SelectTrigger className="w-full border-black/10 bg-[#f7f4ec] text-[#16201d]">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
                  {REGION_OPTIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterBlock>

            <FilterBlock label="Target unit price">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  inputMode="decimal"
                  value={targetPriceMin}
                  onChange={(event) => setTargetPriceMin(event.target.value)}
                  placeholder="Min $"
                  className="border-black/10 bg-[#f7f4ec] text-[#16201d] placeholder:text-[#85918c]"
                />
                <Input
                  inputMode="decimal"
                  value={targetPriceMax}
                  onChange={(event) => setTargetPriceMax(event.target.value)}
                  placeholder="Max $"
                  className="border-black/10 bg-[#f7f4ec] text-[#16201d] placeholder:text-[#85918c]"
                />
              </div>
            </FilterBlock>

            <FilterBlock label="Order qty (units)">
              <Input
                inputMode="numeric"
                value={orderQuantity}
                onChange={(event) => setOrderQuantity(event.target.value)}
                placeholder="e.g. 1000"
                className="border-black/10 bg-[#f7f4ec] text-[#16201d] placeholder:text-[#85918c]"
              />
            </FilterBlock>

            <Button
              type="button"
              onClick={() => void executeSourcing()}
              disabled={status === "loading" || query.trim().length < 2}
              className="h-11 rounded-xl bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]"
            >
              {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Run sourcing
            </Button>
          </div>
        </aside>

        <section className="space-y-6 rounded-2xl border border-black/10 bg-white/78 p-6 shadow-sm backdrop-blur-sm md:p-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={4}
              disabled={status === "loading"}
              className="resize-none rounded-xl border-black/10 bg-[#fbf8f1] text-base leading-7 text-[#16201d] shadow-none placeholder:text-[#7f8a85] focus-visible:ring-[#d9b44a]"
              placeholder="Describe the supplier you need."
            />

            {mismatchWarning && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-[#fff4d8] px-4 py-3 text-sm text-[#7a5b0f]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{mismatchWarning}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={status === "loading" || query.trim().length < 2}
                className="h-12 rounded-lg bg-[#16201d] px-5 text-[#f7f4ec] hover:bg-[#24332f]"
              >
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Run sourcing
              </Button>
            </div>
          </form>

          {status === "error" && error && (
            <div className="rounded-xl border border-red-400/30 bg-[#fff0ef] px-4 py-3 text-sm text-[#8a2e2b]">{error}</div>
          )}

          <div className="grid gap-4">
            {(visibleRanked.length > 0 ? visibleRanked : filteredPool.slice(0, 4).map((supplier, index) => ({
              supplier,
              discovery: {
                supplier_id: supplier.id,
                rank: index + 1,
                fit_score: Math.max(60, 93 - index * 5),
                explanation: `${supplier.name} is present in the supplier base and ready for a live sourcing run.`,
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
                  "rounded-2xl border p-6 transition",
                  selectedSupplier?.id === item.supplier.id
                    ? "border-[#d9b44a]/45 bg-[#fffdf7] shadow-sm"
                    : "border-black/10 bg-white hover:border-[#d9b44a]/35 hover:shadow-sm",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#d9b44a] px-2.5 py-1 text-xs font-semibold text-[#16201d]">#{item.discovery.rank}</span>
                      <h3 className="text-xl font-semibold text-[#16201d]">{item.supplier.name}</h3>
                      {item.supplier.bgmea_certified && <BadgeTag label="BGMEA" tone="green" />}
                      {item.supplier.source_type === "public_web" && <BadgeTag label="Public profile" tone="slate" />}
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#66736f]">
                      <MapPin className="h-4 w-4 text-[#d9b44a]" />
                      {item.supplier.city}, {item.supplier.country}
                      <span className="text-[#9aa59f]">/</span>
                      <span className="capitalize">{item.supplier.category}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold text-[#16201d]">{Math.round(item.discovery.fit_score)}%</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[#7d8883]">fit</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                  <MetricCard label="Unit" value={formatUSD(item.supplier.unit_price_usd)} />
                  <MetricCard label="MOQ" value={item.supplier.moq.toLocaleString()} />
                  <MetricCard label="Lead" value={`${item.supplier.lead_time_days}d`} />
                  <MetricCard label="Rating" value={`${(item.supplier.rating ?? item.supplier.quality_rating).toFixed(1)}/5`} />
                  <MetricCard label="Risk" value={riskLabel(item.supplier.risk_score)} tone={riskTone(item.supplier.risk_score)} />
                </div>

                <div className="mt-5 border-l-2 border-[#d9b44a]/50 bg-[#f8f2e2] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d9b44a]">Why this supplier</div>
                  <p className="mt-1 text-sm leading-6 text-[#53605c]">{item.discovery.explanation}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {buildKeyPills(item.supplier, item.discovery.key_factors).map((pill) => (
                    <span key={pill} className="rounded-full bg-[#f1ede3] px-3 py-1 text-xs font-medium text-[#53605c]">
                      {pill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-[#6a746f]">
                    Confidence: <span className="font-medium text-[#16201d]">{item.discovery.confidence}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleShortlist(item.supplier.id)}
                      className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]"
                    >
                      {shortlist.includes(item.supplier.id) ? "Shortlisted" : "Shortlist"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedId(item.supplier.id)}
                      className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]"
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

        <aside className="space-y-5 rounded-2xl border border-black/10 bg-white/72 p-5 shadow-sm backdrop-blur-sm">

          {selectedSupplier ? (
            <div className="rounded-2xl border border-black/10 bg-[#fffdf9] p-5 text-[#16201d]">
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

              <p className="mt-4 text-sm leading-6 text-[#53605c]">{selectedSupplier.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={runBargain}
                  disabled={bargainLoading}
                  className="rounded-lg bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]"
                >
                  {bargainLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
                  Bargain message
                </Button>
                <Button asChild variant="outline" className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
                  <Link href={`/app/suppliers/${selectedSupplier.id}`}>
                    Open full profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
                  <Link href="/app/compare">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Profit & simulation
                  </Link>
                </Button>
              </div>

              {bargain && (
                <div className="mt-4 rounded-xl border border-black/10 bg-[#f7f4ec] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#16201d]">Bangla bargain draft</div>
                      <div className="text-xs text-[#6d7a75]">{bargain.meta.llm_mode}</div>
                    </div>
                    <Button type="button" variant="outline" onClick={copyBargain} className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#53605c]">{bargain.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/12 bg-[#fffdf9] px-4 py-10 text-center text-sm text-[#6d7a75]">
              Pick a supplier to inspect the full profile.
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

function FilterBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a75]">{label}</div>
      {children}
    </div>
  )
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "low" | "medium" | "high" }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "default" && "border-black/10 bg-[#fffdf9]",
        tone === "low" && "border-emerald-300/60 bg-emerald-50",
        tone === "medium" && "border-amber-300/60 bg-amber-50",
        tone === "high" && "border-red-300/60 bg-red-50",
      )}
    >
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
        tone === "green" && "bg-emerald-100 text-emerald-700",
        tone === "slate" && "bg-[#ede8dc] text-[#53605c]",
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
        label.startsWith("Low") && "bg-emerald-100 text-emerald-700",
        label.startsWith("Medium") && "bg-amber-100 text-amber-700",
        label.startsWith("High") && "bg-red-100 text-red-700",
      )}
    >
      {label}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#f7f4ec] p-3">
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

function riskTone(score?: number): "low" | "medium" | "high" {
  if (typeof score !== "number") return "medium"
  if (score <= 30) return "low"
  if (score <= 60) return "medium"
  return "high"
}
