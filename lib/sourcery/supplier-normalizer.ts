import type { Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"

type SupplierDbRow = Record<string, unknown> & {
  similarity?: number | null
  retrieval_score?: number | null
}

const CATEGORY_ALIASES: Record<string, SupplierCategory> = {
  apparel: "apparel",
  "apparel ": "apparel",
  clothing: "apparel",
  garment: "apparel",
  garments: "apparel",
  beauty: "beauty",
  cosmetics: "beauty",
  cosmetic: "beauty",
  skincare: "beauty",
  home: "home",
  "bags & accessories": "accessories",
  "bag & accessories": "accessories",
  bags: "accessories",
  bag: "accessories",
  "home goods": "home",
  "home textiles": "home",
  food: "food",
  foods: "food",
  "food & beverage": "food",
  beverage: "food",
  beverages: "food",
  tea: "food",
  spices: "food",
  packaging: "packaging",
  electronics: "electronics",
  electronic: "electronics",
  textiles: "textiles",
  textile: "textiles",
  footwear: "footwear",
  shoes: "footwear",
  industrial: "industrial",
  accessories: "accessories",
}

const REGION_VALUES = new Set<SupplierRegion>([
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Europe",
  "MENA",
  "Africa",
  "North America",
  "South America",
])

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asBoolean(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return ["true", "1", "yes", "y"].includes(normalized)
  }
  if (typeof value === "number") return value === 1
  return false
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function normalizeCategory(value: unknown): SupplierCategory {
  const key = asString(value, "accessories").trim().toLowerCase()
  return CATEGORY_ALIASES[key] ?? "accessories"
}

function normalizeRegion(value: unknown): SupplierRegion {
  const region = asString(value, "South Asia") as SupplierRegion
  return REGION_VALUES.has(region) ? region : "South Asia"
}

function deriveSubcategory(row: SupplierDbRow, products: string[]): string {
  const explicit = asString(row.subcategory)
  if (explicit) return explicit
  return products[0] ?? normalizeCategory(row.category)
}

function normalizeSupplierName(value: unknown): string {
  const raw = asString(value, "Unnamed supplier")
    .replace(/\s+/g, " ")
    .trim()

  return raw
    .replace(/\bCo\.?\s+Co\.?\b/gi, "Co.")
    .replace(/\bLtd\.?\s+Ltd\.?\b/gi, "Ltd.")
    .replace(/\bGroup\s+Group\b/gi, "Group")
    .replace(/\bIndustries\s+Industries\b/gi, "Industries")
    .replace(/\s+,/g, ",")
}

function normalizeMoq(value: unknown, category: SupplierCategory): number {
  const explicit = asNumber(value, NaN)
  const defaults: Record<SupplierCategory, number> = {
    accessories: 600,
    apparel: 1200,
    beauty: 1000,
    electronics: 500,
    food: 800,
    footwear: 900,
    home: 500,
    industrial: 300,
    packaging: 3000,
    textiles: 1200,
  }
  const maxByCategory: Record<SupplierCategory, number> = {
    accessories: 2500,
    apparel: 3500,
    beauty: 3000,
    electronics: 2000,
    food: 2500,
    footwear: 2500,
    home: 1800,
    industrial: 1500,
    packaging: 5000,
    textiles: 4000,
  }
  const stepByCategory: Record<SupplierCategory, number> = {
    accessories: 50,
    apparel: 100,
    beauty: 100,
    electronics: 50,
    food: 100,
    footwear: 100,
    home: 50,
    industrial: 50,
    packaging: 250,
    textiles: 100,
  }

  const fallback = defaults[category]
  if (!Number.isFinite(explicit) || explicit <= 0) return fallback

  const capped = Math.max(fallback, Math.min(explicit, maxByCategory[category]))
  const step = stepByCategory[category]
  return Math.round(capped / step) * step
}

function deriveOnTimeRate(row: SupplierDbRow, riskScore: number): number {
  const explicit = asNumber(row.on_time_rate, NaN)
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit))
  return Math.max(70, Math.min(98, Math.round(98 - riskScore * 0.25)))
}

function deriveQualityRating(row: SupplierDbRow): number {
  const explicit = asNumber(row.quality_rating, NaN)
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(5, explicit))
  return Math.max(0, Math.min(5, asNumber(row.rating, 4)))
}

export function normalizeSupplier(row: SupplierDbRow): Supplier {
  const products = asStringArray(row.products)
  const category = normalizeCategory(row.category)
  const riskScore = asNumber(row.risk_score, 50)
  const qualityRating = deriveQualityRating(row)
  const rating = asNumber(row.rating, qualityRating)
  const retrievalScore = asNumber(row.retrieval_score ?? row.similarity, NaN)

  return {
    id: asString(row.id) || asString(row.supplier_id),
    name: normalizeSupplierName(row.name),
    country: asString(row.country, "Unknown"),
    city: asString(row.city, "Unknown"),
    region: normalizeRegion(row.region),
    category,
    subcategory: deriveSubcategory(row, products),
    products,
    description: asString(row.description, "Supplier profile"),
    unit_price_usd: asNumber(row.unit_price_usd, 0),
    moq: normalizeMoq(row.moq, category),
    lead_time_days: asNumber(row.lead_time_days, 1),
    rating,
    on_time_rate: deriveOnTimeRate(row, riskScore),
    quality_rating: qualityRating,
    risk_score: riskScore,
    risk_level: asString(row.risk_level, "medium") as Supplier["risk_level"],
    risk_notes: asString(row.risk_notes) || null,
    certifications: asStringArray(row.certifications),
    bgmea_certified: asBoolean(row.bgmea_certified),
    source_type: (asString(row.source_type) || "synthetic") as Supplier["source_type"],
    source_url: asString(row.source_url) || null,
    verified_at: asString(row.verified_at) || null,
    retrieval_score: Number.isFinite(retrievalScore) ? retrievalScore : null,
  }
}

export function supplierSearchHaystack(supplier: Supplier): string {
  return [
    supplier.name,
    supplier.country,
    supplier.city,
    supplier.region,
    supplier.category,
    supplier.subcategory,
    supplier.products?.join(" ") ?? "",
    supplier.description,
    supplier.certifications.join(" "),
    supplier.risk_notes ?? "",
  ]
    .join(" ")
    .toLowerCase()
}
