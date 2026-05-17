import type { Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"

type SupplierDbRow = Record<string, unknown> & {
  similarity?: number | null
  retrieval_score?: number | null
}

const CATEGORY_ALIASES: Record<string, SupplierCategory> = {
  apparel: "apparel",
  clothing: "apparel",
  garment: "apparel",
  garments: "apparel",
  beauty: "beauty",
  cosmetics: "beauty",
  cosmetic: "beauty",
  skincare: "beauty",
  home: "home",
  "home goods": "home",
  "home textiles": "home",
  food: "food",
  foods: "food",
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
  return value === true
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
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
  const riskScore = asNumber(row.risk_score, 50)
  const qualityRating = deriveQualityRating(row)
  const rating = asNumber(row.rating, qualityRating)
  const retrievalScore = asNumber(row.retrieval_score ?? row.similarity, NaN)

  return {
    id: asString(row.id),
    name: asString(row.name, "Unnamed supplier"),
    country: asString(row.country, "Unknown"),
    city: asString(row.city, "Unknown"),
    region: normalizeRegion(row.region),
    category: normalizeCategory(row.category),
    subcategory: deriveSubcategory(row, products),
    products,
    description: asString(row.description, "Supplier profile"),
    unit_price_usd: asNumber(row.unit_price_usd, 0),
    moq: asNumber(row.moq, 1),
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
    supplier.description,
    supplier.certifications.join(" "),
    supplier.risk_notes ?? "",
  ]
    .join(" ")
    .toLowerCase()
}
