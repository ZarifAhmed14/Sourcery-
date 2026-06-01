"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
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
import { TermHelp, TermLabel } from "@/components/sourcery/term-help"
import { cn } from "@/lib/utils"
import { usePreferences } from "@/lib/preferences-context"
import {
  consumeWorkspaceReturnIntent,
  loadLatestResult,
  markWorkspaceReturnIntent,
  saveLatestResult,
  pushRecentQuery,
  readWorkspaceState,
  saveWorkspaceState,
  saveCompareSupplierIds,
} from "@/lib/sourcing-result-store"
import { saveSearchAction } from "@/lib/sourcery/actions"
import { SUPPORTED_PRODUCT_CATALOG } from "@/lib/sourcery/supported-products"
import { getProductPriceBands, getProductVisualConfig, productDisplayName, type ProductPriceBand, type ProductVariant, type ProductVisualConfig } from "@/lib/sourcery/product-variants"
import { formatMoney } from "@/lib/currency"
import { getProductVariantImage } from "@/lib/product-images"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"
import { readWorkspaceRerunParams } from "@/lib/workspace-rerun"

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
  Europe: "Europe (disabled in demo)",
  MENA: "MENA (Turkey)",
  Africa: "Africa (disabled in demo)",
  "North America": "North America (disabled in demo)",
  "South America": "South America (disabled in demo)",
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
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

function buildSupplierListUrl(args: {
  category?: SupplierCategory
  product?: string
  country: string
  region: "Any region" | SupplierRegion
}) {
  const params = new URLSearchParams({ limit: "100" })

  if (args.category) params.set("category", args.category)
  if (args.product) params.set("q", args.product)
  if (args.country !== "Any country") params.set("country", args.country)
  if (args.region !== "Any region") params.set("region", args.region)

  return `/api/suppliers?${params.toString()}`
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
  if (supplier.id === "eval-0003") return "Mahmud Group"
  return supplier.name
    .replace(/^(Atlas|Bridge|Crown|Dragon|East|Evergreen|Global|Harbor|Indigo|Jade|Metro|Noble|Onyx|Pioneer|Prime|River|Summit|Unity|Vertex|Dhaka|Hanoi|Mumbai|Jakarta|Istanbul|Bengaluru|Karachi|Lahore|Noida|Chattogram|Chittagong)\s+/i, "")
    .replace(/\s+\d{2,4}$/i, "")
    .replace(/\s+Works$/i, " Co.")
    .trim()
}

function supplierBestFor(supplier: Supplier): string {
  if (supplier.moq <= 400) return "small test orders"
  if (supplier.lead_time_days <= 22) return "fast restocks"
  if (supplier.unit_price_usd <= 2.5) return "margin-first buying"
  if ((supplier.rating ?? supplier.quality_rating) >= 4.6) return "premium quality"
  if (supplier.bgmea_certified) return "compliance-sensitive sourcing"
  if (supplier.country === "Bangladesh") return "local Bangladesh sourcing"
  return "balanced sourcing"
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const record = payload as {
    error?: string | { message?: string | null }
    message?: string | null
  }

  if (typeof record.error === "string" && record.error.trim()) return record.error
  if (record.error && typeof record.error === "object" && typeof record.error.message === "string" && record.error.message.trim()) {
    return record.error.message
  }
  if (typeof record.message === "string" && record.message.trim()) return record.message
  return null
}

function supplierConfidenceLabel(args: {
  confidence: "high" | "medium" | "low"
  fitScore: number
  resultQuality?: SourcingResult["meta"]["result_quality"]
}) {
  if (args.resultQuality === "limited_supplier_pool") {
    return { label: "Limited pool", className: "bg-[#f6e8e8] text-[#8d3b3b]" }
  }
  if (args.confidence === "high" || args.fitScore >= 80) {
    return { label: "High confidence", className: "bg-[#edf6f1] text-[#165c49]" }
  }
  if (args.confidence === "low" || args.fitScore < 55) {
    return { label: "Needs buyer check", className: "bg-[#fff1d6] text-[#8a5a00]" }
  }
  return { label: "Standard confidence", className: "bg-[#ede8dc] text-[#53605c]" }
}

function supplierExplanationFallback(supplier: Supplier): string {
  const product = supplier.products?.[0] ?? supplier.subcategory
  const productText = product ? ` for ${product}` : ""

  if (supplier.lead_time_days > 50) {
    return `Competitive pricing keeps this supplier in the mix${productText}, but the longer production window makes it better for planned inventory than rush replenishment.`
  }
  if (supplier.moq >= 3000) {
    return `The higher MOQ fits buyers with proven demand who need a supplier prepared for larger production runs.`
  }
  if (supplier.moq <= 500) {
    return `The lower order commitment makes this a practical first run before scaling into larger production.`
  }
  if (supplier.lead_time_days <= 25) {
    return `The shorter lead time makes this a strong option when the buyer wants to move quickly from sample to order.`
  }
  if (supplier.quality_rating >= 4.6 || (supplier.rating ?? 0) >= 4.6) {
    return `Product quality is the strongest reason to review this supplier, especially when finish and consistency matter more than the cheapest quote.`
  }
  if (supplier.risk_score <= 28) {
    return `Fewer operational warning signs make this a reliable profile to review early in the shortlist.`
  }
  if (supplier.unit_price_usd <= 3) {
    return `The pricing gives the buyer more room for packaging, freight, and resale margin.`
  }
  if (supplier.on_time_rate >= 95) {
    return `The delivery record supports a more dependable launch plan, which matters when timing is a buying priority.`
  }
  if (supplier.country === "Bangladesh") {
    return `This keeps the shortlist local in Bangladesh, making sampling, communication, and follow-up easier to manage.`
  }
  if (supplier.bgmea_certified) {
    return `The compliance signal helps when documentation and factory readiness matter to the buying decision.`
  }
  return `This gives the buyer a useful comparison point before deciding which supplier deserves outreach.`
}

function cardSupplierExplanation(supplier: Supplier, discovery: SourcingResult["discovery"][number]) {
  const explanation = discovery.explanation.trim()
  const bestFor = supplierBestFor(supplier).toLowerCase()
  const isBad =
    !explanation ||
    /^this supplier was selected\b/i.test(explanation) ||
    explanation.toLowerCase().includes(bestFor)

  return isBad ? supplierExplanationFallback(supplier) : explanation
}

export function SourcingChat() {
  const searchParams = useSearchParams()
  const { bangladeshMode, preferencesReady, setBangladeshMode } = usePreferences()

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const [restoreScrollY, setRestoreScrollY] = useState<number | null>(null)
  const [supplierListError, setSupplierListError] = useState<string | null>(null)
  const [pendingAutoRun, setPendingAutoRun] = useState<{
    bangladeshMode: boolean
    selectedCategory: SupplierCategory
    selectedProduct: string
    selectedCountry: string
    selectedRegion: "Any region" | SupplierRegion
    orderQuantity: string
    selectedVariant: string | null
    selectedSize: string | null
  } | null>(null)
  const supplierListCache = useRef(new Map<string, Supplier[]>())
  const bootstrapped = useRef(false)
  const lastBangladeshMode = useRef<boolean | null>(null)

  const resetSearchState = () => {
    setStatus("idle")
    setResult(null)
    setError(null)
    setHasSearched(false)
    setSelectedId(null)
  }

  const applyWorkspaceSnapshot = (savedState: ReturnType<typeof readWorkspaceState>, latestResult: SourcingResult | null) => {
    if (!savedState && !latestResult) return

    setHasSearched(Boolean(savedState?.hasSearched ?? latestResult))
    setSelectedCategory((savedState?.selectedCategory as SupplierCategory | undefined) ?? undefined)
    setSelectedProduct(savedState?.selectedProduct ?? undefined)
    setSelectedCountry(savedState?.selectedCountry ?? "Any country")
    setSelectedRegion((savedState?.selectedRegion as "Any region" | SupplierRegion) ?? "Any region")
    setPriceBand((savedState?.priceBand as PriceBandValue) ?? "standard")
    setOrderQuantity(savedState?.orderQuantity ?? "")
    setSelectedVariant(savedState?.selectedVariant ?? null)
    setSelectedSize(savedState?.selectedSize ?? null)
    setSelectedId(savedState?.selectedId ?? latestResult?.suppliers[0]?.id ?? null)
    setRestoreScrollY(typeof savedState?.scrollY === "number" ? savedState.scrollY : null)
    setResult(latestResult)
    setStatus(latestResult ? "done" : "idle")
    setError(null)
  }

  const shouldRestoreWorkspaceOnLoad = () => {
    if (typeof window === "undefined") return false

    const explicitReturnIntent = consumeWorkspaceReturnIntent()
    if (explicitReturnIntent) return true

    const navigationEntry = window.performance
      .getEntriesByType("navigation")
      .find((entry): entry is PerformanceNavigationTiming => entry instanceof PerformanceNavigationTiming)

    if (navigationEntry?.type === "back_forward") return true

    try {
      if (!document.referrer) return false
      const referrer = new URL(document.referrer)
      if (referrer.origin !== window.location.origin) return false
      return /^\/app\/(suppliers\/|compare|decision\/)/.test(referrer.pathname)
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!preferencesReady || bootstrapped.current) return
    bootstrapped.current = true

    const rerun = readWorkspaceRerunParams(searchParams)
    if (rerun) {
      const rerunBangladeshMode = Boolean(rerun.bangladeshMode)
      const nextCategory = (rerun.category as SupplierCategory | null) ?? undefined
      const nextProduct = rerun.product ?? undefined
      const nextVariant = rerun.type ?? null
      const nextRegion = ((rerun.region as SupplierRegion | "Any region" | null) ?? (rerunBangladeshMode ? "South Asia" : "Any region")) as
        | "Any region"
        | SupplierRegion
      const nextCountry = rerun.country ?? (rerunBangladeshMode ? "Bangladesh" : "Any country")
      const nextOrderQuantity = rerun.orderQuantity ?? ""

      if (rerunBangladeshMode !== bangladeshMode) {
        setBangladeshMode(rerunBangladeshMode)
      }

      setHasSearched(false)
      setSelectedCategory(nextCategory)
      setSelectedProduct(nextProduct)
      setSelectedCountry(nextCountry)
      setSelectedRegion(nextRegion)
      setPriceBand("standard")
      setOrderQuantity(nextOrderQuantity)
      setSelectedVariant(nextVariant)
      setSelectedSize(null)
      setSelectedId(null)
      setRestoreScrollY(null)
      setResult(null)
      setStatus("idle")
      setError(null)

      if (nextCategory && nextProduct) {
        setPendingAutoRun({
          bangladeshMode: rerunBangladeshMode,
          selectedCategory: nextCategory,
          selectedProduct: nextProduct,
          selectedCountry: nextCountry,
          selectedRegion: nextRegion,
          orderQuantity: nextOrderQuantity,
          selectedVariant: nextVariant,
          selectedSize: null,
        })
      }

      setHasRestoredState(true)
      return
    }

    const savedState = readWorkspaceState()
    const latestResult = loadLatestResult()
    const shouldRestoreWorkspace = shouldRestoreWorkspaceOnLoad()

    if (shouldRestoreWorkspace) {
      applyWorkspaceSnapshot(savedState, latestResult)
    } else {
      setHasSearched(false)
      setSelectedCategory(undefined)
      setSelectedProduct(undefined)
      setSelectedCountry("Any country")
      setSelectedRegion("Any region")
      setPriceBand("standard")
      setOrderQuantity("")
      setSelectedVariant(null)
      setSelectedSize(null)
      setSelectedId(null)
      setRestoreScrollY(null)
      setResult(null)
    }

    setHasRestoredState(true)
  }, [applyWorkspaceSnapshot, bangladeshMode, preferencesReady, searchParams, setBangladeshMode])

  useEffect(() => {
    if (!hasRestoredState || typeof restoreScrollY !== "number") return
    const id = window.setTimeout(() => {
      window.scrollTo(0, restoreScrollY)
      setRestoreScrollY(null)
    }, 120)
    return () => window.clearTimeout(id)
  }, [hasRestoredState, restoreScrollY, result])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const url = buildSupplierListUrl({
      category: selectedCategory,
      product: selectedProduct,
      country: selectedCountry,
      region: selectedRegion,
    })

    const cached = supplierListCache.current.get(url)
    if (cached) {
      setSuppliers(cached)
      setSupplierListError(null)
      setSelectedId((current) => {
        if (current && cached.some((supplier) => supplier.id === current)) return current
        return cached[0]?.id ?? null
      })
      return () => {
        active = false
        controller.abort()
      }
    }

    const timer = window.setTimeout(() => {
      void fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Supplier preview failed (${res.status})`)
        return res.json()
      })
      .then((data: SupplierListResponse) => {
        if (!active) return
        const nextSuppliers = data.suppliers ?? []
        supplierListCache.current.set(url, nextSuppliers)
        setSuppliers(nextSuppliers)
        setSupplierListError(null)
        setSelectedId((current) => {
          if (current && nextSuppliers.some((supplier) => supplier.id === current)) return current
          return nextSuppliers[0]?.id ?? null
        })
      })
      .catch((err) => {
        if (!active || (err as Error).name === "AbortError") return
        setSuppliers([])
        setSupplierListError("Supplier preview could not load. You can still run a search, or retry by changing a filter.")
      })
    }, 180)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [selectedCategory, selectedCountry, selectedProduct, selectedRegion])

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
  const priceBandOptions = useMemo(() => (selectedProduct ? getProductPriceBands(selectedProduct) : []), [selectedProduct])

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
    if (!preferencesReady) return
    if (lastBangladeshMode.current === null) {
      lastBangladeshMode.current = bangladeshMode
      return
    }

    lastBangladeshMode.current = bangladeshMode
    resetSearchState()
    if (bangladeshMode) {
      setSelectedRegion("South Asia")
      setSelectedCountry("Bangladesh")
      return
    }

    setSelectedRegion("Any region")
    setSelectedCountry("Any country")
  }, [bangladeshMode, preferencesReady])

  useEffect(() => {
    if (!hasRestoredState) return

    const restoreFromStorage = () => {
      if (typeof window === "undefined") return
      if (window.location.pathname !== "/app") return
      const savedState = readWorkspaceState()
      const latestResult = loadLatestResult()
      if (!savedState && !latestResult) return
      applyWorkspaceSnapshot(savedState, latestResult)
    }

    window.addEventListener("pageshow", restoreFromStorage)
    window.addEventListener("popstate", restoreFromStorage)
    return () => {
      window.removeEventListener("pageshow", restoreFromStorage)
      window.removeEventListener("popstate", restoreFromStorage)
    }
  }, [applyWorkspaceSnapshot, hasRestoredState])

  const filteredPool = useMemo(() => {
    const selectedBand = selectedProduct ? priceBandOptions.find((band) => band.value === priceBand) ?? priceBandOptions[0] : null
    const minPrice = selectedBand?.min
    const maxPrice = selectedBand?.max
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
    return ranked.slice(0, 5)
  }, [ranked])
  const displayedRanked = hasSearched ? visibleRanked : []
  const noAvailableSuppliersMessage =
    hasSearched && status !== "loading" && displayedRanked.length === 0
      ? "Sorry, there are no available suppliers for this product in this region at the moment. Please try again or explore a different product."
      : null

  useEffect(() => {
    if (!hasRestoredState) return
    saveWorkspaceState({
      query: "",
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
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    })
  }, [
    hasRestoredState,
    hasSearched,
    orderQuantity,
    priceBand,
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
    saveCompareSupplierIds(displayedRanked.map((item) => item.supplier.id))
  }, [displayedRanked, hasRestoredState, hasSearched])

  const previewSuppliers = useMemo(() => {
    if (result) return []
    return filteredPool.slice(0, 3)
  }, [filteredPool, result])

  const selectedSupplier =
    displayedRanked.find((item) => item.supplier.id === selectedId)?.supplier ??
    filteredPool.find((item) => item.id === selectedId) ??
    displayedRanked[0]?.supplier ??
    filteredPool[0] ??
    null

  const selectedBundle = displayedRanked.find((item) => item.supplier.id === selectedSupplier?.id) ?? null

  const executeSourcing = async (
    override?: {
      bangladeshMode?: boolean
      selectedCategory?: SupplierCategory
      selectedProduct?: string
      selectedCountry?: string
      selectedRegion?: "Any region" | SupplierRegion
      orderQuantity?: string
      selectedVariant?: string | null
      selectedSize?: string | null
    },
  ) => {
    const nextCategory = override?.selectedCategory ?? selectedCategory
    const nextProduct = override?.selectedProduct ?? selectedProduct
    const nextCountry = override?.selectedCountry ?? selectedCountry
    const nextRegion = override?.selectedRegion ?? selectedRegion
    const nextOrderQuantity = override?.orderQuantity ?? orderQuantity
    const nextVariant = override?.selectedVariant ?? selectedVariant
    const nextSize = override?.selectedSize ?? selectedSize
    const nextBangladeshMode = override?.bangladeshMode ?? bangladeshMode

    if (!nextCategory || !nextProduct) {
      setError("Choose a category and product first.")
      setStatus("error")
      return
    }
    const selectedBand = priceBandOptions.find((band) => band.value === priceBand) ?? priceBandOptions[0]
    const targetUnitPriceMin = selectedBand?.min
    const targetUnitPriceMax = selectedBand?.max
    const normalizedOrderQuantity = parseOptionalNumber(nextOrderQuantity)
    const composedQuery = buildSourcingQuery({
      category: nextCategory,
      product: nextProduct,
      productVariant: nextVariant,
      productSize: nextSize,
      country: nextCountry,
      region: nextRegion,
      targetPriceMin: targetUnitPriceMin,
      targetPriceMax: targetUnitPriceMax,
      orderQuantity: normalizedOrderQuantity,
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
          bangladeshMode: nextBangladeshMode,
          topK: 8,
          category: nextCategory ?? null,
          product: nextProduct ?? null,
          country: nextCountry === "Any country" ? null : nextCountry,
          region: nextRegion === "Any region" ? null : nextRegion,
          targetUnitPriceMin: targetUnitPriceMin ?? null,
          targetUnitPriceMax: targetUnitPriceMax ?? null,
          orderQuantity: normalizedOrderQuantity ?? null,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as unknown
        throw new Error(extractApiErrorMessage(body) ?? `Sourcing failed (${res.status})`)
      }
      const data = (await res.json()) as SourcingResult
      setResult(data)
      setSelectedId(data.suppliers[0]?.id ?? null)
      saveLatestResult(data)
      pushRecentQuery({
        query: composedQuery,
        bangladeshMode: nextBangladeshMode,
        count: data.suppliers.length,
        ts: new Date().toISOString(),
        category: nextCategory,
        product: nextProduct,
        type: nextVariant,
        confidence: data.meta.confidence,
      })
      void saveSearchAction({
        query: composedQuery,
        bangladeshMode: nextBangladeshMode,
        result: data,
        category: nextCategory,
        product: nextProduct,
        type: nextVariant,
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

  useEffect(() => {
    if (!hasRestoredState || !pendingAutoRun) return

    void executeSourcing(pendingAutoRun).finally(() => {
      setPendingAutoRun(null)
    })
  }, [hasRestoredState, pendingAutoRun])

  const persistWorkspaceSnapshot = (nextSelectedId?: string | null) => {
    saveWorkspaceState({
      query: "",
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
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    })
    saveCompareSupplierIds(displayedRanked.map((item) => item.supplier.id))
  }

  const buildAnalysisHref = (path: string) => {
    const params = new URLSearchParams()
    if (selectedProduct) params.set("product", selectedProduct)
    if (selectedVariant) params.set("type", selectedVariant)
    if (selectedSize) params.set("size", selectedSize)
    const query = params.toString()
    return query ? `${path}${path.includes("?") ? "&" : "?"}${query}` : path
  }

  useEffect(() => {
    if (!hasRestoredState) return
    const handlePageHide = () => persistWorkspaceSnapshot(selectedId)
    window.addEventListener("pagehide", handlePageHide)
    return () => window.removeEventListener("pagehide", handlePageHide)
  }, [displayedRanked, hasRestoredState, selectedId])

  const filterPanel = (
    <div className="grid gap-3">
      <FilterBlock label="Category">
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            resetSearchState()
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
            resetSearchState()
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

      {selectedProduct && productVisual ? (
        <FilterBlock label="Type">
          <button
            type="button"
            onClick={() => {
              resetSearchState()
              setSelectedVariant(null)
            }}
            className="flex h-9 w-full items-center justify-between rounded-md border border-black/10 bg-[#f7f4ec] px-3 text-sm text-[#16201d]"
          >
            <span className={cn(!selectedVariant && "text-[#85918c]")}>
              {selectedVariant ?? "Select a type from the preview cards"}
            </span>
            {selectedVariant ? <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a5b0f]">Clear</span> : null}
          </button>
        </FilterBlock>
      ) : null}

      <FilterBlock label="Region">
        <Select
          value={selectedRegion}
          onValueChange={(value) => {
            resetSearchState()
            setSelectedRegion(value as "Any region" | SupplierRegion)
          }}
        >
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
        <Select
          value={selectedCountry}
          onValueChange={(value) => {
            resetSearchState()
            setSelectedCountry(value)
          }}
        >
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
        <Select
          value={selectedProduct ? priceBand : undefined}
          onValueChange={(value) => {
            resetSearchState()
            setPriceBand(value as PriceBandValue)
          }}
          disabled={!selectedProduct}
        >
          <SelectTrigger className="h-9 w-full border-black/10 bg-[#f7f4ec] text-sm text-[#16201d] disabled:text-[#85918c]">
            <SelectValue placeholder={selectedProduct ? "Choose price band" : ""} />
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
          onChange={(event) => {
            resetSearchState()
            setOrderQuantity(event.target.value)
          }}
          placeholder="e.g. 1000"
          className="h-9 border-black/10 bg-[#f7f4ec] text-sm text-[#16201d] placeholder:text-[#85918c]"
        />
      </FilterBlock>

      {supplierListError ? (
        <div className="rounded-lg border border-[#d9b44a]/35 bg-[#fff8df] px-3 py-2 text-sm leading-6 text-[#6b5a24]">
          {supplierListError}
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-900">
          <div>{error}</div>
          <button type="button" onClick={() => void executeSourcing()} className="mt-2 font-semibold underline underline-offset-4">
            Retry sourcing
          </button>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="space-y-4">
      {!hasSearched ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.76fr)]">
          <section className="rounded-2xl border border-black/10 bg-white/78 p-5 shadow-sm backdrop-blur-sm md:p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              {filterPanel}
              <div className="space-y-3 border-t border-black/10 pt-4">
                <Button
                  disabled={status === "loading"}
                  className="h-12 rounded-lg bg-[#16201d] px-5 text-[#f7f4ec] hover:bg-[#24332f]"
                >
                  {status === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Find suppliers
                </Button>
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
      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,0.8fr)]">
        <section className="space-y-4 rounded-2xl border border-black/10 bg-white/78 p-4 shadow-sm backdrop-blur-sm md:p-5">
          {filterPanel}

          <form onSubmit={onSubmit} className="border-t border-black/10 pt-4">
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

          <div className="hidden">
            {visibleRanked.map((item) => (
              <article
                key={item.supplier.id}
                className="rounded-2xl border border-black/10 bg-white p-4 transition hover:border-[#d9b44a]/35 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#d9b44a] px-2.5 py-1 text-xs font-semibold text-[#16201d]">#{visibleRanked.findIndex((entry) => entry.supplier.id === item.supplier.id) + 1}</span>
                      <h3 className="text-lg font-semibold text-[#16201d]">{displaySupplierName(item.supplier)}</h3>
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
                  <MetricCard label="Unit price" value={formatMoney(item.supplier.unit_price_usd, bangladeshMode)} />
                  <MetricCard label="MOQ" value={item.supplier.moq.toLocaleString()} />
                  <MetricCard label="Lead" value={`${item.supplier.lead_time_days}d`} />
                  <MetricCard label="Rating" value={`${(item.supplier.rating ?? item.supplier.quality_rating).toFixed(1)}/5`} />
                  <MetricCard label="Best for" value={supplierBestFor(item.supplier)} />
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
                    <Button asChild variant="outline" className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
                      <Link href={buildAnalysisHref(`/app/compare?supplier=${item.supplier.id}`)}>
                        Profit view
                      </Link>
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
            {status === "loading" && displayedRanked.length === 0 && (
              <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-[#6d7a75]">Running supplier intelligence…</div>
            )}
            {status !== "loading" && displayedRanked.length === 0 && previewSuppliers.length === 0 && (
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
              {displayedRanked.length === 0 ? (
                <p className="mt-1 text-sm text-[#53605c]">
                  {noAvailableSuppliersMessage ? "No ranked suppliers for this search." : "Run a search to rank suppliers."}
                </p>
              ) : null}
            </div>
            {displayedRanked.length > 0 ? (
            <Button asChild variant="outline" className="rounded-lg border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3] hover:text-[#16201d]">
              <Link
                href={buildAnalysisHref("/app/compare")}
                onClick={() => {
                  persistWorkspaceSnapshot(selectedSupplier?.id ?? displayedRanked[0]?.supplier.id ?? null)
                  markWorkspaceReturnIntent()
                }}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Profit & simulation
              </Link>
            </Button>
            ) : null}
          </div>

          {displayedRanked.length > 0 ? (
            <div className="grid gap-3">
              {displayedRanked.map((item, itemIndex) => (
                <div
                  key={item.supplier.id}
                  className="rounded-2xl border border-black/10 bg-[#fffdf9] p-4 transition hover:border-[#d9b44a]/70 hover:bg-white hover:shadow-md"
                >
                  <Link
                    href={buildAnalysisHref(`/app/suppliers/${item.supplier.id}`)}
                    onClick={() => {
                      setSelectedId(item.supplier.id)
                      persistWorkspaceSnapshot(item.supplier.id)
                      markWorkspaceReturnIntent()
                    }}
                    className="grid min-w-0 gap-3"
                  >
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

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <MiniMetric label="Unit price" value={formatMoney(item.supplier.unit_price_usd, bangladeshMode)} />
                      <MiniMetric label="MOQ" value={item.supplier.moq.toLocaleString()} />
                      <MiniMetric label="Lead" value={`${item.supplier.lead_time_days}d`} />
                    </div>

                    <div className="rounded-xl border border-black/10 bg-[#f7f4ec] px-3 py-2 text-sm leading-6 text-[#4e5a55]">
                      {cardSupplierExplanation(item.supplier, item.discovery)}
                    </div>

                  </Link>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={buildAnalysisHref(`/app/compare?supplier=${item.supplier.id}`)}
                        onClick={() => {
                          persistWorkspaceSnapshot(item.supplier.id)
                          markWorkspaceReturnIntent()
                        }}
                        className="inline-flex items-center rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-[#16201d] transition hover:bg-[#f1ede3]"
                      >
                        Profit view
                      </Link>
                    <Link
                      href={buildAnalysisHref(`/app/suppliers/${item.supplier.id}`)}
                      onClick={() => {
                        persistWorkspaceSnapshot(item.supplier.id)
                        markWorkspaceReturnIntent()
                      }}
                      className="inline-flex items-center rounded-lg bg-[#16201d] px-4 py-2 text-sm font-semibold text-[#f7f4ec] transition hover:bg-[#24332f]"
                    >
                      View profile
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : noAvailableSuppliersMessage ? (
            <div className="rounded-2xl border border-[#d9b44a]/35 bg-[#fff8df] px-8 py-14 text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">No suppliers available</p>
              <p className="mx-auto mt-4 max-w-xl text-xl font-semibold leading-8 text-[#16201d]">
                {noAvailableSuppliersMessage}
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#5d6965]">
                Try again with a broader region, another country, or a different product to discover more sourcing options.
              </p>
            </div>
          ) : selectedProduct && productVisual ? (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/78 shadow-sm">
              <ProductOptionPreview
                category={selectedCategory}
                product={selectedProduct}
                visual={productVisual}
                selectedVariant={selectedVariant}
                selectedSize={selectedSize}
                onSelectVariant={(value) => {
                  resetSearchState()
                  setSelectedVariant(value)
                }}
                onSelectSize={(value) => {
                  resetSearchState()
                  setSelectedSize(value)
                }}
              />
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
          <div className="truncate text-lg font-semibold text-[#16201d]">{displaySupplierName(supplier)}</div>
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
        <MetricCard label="Unit price" value={formatMoney(supplier.unit_price_usd, bangladeshMode)} />
        <MetricCard label="MOQ" value={supplier.moq.toLocaleString()} />
        <MetricCard label="Lead" value={`${supplier.lead_time_days}d`} />
        <MetricCard label="Rating" value={`${(supplier.rating ?? supplier.quality_rating).toFixed(1)}/5`} />
        <MetricCard label="Best for" value={supplierBestFor(supplier)} />
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
      <div className="truncate text-sm font-semibold text-[#16201d]">{displaySupplierName(supplier)}</div>
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
    <div className="min-h-[360px] bg-[#16201d] p-3 text-[#f7f4ec] md:p-4 lg:min-h-[520px] lg:p-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Product overview - {visual.displayName}</p>
          <p className="mt-1 text-sm text-[#cbd8d1]">Choose 1 type to continue.</p>
        </div>
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="mt-2 flex flex-wrap gap-2">
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
  const image = getProductVariantImage(product, variant.name, index)

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
        "group cursor-pointer overflow-hidden rounded-xl text-left shadow-sm transition hover:shadow-lg hover:shadow-black/25",
        selected ? "ring-2 ring-[#d9b44a] ring-offset-2 ring-offset-[#16201d]" : "",
      )}
    >
      <div className="relative h-40 overflow-hidden bg-[#07100d] sm:h-44 lg:h-52">
        <Image
          src={image.src}
          alt={`${variant.name} preview`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain object-center transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 min-h-[30%] bg-gradient-to-t from-[#07100d]/92 via-[#07100d]/58 to-transparent p-3 pt-8">
          <div className="text-sm font-semibold text-[#f7f4ec]">{variant.name}</div>
          <p className="mt-0.5 text-xs leading-5 text-[#dbe5df]">{variant.detail}</p>
        </div>
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
              <Image
                src={image.src}
                alt={`${variant.name} preview`}
                width={1600}
                height={1200}
                sizes="90vw"
                className="max-h-[84vh] h-auto w-full object-cover"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
