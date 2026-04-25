// Core domain types for Sourcery — single source of truth used across server + client.

// A supplier record as stored in Postgres (table: public.suppliers).
// All numeric fields are normalized: prices in USD, percentages 0–100, ratings 0–5.
export type Supplier = {
  // Stable UUID primary key from Postgres.
  id: string
  // Public-facing supplier name (e.g. "Padma Knit Composite").
  name: string
  // ISO country name (e.g. "Bangladesh"). Used for filtering + risk scoring.
  country: string
  // City for display only.
  city: string
  // Coarse region used for Bangladesh Mode regional scoring bonus.
  region: "South Asia" | "Southeast Asia" | "East Asia" | "Europe" | "MENA"
  // Top-level product category (used for retrieval filter).
  category: "apparel" | "beauty" | "home" | "food" | "accessories"
  // Free-form subcategory (e.g. "knitwear", "skincare").
  subcategory: string
  // Marketing/capability description used for full-text retrieval.
  description: string
  // Indicative unit price in USD (per piece).
  unit_price_usd: number
  // Minimum order quantity in units.
  moq: number
  // Typical lead time in days from PO to ship.
  lead_time_days: number
  // Historical on-time delivery rate (0–100).
  on_time_rate: number
  // Quality rating from past buyers (0–5).
  quality_rating: number
  // Composite supplier risk score (0 = safest, 100 = riskiest).
  risk_score: number
  // List of certifications as plain strings (e.g. ["GOTS","BSCI"]).
  certifications: string[]
  // BGMEA membership flag — surfaces as a trust badge under Bangladesh Mode.
  bgmea_certified: boolean
}

// User-facing preference flags that travel from client → server on every sourcing call.
export type SourcingPreferences = {
  // When true: server-side re-score boosts South Asian suppliers + injects Bangla bargain copy.
  bangladeshMode: boolean
}

// The shape every agent (Discovery / Risk / Comparison) MUST include in its output —
// this is the explainability contract enforced by the guardrail.
export type Explainability = {
  // 20–200 char prose explanation referencing concrete numeric/factual fields.
  explanation: string
  // 2–5 short bullet strings — at least one MUST contain a digit (numeric reference).
  key_factors: string[]
  // Confidence bucket — drives the green/amber/red dot in the UI.
  confidence: "high" | "medium" | "low"
  // One-sentence reason for the confidence bucket.
  confidence_reason: string
}
