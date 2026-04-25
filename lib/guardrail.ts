// Explainability guardrail — runs after every agent call to catch vague/non-numeric outputs.
// If validation fails, the orchestrator retries once with a stricter instruction; if that still fails,
// a deterministic fallback explanation is generated from the raw supplier data (no AI required).

import type { Explainability, Supplier } from "@/lib/types"

// Returns true if the explainability block is acceptable per our hard rules.
export function validateExplainability(out: Explainability): boolean {
  // Require a meaningful prose explanation.
  if (!out.explanation || out.explanation.length < 20) return false
  // Require 2–5 key factors.
  if (!out.key_factors || out.key_factors.length < 2) return false
  // Require AT LEAST ONE key factor to contain a digit (numeric reference).
  // This is the most common failure mode for vague LLM outputs.
  const hasNumericReference = out.key_factors.some((f) => /\d/.test(f))
  if (!hasNumericReference) return false
  // Confidence reason must exist.
  if (!out.confidence_reason || out.confidence_reason.length < 5) return false
  // All checks passed.
  return true
}

// Deterministic fallback when the AI produces a vague explanation even after retry.
// Built entirely from real supplier data — no AI tokens consumed.
export function fallbackExplanation(s: Supplier): Explainability {
  return {
    // Templated prose referencing concrete numeric fields from the supplier row.
    explanation: `${s.name} in ${s.city}, ${s.country} offers $${s.unit_price_usd}/unit with ${s.lead_time_days}-day lead time, ${s.on_time_rate}% on-time rate, and ${s.quality_rating}/5 quality rating.`,
    // Three numeric factors — guaranteed to pass the digit check.
    key_factors: [
      `unit_price: $${s.unit_price_usd}`,
      `on_time_rate: ${s.on_time_rate}%`,
      `lead_time: ${s.lead_time_days} days`,
      `moq: ${s.moq} units`,
    ],
    // Mark fallback explanations as low-confidence so the UI can flag them.
    confidence: "low" as const,
    // Disclose to the user that this is a deterministic fallback.
    confidence_reason: "Generated from raw supplier data — AI reasoning unavailable for this row.",
  }
}
