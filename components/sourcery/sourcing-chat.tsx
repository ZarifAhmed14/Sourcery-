"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ChevronRight,
  Loader2,
  Maximize2,
  MapPin,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TermHelp, TermLabel } from "@/components/sourcery/term-help"
import { cn } from "@/lib/utils"
import { usePreferences } from "@/lib/preferences-context"
import {
  saveLatestResult,
  pushRecentQuery,
  readShortlistIds,
  saveShortlistIds,
  readWorkspaceState,
  saveWorkspaceState,
  saveCompareSupplierIds,
} from "@/lib/sourcing-result-store"
import { saveSearchAction } from "@/lib/sourcery/actions"
import { SUPPORTED_PRODUCT_CATALOG } from "@/lib/sourcery/supported-products"
import { getProductPriceBands, getProductVisualConfig, productDisplayName, type ProductPriceBand, type ProductVariant, type ProductVisualConfig } from "@/lib/sourcery/product-variants"
import { formatMoney } from "@/lib/currency"
import { getProductImage, getVariantPlaceholderImage } from "@/lib/product-images"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"

type SupplierListResponse = {
  suppliers: Supplier[]
  count: number
  source: "demo" | "supabase"
}

const REGION_COUNTRIES: Partial<Record<SupplierRegion, string[]>> = {
  "South Asia": ["Bangladesh", "India", "Pakistan"],
  "Southeast Asia": ["Indonesia", "Philippines", "Thailand", "Vietnam"],
  "East Asia": ["China"],
  MENA: ["Turkey"],
}

const REGION_OPTIONS: Array<"Any region" | SupplierRegion> = [
  "Any region",
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "MENA",
]

const ALLOWED_COUNTRIES = Array.from(new Set(Object.values(REGION_COUNTRIES).flat())).sort((a, b) => a.localeCompare(b))
type PriceBandValue = ProductPriceBand["value"]

const REGION_LABELS: Record<"Any region" | SupplierRegion, string> = {
  "Any region": "Any region",
  "South Asia": "South Asia (Bangladesh, India, Pakistan)",
  "Southeast Asia": "Southeast Asia (Indonesia, Philippines, Thailand, Vietnam)",
  "East Asia": "East Asia (China)",
  Europe: "Europe (Turkey)",
  MENA: "MENA (Turkey)",
  Africa: "Africa",
  "North America": "North America",
  "South America": "South America",
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function priceBandLabel(band: ProductPriceBand, bangladeshMode: boolean) {
  if (typeof band.min !== "number" || typeof band.max !== "number") return band.label
  const label = band.value.charAt(0).toUpperCase() + band.value.slice(1)
  return `${label}: ${formatMoney(band.min, bangladeshMode)}-${formatMoney(band.max, bangladeshMode)}`
}

function buildSourcingQuery(args: {
  category: SupplierCategory
  product: string
  productVariant?: string | null
  productSize?: string | null
  country: string
  region: "Any region" | SupplierRegion
  targetPriceMin?: number
  targetPriceMax?: number
  orderQuantity?: number
  extraDetail?: string | null
}) {
  const parts = [
    `${productDisplayName(args.product)} suppliers`,
    args.productVariant ? `style ${args.productVariant}` : null,
    args.productSize ? `size or pack ${args.productSize}` : null,
    `category ${args.category}`,
    args.country !== "Any country" ? `country ${args.country}` : null,
    args.region !== "Any region" ? `region ${args.region}` : null,
    typeof args.targetPriceMin === "number" ? `min unit price $${args.targetPriceMin}` : null,
    typeof args.targetPriceMax === "number" ? `max unit price $${args.targetPriceMax}` : null,
    typeof args.orderQuantity === "number" ? `order quantity ${args.orderQuantity} units` : null,
    args.extraDetail ? `extra detail ${args.extraDetail}` : null,
  ].filter(Boolean)

  return parts.join(", ")
}

function hasMeaningfulExplanation(explanation?: string | null) {
  if (!explanation) return false
  return !/ready for a live sourcing run|preview mode|preview scorecard/i.test(explanation)
}

function plainOperationalFit(supplier: Supplier) {
  const rating = (supplier.rating ?? supplier.quality_rating).toFixed(1)
  return `This supplier can start from ${supplier.moq.toLocaleString()} units, usually needs about ${supplier.lead_time_days} days before goods are ready, and has a ${rating}/5 quality rating. Lower MOQ is easier for a small test order; shorter lead time means you can restock faster.`
}

function plainRiskExplanation(supplier: Supplier, explanation?: string | null) {
  const product = supplier.products?.[0] ?? supplier.subcategory
  const distanceNote =
    supplier.country === "Bangladesh"
      ? "Local coordination is easier, but fabric, packaging, and final inspection still need checking before shipment."
      : "Because the goods travel across borders, packaging damage, customs delay, and shipping changes can affect the final delivery date."
  const leadNote =
    supplier.lead_time_days >= 45
      ? "The longer production window means you should confirm samples early and keep extra time for corrections."
      : "The lead time is workable, but the buyer should still confirm sample quality and production dates in writing."
  const moqNote =
    supplier.moq >= 1200
      ? "The minimum order is fairly high, so a mistake would tie up more cash and inventory."
      : "The order size is manageable for a first purchase, but quality checks still matter."

  const cleanExplanation = explanation ?? ""
  if (hasMeaningfulExplanation(cleanExplanation) && !/synthetic|risk score|\d+\/100/i.test(cleanExplanation)) {
    return cleanExplanation
  }

  return `${product} can vary in material quality, stitching, color, packaging, or finish. ${distanceNote} ${leadNote} ${moqNote}`
}

function displaySupplierName(supplier: Supplier) {
  return supplier.name
    .replace(/^(Atlas|Bridge|Crown|Dragon|East|Evergreen|Global|Harbor|Indigo|Jade|Metro|Noble|Onyx|Pacific|Pioneer|Prime|River|Summit|Unity|Vertex)\s+/i, "")
    .replace(/\s+\d{2,4}$/i, "")
    .replace(/\s+Works$/i, " Co.")
    .trim()
}

export function SourcingChat() {
  const { bangladeshMode } = usePreferences()

  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<SupplierCategory | undefined>(undefined)
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>(undefined)
  const [selectedCountry, setSelectedCountry] = useState("Any country")
  const [selectedRegion, setSelectedRegion] = useState<"Any region" | SupplierRegion>("Any region")
  const [priceBand, setPriceBand] = useState<PriceBandValue>("standard")
  const [orderQuantity, setOrderQuantity] = useState("")
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [hasRestoredState, setHasRestoredState] = useState(false)

  useEffect(() => {
    const savedState = readWorkspaceState()
    if (savedState) {
      setQuery(savedState.query ?? "")
      setHasSearched(Boolean(savedState.hasSearched))
      setSelectedCategory(savedState.selectedCategory as SupplierCategory | undefined)
      setSelectedProduct(savedState.selectedProduct)
      setSelectedCountry(savedState.selectedCountry ?? "Any country")
      setSelectedRegion((savedState.selectedRegion as "Any region" | SupplierRegion) ?? "Any region")
      setPriceBand((savedState.priceBand as PriceBandValue) ?? "standard")
      setOrderQuantity(savedState.orderQuantity ?? "")
      setSelectedVariant(savedState.selectedVariant ?? null)
      setSelectedSize(savedState.selectedSize ?? null)
      setSelectedId(savedState.selectedId ?? null)
    }

    const latest = typeof window !== "undefined" ? window.localStorage.getItem("sourcery.latest_result.v1") : null
    if (latest) {
      try {
        setResult(JSON.parse(latest) as SourcingResult)
      } catch {}
    }

    const prefill = new URLSearchParams(window.location.search).get("prefill")
    if (prefill) setQuery(prefill)

    setHasRestoredState(true)
  }, [])

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
    () => (selectedCategory ? SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === selectedCategory)?.products ?? [] : []),
    [selectedCategory],
  )

  const productVisual = useMemo(() => getProductVisualConfig(selectedProduct), [selectedProduct])
  const priceBandOptions = useMemo(() => getProductPriceBands(selectedProduct), [selectedProduct])

  const countryOptions = useMemo(() => {
    const regionCountries = selectedRegion === "Any region" ? ALLOWED_COUNTRIES : REGION_COUNTRIES[selectedRegion] ?? []
    const supplierCountries = suppliers
      .filter((supplier) => supplier.country && ALLOWED_COUNTRIES.includes(supplier.country))
      .filter((supplier) => selectedRegion === "Any region" || supplier.region === selectedRegion)
      .map((supplier) => supplier.country)
    return ["Any country", ...Array.from(new Set([...regionCountries, ...supplierCountries])).sort((a, b) => a.localeCompare(b))]
  }, [selectedRegion, suppliers])

  useEffect(() => {
    if (selectedCountry !== "Any country" && !countryOptions.includes(selectedCountry)) {
      setSelectedCountry("Any country")
    }
  }, [countryOptions, selectedCountry])

  useEffect(() => {
    if (!bangladeshMode) return
    setSelectedRegion("South Asia")
    setSelectedCountry("Bangladesh")
  }, [bangladeshMode])

  const filteredPool = useMemo(() => {
    const selectedBand = priceBandOptions.find((band) => band.value === priceBand) ?? priceBandOptions[0]
    const minPrice = selectedBand.min
    const maxPrice = selectedBand.max
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
  }, [directoryPool, orderQuantity, priceBand, priceBandOptions, selectedCategory, selectedCountry, selectedProduct, selectedRegion])

  const visibleRanked = useMemo(() => {
    if (ranked.length === 0) return []
    const visibleIds = new Set(filteredPool.map((supplier) => supplier.id))
    return ranked.filter((item) => visibleIds.has(item.supplier.id)).slice(0, 4)
  }, [filteredPool, ranked])

  useEffect(() => {
    if (!hasRestoredState) return
    saveWorkspaceState({
      query,
      hasSearched,
      selectedCategory,
      selectedProduct,
      selectedCountry,
      selectedRegion,
      priceBand,
      orderQuantity,
      selectedVariant,
      selectedSize,
      selectedId,
    })
  }, [
    hasRestoredState,
    hasSearched,
    orderQuantity,
    priceBand,
    query,
    selectedCategory,
    selectedCountry,
    selectedId,
    selectedProduct,
    selectedRegion,
    selectedSize,
    selectedVariant,
  ])

  useEffect(() => {
    if (!hasRestoredState) return
    if (!hasSearched) return
    saveCompareSupplierIds(visibleRanked.map((item) => item.supplier.id))
  }, [hasRestoredState, hasSearched, visibleRanked])

  const previewSuppliers = useMemo(() => {
    if (result) return []
    return filteredPool.slice(0, 3)
  }, [filteredPool, result])

  const selectedSupplier =
    visibleRanked.find((item) => item.supplier.id === selectedId)?.supplier ??
    filteredPool.find((item) => item.id === selectedId) ??
    visibleRanked[0]?.supplier ??
    filteredPool[0] ??
    null

  const selectedBundle = visibleRanked.find((item) => item.supplier.id === selectedSupplier?.id) ?? null

  const mismatchWarning = useMemo(() => {
    if (!query.trim()) return null
    const lowered = query.toLowerCase()
    if (!selectedCategory) return null
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
    if (!selectedCategory || !selectedProduct) {
      setError("Choose a category and product first.")
      setStatus("error")
      return
    }
    const selectedBand = priceBandOptions.find((band) => band.value === priceBand) ?? priceBandOptions[0]
    const targetUnitPriceMin = selectedBand.min
    const targetUnitPriceMax = selectedBand.max
    const normalizedOrderQuantity = parseOptionalNumber(orderQuantity)
    const composedQuery = buildSourcingQuery({
      category: selectedCategory,
      product: selectedProduct,
      productVariant: selectedVariant,
      productSize: selectedSize,
      country: bangladeshMode ? "Bangladesh" : selectedCountry,
      region: bangladeshMode ? "South Asia" : selectedRegion,
      targetPriceMin: targetUnitPriceMin,
      targetPriceMax: targetUnitPriceMax,
      orderQuantity: normalizedOrderQuantity,
      extraDetail: normalizeOptionalText(query),
    })

    setError(null)
    setStatus("loading")
    setHasSearched(true)

    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: composedQuery,
          bangladeshMode: false,
          topK: 4,
          category: selectedCategory,
          product: selectedProduct,
          country: bangladeshMode ? "Bangladesh" : selectedCountry === "Any country" ? null : selectedCountry,
          region: bangladeshMode ? "South Asia" : selectedRegion === "Any region" ? null : selectedRegion,
          targetUnitPriceMin: targetUnitPriceMin ?? null,
          targetUnitPriceMax: targetUnitPriceMax ?? null,
          orderQuantity: normalizedOrderQuantity ?? null,
        }),
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
        query: composedQuery,
        bangladeshMode,
        count: data.suppliers.length,
        ts: new Date().toISOString(),
        category: selectedCategory,
        product: selectedProduct,
        confidence: data.meta.confidence,
      })
      void saveSearchAction({
        query: composedQuery,
        bangladeshMode: false,
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

  const persistWorkspaceSnapshot = (nextSelectedId?: string | null) => {
    saveWorkspaceState({
      query,
      hasSearched,
      selectedCategory,
      selectedProduct,
      selectedCountry,
      selectedRegion,
      priceBand,
      orderQuantity,
      selectedVariant,
      selectedSize,
      selectedId: nextSelectedId ?? selectedId,
    })
    saveCompareSupplierIds(visibleRanked.map((item) => item.supplier.id))
  }

  const filterPanel = (
    <div className="grid gap-3">
      <FilterBlock label="Category">
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            const category = value as SupplierCategory
            setSelectedCategory(category)
            setSelectedProduct(undefined)
            setSelectedVariant(null)
            setSelectedSize(null)
            setPriceBand("standard")
          }}
        >
          <SelectTrigger aria-label="Category" className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d]">
            <SelectValue placeholder=" " />
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
        <Select
          value={selectedProduct}
          onValueChange={(product) => {
            setSelectedProduct(product)
            setSelectedVariant(null)
            setSelectedSize(null)
            setPriceBand("standard")
          }}
          disabled={!selectedCategory}
        >
          <SelectTrigger aria-label="Product" className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d]">
            <SelectValue placeholder=" " />
          </SelectTrigger>
          <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
            {availableProducts.map((product) => (
              <SelectItem key={product} value={product} className="capitalize">
                {productDisplayName(product)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Region">
        <Select value={selectedRegion} onValueChange={(value) => setSelectedRegion(value as "Any region" | SupplierRegion)}>
          <SelectTrigger className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d]">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
            {REGION_OPTIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {REGION_LABELS[region]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Country">
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d]">
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

      <FilterBlock label="Target unit price">
        <Select value={priceBand} onValueChange={(value) => setPriceBand(value as PriceBandValue)}>
          <SelectTrigger className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d]">
            <SelectValue placeholder="Choose price band" />
          </SelectTrigger>
          <SelectContent className="border-black/10 bg-[#fffdf7] text-[#16201d]">
            {priceBandOptions.map((band) => (
              <SelectItem key={band.value} value={band.value}>
                {priceBandLabel(band, bangladeshMode)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label="Order qty (units)">
        <Input
          inputMode="numeric"
          value={orderQuantity}
          onChange={(event) => setOrderQuantity(event.target.value)}
          placeholder="e.g. 1000"
          className="h-9 border-black/10 bg-[#f7f4ec] text-sm text-[#16201d] placeholder:text-[#85918c]"
        />
      </FilterBlock>

    </div>
  )

  return (
    <div className="space-y-4">
      {!hasSearched ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.85fr)]">
          <section className="rounded-2xl border border-black/10 bg-white/78 p-5 shadow-sm backdrop-blur-sm md:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {filterPanel}
              <div className="space-y-3 border-t border-black/10 pt-4">
                <Textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  rows={3}
                  disabled={status === "loading"}
                  className="resize-none rounded-xl border-black/10 bg-[#fbf8f1] text-base leading-7 text-[#16201d] shadow-none placeholder:text-[#7f8a85] focus-visible:ring-[#d9b44a]"
                  placeholder="Optional brief: add certification, packaging, delivery, or quality preferences."
                />
                {mismatchWarning && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-[#fff4d8] px-4 py-3 text-sm text-[#7a5b0f]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{mismatchWarning}</p>
                  </div>
                )}
                <Button
                  disabled={status === "loading"}
                  className="h-12 rounded-lg bg-[#16201d] px-5 text-[#f7f4ec] hover:bg-[#24332f]"
                >
                  {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Find suppliers
                </Button>
                {status === "error" && error && (
                  <div className="rounded-xl border border-red-400/30 bg-[#fff0ef] px-4 py-3 text-sm text-[#8a2e2b]">{error}</div>
                )}
              </div>
            </form>
          </section>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/78 shadow-sm">
            {selectedProduct && productVisual ? (
              <ProductOptionPreview
                category={selectedCategory}
                product={selectedProduct}
                visual={productVisual}
                selectedVariant={selectedVariant}
                selectedSize={selectedSize}
                onSelectVariant={setSelectedVariant}
                onSelectSize={setSelectedSize}
              />
            ) : (
              <div className="flex h-full min-h-[360px] flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(217,180,74,0.14),transparent_38%),#fffdf7] p-6 text-[#16201d] lg:min-h-[520px] lg:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Product overview</p>
                  <h2 className="mt-4 max-w-md font-serif text-5xl leading-none text-[#16201d]">Start with a category and product.</h2>
                </div>
                <div className="max-w-md space-y-3 text-sm leading-6 text-[#5d6965]">
                  <p>Choose what you need, set a practical price band, and we&apos;ll surface the suppliers most likely to work for your order.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <PreviewSignal icon={<Search className="h-3.5 w-3.5" />} title="Rank suppliers" detail="See price, MOQ, lead time, and fit in one view." />
                    <PreviewSignal icon={<BarChart3 className="h-3.5 w-3.5" />} title="Model margin" detail="Compare cost and profit before you contact anyone." />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
        <section className="space-y-4 rounded-2xl border border-black/10 bg-white/78 p-4 shadow-sm backdrop-blur-sm md:p-5">
          {filterPanel}

          <form onSubmit={onSubmit} className="space-y-3 border-t border-black/10 pt-4">
            <Textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={2}
              disabled={status === "loading"}
              className="resize-none rounded-xl border-black/10 bg-[#fbf8f1] text-base leading-7 text-[#16201d] shadow-none placeholder:text-[#7f8a85] focus-visible:ring-[#d9b44a]"
              placeholder="Optional brief: add certification, packaging, delivery, or quality preferences."
            />

            {mismatchWarning && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-[#fff4d8] px-4 py-3 text-sm text-[#7a5b0f]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{mismatchWarning}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={status === "loading"}
                className="h-12 rounded-lg bg-[#16201d] px-5 text-[#f7f4ec] hover:bg-[#24332f]"
              >
                {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Find suppliers
              </Button>
            </div>
          </form>

          {status === "error" && error && (
            <div className="rounded-xl border border-red-400/30 bg-[#fff0ef] px-4 py-3 text-sm text-[#8a2e2b]">{error}</div>
          )}

          <div className="hidden">
            {visibleRanked.map((item) => (
              <article
                key={item.supplier.id}
                className={cn(
                  "rounded-2xl border p-4 transition",
                  selectedSupplier?.id === item.supplier.id
                    ? "border-[#d9b44a]/45 bg-[#fffdf7] shadow-sm"
                    : "border-black/10 bg-white hover:border-[#d9b44a]/35 hover:shadow-sm",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#d9b44a] px-2.5 py-1 text-xs font-semibold text-[#16201d]">#{visibleRanked.findIndex((entry) => entry.supplier.id === item.supplier.id) + 1}</span>
                      <h3 className="text-lg font-semibold text-[#16201d]">{item.supplier.name}</h3>
                      <span className="rounded-full bg-[#f1ede3] px-2.5 py-1 text-xs font-semibold text-[#16201d]">
                        {Math.round(item.discovery.fit_score)}% fit
                      </span>
                      {item.supplier.bgmea_certified && <BadgeTag label="BGMEA" tone="green" />}
                      {item.supplier.source_type === "public_web" && <BadgeTag label="Public profile" tone="slate" />}
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#66736f]">
                      <MapPin className="h-4 w-4 text-[#d9b44a]" />
                      {item.supplier.city}, {item.supplier.country}
                      <span className="text-[#9aa59f]">/</span>
                      <span className="capitalize">{item.supplier.category}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-6">
                  <MetricCard label="Unit" value={formatMoney(item.supplier.unit_price_usd, bangladeshMode)} />
                  <MetricCard label="MOQ" value={item.supplier.moq.toLocaleString()} />
                  <MetricCard label="Lead" value={`${item.supplier.lead_time_days}d`} />
                  <MetricCard label="Rating" value={`${(item.supplier.rating ?? item.supplier.quality_rating).toFixed(1)}/5`} />
                  <MetricCard label="Risk" value={riskLabel(item.supplier.risk_score)} tone={riskTone(item.supplier.risk_score)} />
                  <MetricCard label="Confidence" value={item.discovery.confidence} />
                </div>

                {hasMeaningfulExplanation(item.discovery.explanation) && (
                  <div className="mt-4 rounded-xl bg-[#f7f4ec] px-4 py-3">
                    <p className="text-sm leading-6 text-[#53605c]">{item.discovery.explanation}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {buildKeyPills(item.supplier, item.discovery.key_factors).map((pill) => (
                    <span key={pill} className="rounded-full bg-[#f1ede3] px-3 py-1 text-xs font-medium text-[#53605c]">
                      {pill}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
            {status === "loading" && visibleRanked.length === 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-[#6d7a75]">Running supplier intelligence…</div>
            )}
            {status !== "loading" && visibleRanked.length === 0 && previewSuppliers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-black/12 bg-[#fffdf9] p-8 text-sm text-[#6d7a75]">
                  No suppliers matched this combination. Adjust the filters and run sourcing again.
                </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-black/10 bg-white/72 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d7a75]">Ranked suppliers</p>
              <p className="mt-1 text-sm text-[#53605c]">
                {visibleRanked.length > 0 ? "Click a supplier to open the decision profile." : "Run a search to rank suppliers."}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
              <Link href="/app/compare">
                <BarChart3 className="mr-2 h-4 w-4" />
                Profit & simulation
              </Link>
            </Button>
          </div>

          {visibleRanked.length > 0 ? (
            <div className="grid gap-3">
              {visibleRanked.map((item, itemIndex) => (
                <div
                  key={item.supplier.id}
                  className={cn(
                    "rounded-2xl border bg-[#fffdf9] p-4 transition hover:border-[#d9b44a]/70 hover:bg-white hover:shadow-md",
                    selectedSupplier?.id === item.supplier.id
                      ? "border-2 border-[#d9b44a] bg-white shadow-lg shadow-[#d9b44a]/15 ring-2 ring-[#d9b44a]/25"
                      : "border-black/10",
                  )}
                >
                  <Link
                    href={`/app/suppliers/${item.supplier.id}`}
                    onClick={() => {
                      setSelectedId(item.supplier.id)
                      persistWorkspaceSnapshot(item.supplier.id)
                    }}
                    className="grid min-w-0 gap-3 sm:grid-cols-[112px_1fr]"
                  >
                    <ProductPreviewImage supplier={item.supplier} className="h-24 rounded-xl" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#d9b44a] px-2 py-0.5 text-xs font-semibold text-[#16201d]">#{itemIndex + 1}</span>
                          <h3 className="truncate text-base font-semibold text-[#16201d]">{displaySupplierName(item.supplier)}</h3>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-[#66736f]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#d9b44a]" />
                          {item.supplier.city}, {item.supplier.country}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f1ede3] px-2.5 py-1 text-xs font-semibold text-[#16201d]">
                        {Math.round(item.discovery.fit_score)}% fit
                        <TermHelp term="Fit" />
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs sm:col-start-2">
                      <MiniMetric label="Unit" value={formatMoney(item.supplier.unit_price_usd, bangladeshMode)} />
                      <MiniMetric label="MOQ" value={item.supplier.moq.toLocaleString()} />
                      <MiniMetric label="Lead" value={`${item.supplier.lead_time_days}d`} />
                      <MiniMetric label="Risk" value={riskLabel(item.supplier.risk_score)} />
                    </div>

                  </Link>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleShortlist(item.supplier.id)}
                      className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#16201d] transition hover:bg-[#f1ede3]"
                    >
                      {shortlist.includes(item.supplier.id) ? "Shortlisted" : "Shortlist"}
                    </button>
                    <Link
                      href={`/app/suppliers/${item.supplier.id}`}
                      onClick={() => persistWorkspaceSnapshot(item.supplier.id)}
                      className="inline-flex items-center rounded-lg bg-[#16201d] px-4 py-2 text-sm font-semibold text-[#f7f4ec] transition hover:bg-[#24332f]"
                    >
                      View profile
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black/12 bg-[#fffdf9] px-4 py-10 text-center text-sm text-[#6d7a75]">
              Choose a product and click Find suppliers. The ranked list will appear here.
            </div>
          )}
        </aside>
      </section>
      )}
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

function PreviewSignal({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#fffdf9] px-3 py-3">
      <div className="flex items-center gap-2 text-[#16201d]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f1ede3] text-[#7a5b0f]">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#53605c]">{detail}</p>
    </div>
  )
}

function PreviewSupplierCard({ supplier, onSelect, bangladeshMode = false }: { supplier: Supplier; onSelect: () => void; bangladeshMode?: boolean }) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#d9b44a]/35 hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 text-left">
          <div className="truncate text-lg font-semibold text-[#16201d]">{supplier.name}</div>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#66736f]">
            <MapPin className="h-4 w-4 text-[#d9b44a]" />
            {supplier.city}, {supplier.country}
            <span className="text-[#9aa59f]">/</span>
            <span className="capitalize">{supplier.category}</span>
          </p>
        </button>
        <div className="flex flex-wrap gap-2">
          {supplier.bgmea_certified && <BadgeTag label="BGMEA" tone="green" />}
          {supplier.source_type === "public_web" && <BadgeTag label="Public profile" tone="slate" />}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        <MetricCard label="Unit" value={formatMoney(supplier.unit_price_usd, bangladeshMode)} />
        <MetricCard label="MOQ" value={supplier.moq.toLocaleString()} />
        <MetricCard label="Lead" value={`${supplier.lead_time_days}d`} />
        <MetricCard label="Rating" value={`${(supplier.rating ?? supplier.quality_rating).toFixed(1)}/5`} />
        <MetricCard label="Risk" value={riskLabel(supplier.risk_score)} tone={riskTone(supplier.risk_score)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {buildKeyPills(supplier, []).map((pill) => (
          <span key={pill} className="rounded-full bg-[#f1ede3] px-3 py-1 text-xs font-medium text-[#53605c]">
            {pill}
          </span>
        ))}
      </div>
    </article>
  )
}

function PreviewMiniSupplier({ supplier, onSelect, bangladeshMode = false }: { supplier: Supplier; onSelect: () => void; bangladeshMode?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-2xl border border-black/10 bg-[#fffdf9] p-3 text-left transition hover:border-[#d9b44a]/45 hover:bg-white"
    >
      <div className="truncate text-sm font-semibold text-[#16201d]">{supplier.name}</div>
      <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#66736f]">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#d9b44a]" />
        {supplier.city}, {supplier.country}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <span className="rounded-lg bg-[#f1ede3] px-2 py-1 text-[#53605c]">{formatMoney(supplier.unit_price_usd, bangladeshMode)}</span>
        <span className="rounded-lg bg-[#f1ede3] px-2 py-1 text-[#53605c]">{supplier.moq} MOQ</span>
        <span className="rounded-lg bg-[#f1ede3] px-2 py-1 text-[#53605c]">{supplier.lead_time_days}d</span>
      </div>
    </button>
  )
}

function ProductOptionPreview({
  product,
  visual,
  selectedVariant,
  selectedSize,
  onSelectVariant,
  onSelectSize,
}: {
  category?: SupplierCategory
  product: string
  visual: ProductVisualConfig
  selectedVariant: string | null
  selectedSize: string | null
  onSelectVariant: (value: string | null) => void
  onSelectSize: (value: string | null) => void
}) {
  return (
    <div className="min-h-[360px] bg-[#16201d] p-4 text-[#f7f4ec] md:p-5 lg:min-h-[520px] lg:p-6">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Product overview</p>
          <h2 className="mt-2 font-serif text-3xl leading-none md:text-4xl">{visual.displayName}</h2>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Choose type</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {visual.variants.map((variant) => (
              <ProductVariantCard
                key={variant.name}
                index={visual.variants.indexOf(variant)}
                product={product}
                variant={variant}
                selected={selectedVariant === variant.name}
                onClick={() => onSelectVariant(selectedVariant === variant.name ? null : variant.name)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Size / pack</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {visual.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSelectSize(selectedSize === size ? null : size)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  selectedSize === size
                    ? "border-[#d9b44a] bg-[#d9b44a] text-[#16201d]"
                    : "border-white/12 bg-white/8 text-[#edf5ef] hover:border-[#d9b44a]/70",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/12 bg-white/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Sourcing suggestions</p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[#dbe5df] xl:grid-cols-2">
            <p>Compare at least 4 suppliers before choosing one. A cheaper unit price can lose money if MOQ, shipping, or defects are high.</p>
            <p>Start with the standard price band for realistic quotes, then use profit simulation to test low-cost and premium versions.</p>
          </div>
        </div>

      </div>
    </div>
  )
}

function ProductVariantCard({
  index,
  product,
  variant,
  selected,
  onClick,
}: {
  index: number
  product: string
  variant: ProductVariant
  selected: boolean
  onClick: () => void
}) {
  const image = getVariantPlaceholderImage(index)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border bg-white/6 text-left transition hover:border-[#d9b44a]/70",
        selected ? "border-[#d9b44a] bg-[#d9b44a]/12 shadow-lg shadow-black/20" : "border-white/12",
      )}
    >
      <div className="relative h-36 overflow-hidden bg-[#ece7dc] sm:h-40 lg:h-48">
        <img src={image.src} alt={`${variant.name} preview`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`View ${variant.name} larger`}
              onClick={(event) => event.stopPropagation()}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-[#16201d]/85 text-[#f7f4ec] shadow-lg transition hover:bg-[#d9b44a] hover:text-[#16201d]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl border-black/10 bg-[#f7f4ec] p-3">
            <DialogTitle className="sr-only">{variant.name}</DialogTitle>
            <div className="overflow-hidden rounded-xl bg-[#ece7dc]">
              <img src={image.src} alt={`${variant.name} preview`} className="max-h-[84vh] w-full object-cover" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1 p-3">
        <div className="text-sm font-semibold text-[#f7f4ec]">{variant.name}</div>
        <p className="text-xs leading-5 text-[#cbd8d1]">{variant.detail}</p>
      </div>
    </div>
  )
}

function ProductPreviewImage({
  supplier,
  category,
  product,
  className,
  variant = "card",
}: {
  supplier?: Supplier
  category?: SupplierCategory
  product?: string
  className?: string
  variant?: "card" | "compact" | "hero"
}) {
  const image = getProductImage({ supplier, category, product })
  return (
    <div className={cn("relative overflow-hidden bg-[#ece7dc]", className)}>
      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-[#16201d]/75 via-transparent to-transparent",
          variant === "card" && "hidden",
        )}
      />
      {variant !== "card" && (
        <div className={cn("absolute left-4 right-4", variant === "hero" ? "bottom-6" : "bottom-3")}>
          <div className="inline-flex rounded-full bg-[#16201d]/82 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#f7f4ec]">
            {image.credit}
          </div>
          {variant === "hero" && (
            <h2 className="mt-3 max-w-xl font-serif text-5xl leading-none text-[#f7f4ec]">
              {product ?? supplier?.products?.[0] ?? "Product preview"}
            </h2>
          )}
        </div>
      )}
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
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">
        <TermLabel label={label} />
      </div>
      <div className="mt-1 text-base font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f1ede3] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#6d7a75]">
        <TermLabel label={label} />
      </div>
      <div className="mt-0.5 truncate font-semibold text-[#16201d]">{value}</div>
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
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-[13px] leading-5 text-[#16201d]">{value}</div>
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
