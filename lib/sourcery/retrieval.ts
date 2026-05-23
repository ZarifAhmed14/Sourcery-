import { embedQuery } from "@/lib/ai/embeddings"
import { hasServiceSupabaseEnv } from "@/lib/env"
import { getAdminClient } from "@/lib/supabase/admin"
import { getDemoSuppliers } from "@/lib/sourcery/demo-suppliers"
import { normalizeSupplier, supplierSearchHaystack } from "@/lib/sourcery/supplier-normalizer"
import type { Supplier, SupplierCategory } from "@/lib/types"

export type RetrievalMode = "vector" | "full_text" | "deterministic"

export type RetrievalResult = {
  suppliers: Supplier[]
  mode: RetrievalMode
  relaxed: boolean
}

type BuyerFilters = {
  product?: string | null
  country?: string | null
  region?: Supplier["region"] | null
  targetUnitPriceMin?: number | null
  targetUnitPriceMax?: number | null
  orderQuantity?: number | null
  maxMOQ?: number | null
  maxLeadTimeDays?: number | null
  minQualityRating?: number | null
}

type SupplierRow = Record<string, unknown> & {
  similarity?: number | null
  retrieval_score?: number | null
}

const MINIMUM_SOURCE_RESULTS = 4
const BD_PRIORITY_COUNTRIES = new Set(["Bangladesh", "India", "Pakistan", "Vietnam"])

const CATEGORY_KEYWORDS: Record<SupplierCategory, RegExp> = {
  apparel: /\b(shirt|tee|t-shirt|hoodie|sweat|jeans|denim|jacket|knit|woven|fabric|garment|apparel|legging|activewear|silk|cashmere|cotton|textile)\b/,
  beauty: /\b(skincare|skin care|serum|cosmetic|lipstick|beauty|haircare|shampoo|cream|lotion|argan|cleanser|fragrance|perfume|soap)\b/,
  home: /\b(bedding|towel|sheet|rug|carpet|kitchen|ceramic|porcelain|home|decor|cookware|pillow|linen|bath|furniture)\b/,
  food: /\b(food|spice|coffee|tea|rice|grain|grains|olive oil|pantry|snack|chocolate|wine|sauce|honey|nut|beverage)\b/,
  packaging: /\b(packaging|package|carton|box|label|paper bag|bottle|tube|jar|container)\b/,
  electronics: /\b(__disabled_electronics_category__)\b/,
  accessories: /\b(bag|bags|tote|totes|backpack|wallet|leather|jewel|watch|eyewear|case|accessory)\b/,
  textiles: /\b(textile|fabric|woven|linen|cotton|twill|mill|yarn)\b/,
  footwear: /\b(footwear|shoe|sneaker|canvas|outsole|leather shoe)\b/,
  industrial: /\b(industrial|metal|bracket|fixture|fabrication|parts)\b/,
}

export function detectCategory(query: string): SupplierCategory | null {
  const q = query.toLowerCase()
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS) as Array<[SupplierCategory, RegExp]>) {
    if (pattern.test(q)) return category
  }
  return null
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .slice(0, 8)
}

function uniqueSuppliers(suppliers: Supplier[]): Supplier[] {
  const byId = new Map<string, Supplier>()
  const byName = new Set<string>()
  for (const supplier of suppliers) {
    const nameKey = supplier.name
      .toLowerCase()
      .replace(/\s+\d{1,4}$/g, "")
      .replace(/\b(works|co\.?|company|ltd\.?|limited|group|collective)\b/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()

    if (byId.has(supplier.id) || byName.has(nameKey)) continue
    byId.set(supplier.id, supplier)
    if (nameKey) byName.add(nameKey)
  }
  return [...byId.values()]
}

function filterByCategoryWithFallback(suppliers: Supplier[], category: SupplierCategory | null): Supplier[] {
  if (!category) return suppliers
  const filtered = suppliers.filter((supplier) => supplier.category === category)
  return filtered.length > 0 ? filtered : suppliers
}

function normalizeCountryFilter(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || normalized === "any") return null
  return normalized
}

function applyBuyerFilters(suppliers: Supplier[], filters: BuyerFilters): Supplier[] {
  const country = normalizeCountryFilter(filters.country)
  return suppliers.filter((supplier) => {
    if (country && supplier.country.toLowerCase() !== country) return false
    if (filters.region && supplier.region !== filters.region) return false
    if (typeof filters.targetUnitPriceMin === "number" && supplier.unit_price_usd < filters.targetUnitPriceMin) return false
    if (typeof filters.targetUnitPriceMax === "number" && supplier.unit_price_usd > filters.targetUnitPriceMax) return false
    if (typeof filters.maxMOQ === "number" && supplier.moq > filters.maxMOQ) return false
    if (typeof filters.maxLeadTimeDays === "number" && supplier.lead_time_days > filters.maxLeadTimeDays) return false
    if (typeof filters.minQualityRating === "number" && supplier.quality_rating < filters.minQualityRating) return false
    return true
  })
}

function relaxBuyerFilters(filters: BuyerFilters): BuyerFilters {
  return {
    ...filters,
    country: null,
    targetUnitPriceMin: null,
    targetUnitPriceMax: null,
    maxMOQ: null,
    maxLeadTimeDays: null,
    minQualityRating: null,
  }
}

function productMatches(supplier: Supplier, product?: string | null): boolean {
  const normalized = product?.trim().toLowerCase()
  if (!normalized) return false
  return (
    supplier.subcategory.toLowerCase() === normalized ||
    supplier.products?.some((item) => item.toLowerCase().includes(normalized)) ||
    supplierSearchHaystack(supplier).includes(normalized)
  )
}

function hasDirectQueryMatch(supplier: Supplier, query: string, category: SupplierCategory | null): boolean {
  const tokens = tokenize(query)
  const haystack = supplierSearchHaystack(supplier)
  return (category !== null && supplier.category === category) || tokens.some((token) => haystack.includes(token))
}

function relevanceScore(supplier: Supplier, query: string, category: SupplierCategory | null, filters: BuyerFilters): number {
  const tokens = tokenize(query)
  const haystack = supplierSearchHaystack(supplier)
  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length
  const tokenScore = tokens.length ? (matchedTokens / tokens.length) * 52 : 8
  const vectorScore = typeof supplier.retrieval_score === "number" ? supplier.retrieval_score * 24 : 0
  const categoryScore = category && supplier.category === category ? 18 : 0
  const qualityScore = supplier.quality_rating * 4
  const riskScore = Math.max(0, 10 - supplier.risk_score * 0.12)
  const leadScore = supplier.lead_time_days <= 30 ? 8 : supplier.lead_time_days <= 45 ? 4 : 0
  const moqScore = supplier.moq <= 500 ? 6 : supplier.moq <= 1000 ? 3 : 0
  const orderQtyScore =
    typeof filters.orderQuantity === "number"
      ? supplier.moq <= filters.orderQuantity
        ? 10
        : Math.max(-12, -((supplier.moq - filters.orderQuantity) / Math.max(filters.orderQuantity, 1)) * 12)
      : 0
  const bdIntent = /\b(bangladesh|bd|dhaka|chattogram|chittagong|local|nearby)\b/i.test(query)
  const bdScore = bdIntent && supplier.country === "Bangladesh" ? 22 : 0
  const juteScore = /\bjute\b/i.test(query) && haystack.includes("jute") ? 34 : 0
  const bagScore = /\b(bag|bags|tote|totes)\b/i.test(query) && /\b(bag|bags|tote|totes)\b/.test(haystack) ? 18 : 0
  const productScore = productMatches(supplier, filters.product) ? 80 : 0
  const genericNamePenalty = /^(dhaka|hanoi|mumbai|jakarta|istanbul|karachi|lahore|noida|bengaluru|chattogram|chittagong|sylhet|jaipur|guangzhou|shenzhen|ho chi minh|ho chi minh city)\b/i.test(
    supplier.name,
  )
    ? 18
    : 0

  return (
    tokenScore +
    vectorScore +
    categoryScore +
    productScore +
    qualityScore +
    riskScore +
    leadScore +
    moqScore +
    orderQtyScore +
    bdScore +
    juteScore +
    bagScore -
    genericNamePenalty
  )
}

function rankSuppliersForQuery(
  suppliers: Supplier[],
  query: string,
  category: SupplierCategory | null,
  topK: number,
  filters: BuyerFilters,
): Supplier[] {
  const unique = uniqueSuppliers(suppliers)
  const filteredUnique = applyBuyerFilters(unique, filters)
  const relaxedPriceFilters: BuyerFilters = {
    ...filters,
    targetUnitPriceMin: null,
    targetUnitPriceMax: null,
  }
  const relaxedMinimumFilters = relaxBuyerFilters(filters)
  const relaxedFilteredUnique = applyBuyerFilters(unique, relaxedPriceFilters)
  const minimumUnique = applyBuyerFilters(unique, relaxedMinimumFilters)
  const categoryPool = filterByCategoryWithFallback(filteredUnique, category)
  const relaxedCategoryPool = filterByCategoryWithFallback(relaxedFilteredUnique, category)
  const minimumCategoryPool = filterByCategoryWithFallback(minimumUnique, category)
  const productMatched = categoryPool.filter((supplier) => productMatches(supplier, filters.product))
  const relaxedProductMatched = relaxedCategoryPool.filter((supplier) => productMatches(supplier, filters.product))
  const minimumProductMatched = minimumCategoryPool.filter((supplier) => productMatches(supplier, filters.product))
  const directlyMatched = categoryPool.filter((supplier) => hasDirectQueryMatch(supplier, query, category))
  const primaryPool =
    productMatched.length >= Math.min(topK, 5)
      ? productMatched
      : relaxedProductMatched.length > 0
        ? relaxedProductMatched
        : directlyMatched.length > 0
          ? directlyMatched
          : categoryPool
  const fallbackPool =
    relaxedProductMatched.length > 0
      ? relaxedCategoryPool
      : productMatched.length > 0
        ? categoryPool
        : relaxedFilteredUnique
  const minimumFallbackPool =
    minimumProductMatched.length > 0
      ? minimumProductMatched
      : minimumCategoryPool.length > 0
        ? minimumCategoryPool
        : unique

  const rankedPrimary = primaryPool
    .map((supplier) => ({ supplier, score: relevanceScore(supplier, query, category, filters) }))
    .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
    .slice(0, topK)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))

  if (rankedPrimary.length >= topK) return rankedPrimary

  const used = new Set(rankedPrimary.map((s) => s.id))
  const fillerPool = rankedPrimary.length < Math.min(MINIMUM_SOURCE_RESULTS, topK) ? [...fallbackPool, ...minimumFallbackPool] : fallbackPool
  const filler = uniqueSuppliers(fillerPool)
    .filter((supplier) => !used.has(supplier.id))
    .map((supplier) => ({ supplier, score: relevanceScore(supplier, query, category, filters) }))
    .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
    .slice(0, Math.max(0, topK - rankedPrimary.length))
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))

  return [...rankedPrimary, ...filler].slice(0, topK)
}

async function retrieveByVector(
  query: string,
  topK: number,
  category: SupplierCategory | null,
  filters: BuyerFilters,
): Promise<Supplier[] | null> {
  const embedding = await embedQuery(query)
  if (!embedding) return null

  const supabase = getAdminClient()
  const { data, error } = await supabase.rpc("match_suppliers", {
    query_embedding: embedding,
    match_count: Math.max(topK * 8, 80),
    filter_category: null,
    filter_country: null,
    filter_region: null,
    max_risk_score: null,
    require_bgmea: null,
  })

  if (error) {
    return null
  }

  const rows = (data ?? []) as SupplierRow[]
  const suppliers = rows.map(normalizeSupplier)
  return applyBuyerFilters(filterByCategoryWithFallback(suppliers, category), filters)
}

async function retrieveByFullText(
  query: string,
  topK: number,
  category: SupplierCategory | null,
  filters: BuyerFilters,
): Promise<Supplier[]> {
  const supabase = getAdminClient()
  const qb = supabase.from("suppliers").select("*").order("rating", { ascending: false }).limit(1500)

  const { data, error } = await qb
  if (error) throw new Error(`Supplier retrieval failed: ${error.message}`)

  const tokens = tokenize(query)
  const suppliers = ((data ?? []) as SupplierRow[]).map(normalizeSupplier)
  const eligibleSuppliers = applyBuyerFilters(suppliers, filters)
  const filtered = eligibleSuppliers
    .map((supplier) => ({
      supplier,
      score: tokens.filter((token) => supplierSearchHaystack(supplier).includes(token)).length,
    }))
    .filter(({ supplier, score }) => score > 0 || (category !== null && supplier.category === category))
    .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / Math.max(tokens.length, 1) }))

  return filterByCategoryWithFallback(filtered.length ? filtered : eligibleSuppliers, category).slice(0, Math.max(topK * 4, 40))
}

export async function retrieveCandidates(
  query: string,
  topK = 20,
  categoryOverride?: SupplierCategory | null,
  filters: BuyerFilters = {},
): Promise<RetrievalResult> {
  const category = categoryOverride ?? detectCategory(query)

  if (!hasServiceSupabaseEnv()) {
    const pool = getDemoSuppliers(query, Math.max(topK * 8, 80), category)
    const strictCount = applyBuyerFilters(pool, filters).length
    return {
      suppliers: rankSuppliersForQuery(pool, query, category, topK, filters),
      mode: "deterministic",
      relaxed: strictCount < Math.min(MINIMUM_SOURCE_RESULTS, topK),
    }
  }

  let vectorSuppliers: Supplier[] = []
  let vectorMode = false

  try {
    const vector = await retrieveByVector(query, topK, category, filters)
    if (vector && vector.length > 0) {
      vectorSuppliers = vector
      vectorMode = true
    }
  } catch {
  }

  let fullTextSuppliers: Supplier[] = []
  try {
    const fullText = await retrieveByFullText(query, topK, category, filters)
    if (fullText.length > 0) {
      fullTextSuppliers = fullText
    }
  } catch {
  }

  const demoSuppliers = getDemoSuppliers(query, Math.max(topK * 6, 60), category)
  const ranked = rankSuppliersForQuery([...vectorSuppliers, ...fullTextSuppliers, ...demoSuppliers], query, category, topK, filters)
  if (ranked.length > 0) {
    const strictCount = applyBuyerFilters([...vectorSuppliers, ...fullTextSuppliers, ...demoSuppliers], filters).length
    return {
      suppliers: ranked,
      mode: vectorMode ? "vector" : "full_text",
      relaxed: strictCount < Math.min(MINIMUM_SOURCE_RESULTS, topK),
    }
  }

  const fallbackPool = getDemoSuppliers(query, Math.max(topK * 8, 80), category)
  return {
    suppliers: rankSuppliersForQuery(fallbackPool, query, category, topK, filters),
    mode: "deterministic",
    relaxed: applyBuyerFilters(fallbackPool, filters).length < Math.min(MINIMUM_SOURCE_RESULTS, topK),
  }
}

export function rescoreForBangladeshMode(suppliers: Supplier[], bangladeshMode: boolean, topK = 10): Supplier[] {
  if (!bangladeshMode) return suppliers.slice(0, topK)

  const scored = suppliers.map((supplier) => {
    const base = typeof supplier.retrieval_score === "number" ? supplier.retrieval_score * 100 : supplier.quality_rating * 20
    const score =
      base * 0.62 +
      (BD_PRIORITY_COUNTRIES.has(supplier.country) ? 24 : 0) -
      supplier.risk_score * 0.2 +
      supplier.quality_rating * 3 +
      supplier.on_time_rate * 0.08 -
      Math.min(14, supplier.lead_time_days * 0.16) +
      (supplier.moq <= 500 ? 8 : supplier.moq <= 1000 ? 4 : 0) +
      (supplier.bgmea_certified ? 7 : 0) +
      (supplier.country === "Bangladesh" ? 4 : 0)

    return { supplier, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))
}
