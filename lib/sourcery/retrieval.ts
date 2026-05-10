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
}

type SupplierRow = Record<string, unknown> & {
  similarity?: number | null
  retrieval_score?: number | null
}

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
  for (const supplier of suppliers) {
    if (!byId.has(supplier.id)) byId.set(supplier.id, supplier)
  }
  return [...byId.values()]
}

function filterByCategoryWithFallback(suppliers: Supplier[], category: SupplierCategory | null): Supplier[] {
  if (!category) return suppliers
  const filtered = suppliers.filter((supplier) => supplier.category === category)
  return filtered.length > 0 ? filtered : suppliers
}

function hasDirectQueryMatch(supplier: Supplier, query: string, category: SupplierCategory | null): boolean {
  const tokens = tokenize(query)
  const haystack = supplierSearchHaystack(supplier)
  return (category !== null && supplier.category === category) || tokens.some((token) => haystack.includes(token))
}

function relevanceScore(supplier: Supplier, query: string, category: SupplierCategory | null): number {
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
  const bdIntent = /\b(bangladesh|bd|dhaka|chattogram|chittagong|local|nearby)\b/i.test(query)
  const bdScore = bdIntent && supplier.country === "Bangladesh" ? 22 : 0
  const juteScore = /\bjute\b/i.test(query) && haystack.includes("jute") ? 34 : 0
  const bagScore = /\b(bag|bags|tote|totes)\b/i.test(query) && /\b(bag|bags|tote|totes)\b/.test(haystack) ? 18 : 0

  return tokenScore + vectorScore + categoryScore + qualityScore + riskScore + leadScore + moqScore + bdScore + juteScore + bagScore
}

function rankSuppliersForQuery(suppliers: Supplier[], query: string, category: SupplierCategory | null, topK: number): Supplier[] {
  const unique = uniqueSuppliers(suppliers)
  const directlyMatched = unique.filter((supplier) => hasDirectQueryMatch(supplier, query, category))
  const pool = directlyMatched.length > 0 ? directlyMatched : filterByCategoryWithFallback(unique, category)

  return pool
    .map((supplier) => ({ supplier, score: relevanceScore(supplier, query, category) }))
    .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
    .slice(0, topK)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))
}

async function retrieveByVector(query: string, topK: number, category: SupplierCategory | null): Promise<Supplier[] | null> {
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
    console.log("[sourcery] vector retrieval fallback:", error.message)
    return null
  }

  const rows = (data ?? []) as SupplierRow[]
  const suppliers = rows.map(normalizeSupplier)
  return filterByCategoryWithFallback(suppliers, category)
}

async function retrieveByFullText(query: string, topK: number, category: SupplierCategory | null): Promise<Supplier[]> {
  const supabase = getAdminClient()
  const qb = supabase.from("suppliers").select("*").order("rating", { ascending: false }).limit(500)

  const { data, error } = await qb
  if (error) throw new Error(`Supplier retrieval failed: ${error.message}`)

  const tokens = tokenize(query)
  const suppliers = ((data ?? []) as SupplierRow[]).map(normalizeSupplier)
  const filtered = suppliers
    .map((supplier) => ({
      supplier,
      score: tokens.filter((token) => supplierSearchHaystack(supplier).includes(token)).length,
    }))
    .filter(({ supplier, score }) => score > 0 || (category !== null && supplier.category === category))
    .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / Math.max(tokens.length, 1) }))

  return filterByCategoryWithFallback(filtered.length ? filtered : suppliers, category).slice(0, Math.max(topK * 4, 40))
}

export async function retrieveCandidates(query: string, topK = 20, categoryOverride?: SupplierCategory | null): Promise<RetrievalResult> {
  const category = categoryOverride ?? detectCategory(query)

  if (!hasServiceSupabaseEnv()) {
    return { suppliers: getDemoSuppliers(query, topK, category), mode: "deterministic" }
  }

  let vectorSuppliers: Supplier[] = []
  let vectorMode = false

  try {
    const vector = await retrieveByVector(query, topK, category)
    if (vector && vector.length > 0) {
      vectorSuppliers = vector
      vectorMode = true
    }
  } catch (err) {
    console.log("[sourcery] vector retrieval skipped:", (err as Error).message)
  }

  let fullTextSuppliers: Supplier[] = []
  try {
    const fullText = await retrieveByFullText(query, topK, category)
    if (fullText.length > 0) {
      fullTextSuppliers = fullText
    }
  } catch (err) {
    console.log("[sourcery] full-text retrieval fallback:", (err as Error).message)
  }

  const ranked = rankSuppliersForQuery([...vectorSuppliers, ...fullTextSuppliers], query, category, topK)
  if (ranked.length > 0) {
    return { suppliers: ranked, mode: vectorMode ? "vector" : "full_text" }
  }

  return { suppliers: getDemoSuppliers(query, topK, category), mode: "deterministic" }
}

export function rescoreForBangladeshMode(suppliers: Supplier[], bangladeshMode: boolean, topK = 10): Supplier[] {
  if (!bangladeshMode) return suppliers.slice(0, topK)

  const southAsia = new Set(["Bangladesh", "India", "Pakistan", "Vietnam"])
  const scored = suppliers.map((supplier) => {
    const base = typeof supplier.retrieval_score === "number" ? supplier.retrieval_score * 100 : supplier.quality_rating * 20
    const score =
      base +
      (southAsia.has(supplier.country) ? 15 : 0) -
      (supplier.lead_time_days > 45 ? 10 : 0) +
      (supplier.moq <= 500 ? 5 : 0) +
      (supplier.bgmea_certified ? 5 : 0)

    return { supplier, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))
}
