// Zod schemas — validate every input/output that crosses an AI boundary.
// Using `nullable()` (not `optional()`) per AI SDK 6 OpenAI strict-mode rule.

import { z } from "zod"

// Reusable explainability sub-schema. Embedded in Discovery/Risk/Comparison outputs.
export const ExplainabilitySchema = z.object({
  // 20–200 char rationale string.
  explanation: z.string().min(20).max(220),
  // 2–5 short factor strings; further validated post-parse for numeric content.
  key_factors: z.array(z.string().min(3).max(120)).min(2).max(5),
  // Tri-state confidence indicator.
  confidence: z.enum(["high", "medium", "low"]),
  // One-sentence reason for the confidence bucket.
  confidence_reason: z.string().min(5).max(160),
})

// Output schema for the Discovery agent — one record per shortlisted supplier.
export const DiscoveryItemSchema = z
  .object({
    // UUID matching a row in public.suppliers.
    supplier_id: z.string(),
    // 1-indexed rank position (1 = best fit).
    rank: z.number().int().min(1).max(10),
    // Composite fit score from the agent (0–100).
    fit_score: z.number().min(0).max(100),
  })
  .merge(ExplainabilitySchema)

// Output schema for the Risk agent — flags + adjusted note per supplier.
export const RiskItemSchema = z
  .object({
    // UUID matching a row in public.suppliers.
    supplier_id: z.string(),
    // 0–5 short risk flag strings (e.g. "Lead time exceeds buyer SLA").
    risk_flags: z.array(z.string().min(3).max(120)).max(5),
    // True if the agent applied the Bangladesh Mode 20% risk reduction.
    bd_mode_adjusted: z.boolean(),
  })
  .merge(ExplainabilitySchema)

// Output schema for the Comparison agent — structured scorecard per supplier.
export const ComparisonItemSchema = z
  .object({
    // UUID matching a row in public.suppliers.
    supplier_id: z.string(),
    // Numeric scorecard (mirrors the Supplier numeric fields).
    scorecard: z.object({
      // Per-unit price USD.
      price: z.number(),
      // Lead time in days.
      lead_time_days: z.number().int(),
      // Minimum order quantity in units.
      moq: z.number().int(),
      // On-time delivery rate (0–100).
      on_time_rate: z.number(),
      // Quality rating (0–5).
      quality_rating: z.number(),
    }),
  })
  .merge(ExplainabilitySchema)

// The single combined output schema — one Opus call returns all three agents' results.
export const CombinedAgentOutputSchema = z.object({
  // Discovery agent shortlist (10 items).
  discovery: z.array(DiscoveryItemSchema).min(1).max(10),
  // Risk agent flags (parallel with discovery, same supplier_ids).
  risk: z.array(RiskItemSchema).min(1).max(10),
  // Comparison scorecards (parallel with discovery).
  comparison: z.array(ComparisonItemSchema).min(1).max(10),
})

// Public type aliases inferred from the schemas — keeps types in lockstep with validators.
export type DiscoveryItem = z.infer<typeof DiscoveryItemSchema>
export type RiskItem = z.infer<typeof RiskItemSchema>
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>
export type CombinedAgentOutput = z.infer<typeof CombinedAgentOutputSchema>
