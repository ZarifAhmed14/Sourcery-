export type SupplierRegion =
  | "South Asia"
  | "Southeast Asia"
  | "East Asia"
  | "Europe"
  | "MENA"
  | "Africa"
  | "North America"
  | "South America"

export type SupplierCategory =
  | "apparel"
  | "beauty"
  | "home"
  | "food"
  | "accessories"
  | "packaging"
  | "electronics"
  | "textiles"
  | "footwear"
  | "industrial"

export type Supplier = {
  id: string
  name: string
  country: string
  city: string
  region: SupplierRegion
  category: SupplierCategory
  subcategory: string
  description: string
  unit_price_usd: number
  moq: number
  lead_time_days: number
  on_time_rate: number
  quality_rating: number
  risk_score: number
  risk_level?: "low" | "medium" | "high"
  risk_notes?: string | null
  certifications: string[]
  bgmea_certified: boolean
  source_type?: "synthetic" | "public_web" | "partner" | "upload"
  source_url?: string | null
  verified_at?: string | null
  retrieval_score?: number | null
}

export type SourcingPreferences = {
  bangladeshMode: boolean
}

export type Explainability = {
  explanation: string
  key_factors: string[]
  confidence: "high" | "medium" | "low"
  confidence_reason: string
}

export type ApiMeta = {
  request_id: string
  cached: boolean
  retrieval_mode: "vector" | "full_text" | "deterministic"
  llm_mode: "ai" | "deterministic_fallback"
  ai_provider: "ai_sdk" | "gemini" | "pollinations" | "none"
  elapsed_ms: number
}
