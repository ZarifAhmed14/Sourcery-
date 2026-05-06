import { z } from "zod"

export const SupplierCategorySchema = z.enum([
  "apparel",
  "beauty",
  "home",
  "food",
  "accessories",
  "packaging",
  "electronics",
  "textiles",
  "footwear",
  "industrial",
])
export const SupplierRegionSchema = z.enum([
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Europe",
  "MENA",
  "Africa",
  "North America",
  "South America",
])

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  country: z.string().min(2),
  city: z.string().min(2),
  region: SupplierRegionSchema,
  category: SupplierCategorySchema,
  subcategory: z.string().min(2).default("general"),
  description: z.string().min(10),
  unit_price_usd: z.coerce.number().nonnegative(),
  moq: z.coerce.number().int().positive(),
  lead_time_days: z.coerce.number().int().positive(),
  on_time_rate: z.coerce.number().min(0).max(100).default(90),
  quality_rating: z.coerce.number().min(0).max(5).default(4),
  risk_score: z.coerce.number().int().min(0).max(100),
  risk_level: z.enum(["low", "medium", "high"]).optional(),
  risk_notes: z.string().nullable().optional(),
  certifications: z.array(z.string()).default([]),
  bgmea_certified: z.boolean().default(false),
  source_type: z.enum(["synthetic", "public_web", "partner", "upload"]).optional(),
  source_url: z.string().url().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  retrieval_score: z.number().nullable().optional(),
})

export const SourceRequestSchema = z.object({
  query: z.string().trim().min(5).max(800),
  bangladeshMode: z.boolean().default(false),
  topK: z.number().int().min(3).max(10).default(10),
  category: SupplierCategorySchema.nullable().optional(),
})

export const SupplierListRequestSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: SupplierCategorySchema.optional(),
  country: z.string().trim().max(80).optional(),
  region: SupplierRegionSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const BargainRequestSchema = z.object({
  supplier: SupplierSchema.pick({
    name: true,
    country: true,
    unit_price_usd: true,
    moq: true,
    lead_time_days: true,
  }),
  productDescription: z.string().trim().max(400).default("consumer products"),
  orderQuantity: z.coerce.number().int().min(1).max(100000).default(300),
})

export const ProfitInputsSchema = z.object({
  selling_price: z.coerce.number().positive(),
  shipping_cost_per_unit: z.coerce.number().min(0).default(1.5),
  customs_rate: z.coerce.number().min(0).max(100).default(5),
  packaging_cost_per_unit: z.coerce.number().min(0).default(0.8),
  order_quantity: z.coerce.number().int().min(1).default(300),
})

export const SimulationInputSchema = z.object({
  shipping_cost_delta_pct: z.coerce.number().min(-50).max(200).default(0),
  lead_time_delta_days: z.coerce.number().min(-30).max(90).default(0),
  order_quantity: z.coerce.number().int().min(1).default(300),
  selling_price: z.coerce.number().min(0.01),
  supplier_price_delta_pct: z.coerce.number().min(-30).max(100).default(0),
})

export const SimulationRequestSchema = z.object({
  suppliers: z.array(SupplierSchema).min(1).max(10),
  baseInputs: ProfitInputsSchema,
  deltas: SimulationInputSchema,
})

export const ExplainabilitySchema = z.object({
  explanation: z.string().min(20).max(220),
  key_factors: z.array(z.string().min(3).max(120)).min(2).max(5),
  confidence: z.enum(["high", "medium", "low"]),
  confidence_reason: z.string().min(5).max(160),
})

export const DiscoveryItemSchema = z
  .object({
    supplier_id: z.string().uuid(),
    rank: z.number().int().min(1).max(10),
    fit_score: z.number().min(0).max(100),
  })
  .merge(ExplainabilitySchema)

export const RiskItemSchema = z
  .object({
    supplier_id: z.string().uuid(),
    risk_flags: z.array(z.string().min(3).max(120)).max(5),
    bd_mode_adjusted: z.boolean(),
  })
  .merge(ExplainabilitySchema)

export const ComparisonItemSchema = z
  .object({
    supplier_id: z.string().uuid(),
    scorecard: z.object({
      price: z.number(),
      lead_time_days: z.number().int(),
      moq: z.number().int(),
      on_time_rate: z.number(),
      quality_rating: z.number(),
    }),
  })
  .merge(ExplainabilitySchema)

export const CombinedAgentOutputSchema = z.object({
  discovery: z.array(DiscoveryItemSchema).min(1).max(10),
  risk: z.array(RiskItemSchema).min(1).max(10),
  comparison: z.array(ComparisonItemSchema).min(1).max(10),
})

export type DiscoveryItem = z.infer<typeof DiscoveryItemSchema>
export type RiskItem = z.infer<typeof RiskItemSchema>
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>
export type CombinedAgentOutput = z.infer<typeof CombinedAgentOutputSchema>
