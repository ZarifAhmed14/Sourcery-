// Knowledge layer retrieval — Supabase Postgres full-text + filter pipeline.
// We deliberately avoid pgvector embeddings to stay under the $20 cost cap; full-text
// search is sufficient for our 80-row demo dataset and the LLM does the semantic reasoning.

import { createClient } from "@/lib/supabase/server"
import type { Supplier } from "@/lib/types"

// Supabase row shape (snake_case identical to columns) — mapped 1:1 to Supplier.
type SupplierRow = Supplier

// Keyword-based category detector — picks the most likely category for a free-form query.
// Cheap and deterministic; no AI cost. Returns null when nothing strongly matches.
export function detectCategory(query: string): Supplier["category"] | null {
  // Lowercase the query once for case-insensitive matching.
  const q = query.toLowerCase()
  // Apparel keywords — clothing, fabric, sewn goods.
  if (/\b(shirt|tee|t-shirt|hoodie|sweat|jeans|denim|jacket|knit|woven|fabric|garment|apparel|legging|activewear|silk|cashmere)\b/.test(q)) return "apparel"
  // Beauty keywords — cosmetics, skincare, haircare.
  if (/\b(skincare|skin care|serum|cosmetic|lipstick|beauty|haircare|shampoo|cream|lotion|argan|cleanser|fragrance|perfume)\b/.test(q)) return "beauty"
  // Home keywords — household goods, textiles, kitchen.
  if (/\b(bedding|towel|sheet|rug|carpet|kitchen|ceramic|porcelain|home|decor|cookware|pillow|linen|bath)\b/.test(q)) return "home"
  // Food keywords — pantry, beverages, snacks.
  if (/\b(food|spice|coffee|tea|olive oil|pantry|snack|chocolate|wine|sauce|honey|nut|grain)\b/.test(q)) return "food"
  // Accessories keywords — bags, footwear, electronics, jewelry.
  if (/\b(bag|backpack|wallet|leather|shoe|footwear|sneaker|jewel|watch|eyewear|electronic|charger|earbud|case)\b/.test(q)) return "accessories"
  // No category match — let SQL fall back to global text search.
  return null
}

// Retrieve up to `topK` candidate suppliers using Postgres full-text search + optional category filter.
// This is the Knowledge Layer entry point — replaces a vector-DB retrieval step.
export async function retrieveCandidates(query: string, topK = 20): Promise<Supplier[]> {
  // Server-side Supabase client (uses cookie-bound session for RLS).
  const supabase = await createClient()
  // Detect a category from the query so we can shrink the candidate pool intelligently.
  const category = detectCategory(query)

  // Build the base query — we always want all supplier columns.
  let qb = supabase.from("suppliers").select("*")

  // If we recognized a category, filter to it (drops obviously irrelevant rows from the LLM context).
  if (category) qb = qb.eq("category", category)

  // Postgres FTS via `textSearch` — matches the GIN index on description.
  // We split the user query into significant tokens (length >= 3) to form a websearch-style phrase.
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .slice(0, 6)
  if (tokens.length > 0) {
    qb = qb.textSearch("description", tokens.join(" | "), { type: "websearch", config: "english" })
  }

  // Cap the result set; we'll re-score this in the caller.
  qb = qb.limit(topK)

  // Execute. If FTS returns nothing (rare query terms), fall back to category-only or top-by-quality.
  const { data, error } = await qb
  if (error) throw new Error(`retrieveCandidates failed: ${error.message}`)
  if (data && data.length > 0) return data as SupplierRow[]

  // Fallback: drop the FTS clause and return top-quality suppliers in the category (or globally).
  let fallback = supabase.from("suppliers").select("*").order("quality_rating", { ascending: false }).limit(topK)
  if (category) fallback = fallback.eq("category", category)
  const { data: fbData, error: fbErr } = await fallback
  if (fbErr) throw new Error(`retrieveCandidates fallback failed: ${fbErr.message}`)
  return (fbData ?? []) as SupplierRow[]
}

// Server-side re-score for Bangladesh Mode — applied AFTER retrieval, BEFORE prompt injection.
// This is intentionally simple math (not in the LLM prompt) so the boost is auditable and deterministic.
export function rescoreForBangladeshMode(suppliers: Supplier[], bangladeshMode: boolean, topK = 10): Supplier[] {
  // When BD mode is off, just return the first topK rows in the order they came back from FTS.
  if (!bangladeshMode) return suppliers.slice(0, topK)

  // South Asian countries that get the regional bonus.
  const SOUTH_ASIA = new Set(["Bangladesh", "India", "Pakistan", "Vietnam"])

  // Score each supplier with the BD-mode adjustments documented in the architecture.
  const scored = suppliers.map((s) => {
    // Start with a quality-rating-based baseline (0..100).
    let score = s.quality_rating * 20
    // +15 for South Asian origin — explicit regional preference.
    if (SOUTH_ASIA.has(s.country)) score += 15
    // -10 if lead time exceeds 45 days (BD-mode buyers want quick turn).
    if (s.lead_time_days > 45) score -= 10
    // +5 for low MOQ (BD mode favors small-batch / DTC-friendly factories).
    if (s.moq <= 500) score += 5
    // +5 bonus for BGMEA-certified suppliers (Bangladesh trust signal).
    if (s.bgmea_certified) score += 5
    return { s, score }
  })

  // Sort descending by adjusted score, take top K, return supplier rows only.
  return scored.sort((a, b) => b.score - a.score).slice(0, topK).map((x) => x.s)
}
