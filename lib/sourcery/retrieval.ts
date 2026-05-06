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
  food: /\b(food|spice|coffee|tea|olive oil|pantry|snack|chocolate|wine|sauce|honey|nut|grain|beverage)\b/,
  accessories: /\b(bag|backpack|wallet|leather|shoe|footwear|sneaker|jewel|watch|eyewear|electronic|charger|earbud|case|accessory)\b/,
  packaging: /\b(packaging|package|carton|box|label|paper bag|bottle|tube|jar|container)\b/,
  electronics: /\b(electronic|electronics|sensor|module|pcb|bluetooth|smart device|component)\b/,
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

async function retrieveByVector(query: string, topK: number, category: SupplierCategory | null): Promise<Supplier[] | null> {
  const embedding = await embedQuery(query)
  if (!embedding) return null

  const supabase = getAdminClient()
  const { data, error } = await supabase.rpc("match_suppliers", {
    query_embedding: embedding,
    match_count: Math.max(topK, 20),
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
  return category ? suppliers.filter((supplier) => supplier.category === category) : suppliers
}

async function retrieveByFullText(query: string, topK: number, category: SupplierCategory | null): Promise<Supplier[]> {
  const supabase = getAdminClient()
  let qb = supabase.from("suppliers").select("*").order("rating", { ascending: false }).limit(100)

  if (category) qb = qb.ilike("category", `%${category}%`)

  const { data, error } = await qb
  if (error) throw new Error(`Supplier retrieval failed: ${error.message}`)

  const tokens = tokenize(query)
  const suppliers = ((data ?? []) as SupplierRow[]).map(normalizeSupplier)
  const filtered = tokens.length
    ? suppliers
        .map((supplier) => ({
          supplier,
          score: tokens.filter((token) => supplierSearchHaystack(supplier).includes(token)).length,
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
        .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / Math.max(tokens.length, 1) }))
    : suppliers

  return (filtered.length ? filtered : suppliers).slice(0, Math.max(topK, 20))
}

export async function retrieveCandidates(query: string, topK = 20, categoryOverride?: SupplierCategory | null): Promise<RetrievalResult> {
  const category = categoryOverride ?? detectCategory(query)

  if (!hasServiceSupabaseEnv()) {
    return { suppliers: getDemoSuppliers(query, topK, category), mode: "deterministic" }
  }

  try {
    const vector = await retrieveByVector(query, topK, category)
    if (vector && vector.length > 0) {
      return { suppliers: vector.slice(0, topK), mode: "vector" }
    }
  } catch (err) {
    console.log("[sourcery] vector retrieval skipped:", (err as Error).message)
  }

  try {
    const fullText = await retrieveByFullText(query, topK, category)
    if (fullText.length > 0) {
      return { suppliers: fullText.slice(0, topK), mode: "full_text" }
    }
  } catch (err) {
    console.log("[sourcery] full-text retrieval fallback:", (err as Error).message)
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
