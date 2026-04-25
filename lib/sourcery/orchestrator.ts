// Multi-agent orchestrator — the brain that turns a user query into a structured sourcing decision.
// Flow: cache lookup → SQL retrieval → BD-mode re-score → single Opus call (3 agent personas) →
// guardrail validation → fallback if needed → cache write → return.

import { generateText, Output } from "ai"
import { createHash } from "node:crypto"
import { CombinedAgentOutputSchema, type CombinedAgentOutput, type DiscoveryItem, type RiskItem, type ComparisonItem } from "@/lib/schemas"
import { ORCHESTRATOR_SYSTEM, BANGLADESH_MODE_PROMPT } from "@/lib/prompts/system"
import { validateExplainability, fallbackExplanation } from "@/lib/guardrail"
import { retrieveCandidates, rescoreForBangladeshMode } from "@/lib/sourcery/retrieval"
import { buildCacheKey, getCached, setCached } from "@/lib/sourcery/cache"
import type { Supplier } from "@/lib/types"

// The full bundle returned to the client — includes the candidate suppliers
// plus the parallel agent outputs plus a confidence rollup for the UI.
export type SourcingResult = {
  // The candidates the agents reasoned over (top 10 after BD-mode re-score).
  suppliers: Supplier[]
  // Discovery agent ranked shortlist (parallel array, supplier_id-keyed).
  discovery: DiscoveryItem[]
  // Risk agent flags per supplier.
  risk: RiskItem[]
  // Comparison agent scorecards per supplier.
  comparison: ComparisonItem[]
  // Aggregate metadata for trust + telemetry.
  meta: {
    // Was Bangladesh Mode active for this run.
    bangladeshMode: boolean
    // True when the response was served from the AI cache.
    cached: boolean
    // High-level confidence rollup ("high" if >70% items are high, else "medium" or "low").
    confidence: "high" | "medium" | "low"
    // Country diversity check — how many distinct countries are in the result set.
    country_diversity: number
    // The sanitized query used for retrieval (echoed back for UI display).
    query: string
  }
}

// Build the user-facing prompt — embeds the candidate JSON, BD-mode block, and the buyer's brief.
function buildUserPrompt(query: string, candidates: Supplier[], bangladeshMode: boolean): string {
  // Strip the candidate JSON down to ONLY the fields the LLM needs (saves ~30% tokens vs full row).
  const lean = candidates.map((s) => ({
    supplier_id: s.id,
    name: s.name,
    country: s.country,
    region: s.region,
    category: s.category,
    subcategory: s.subcategory,
    description: s.description,
    unit_price_usd: s.unit_price_usd,
    moq: s.moq,
    lead_time_days: s.lead_time_days,
    on_time_rate: s.on_time_rate,
    quality_rating: s.quality_rating,
    risk_score: s.risk_score,
    certifications: s.certifications,
    bgmea_certified: s.bgmea_certified,
  }))
  // Compose the final prompt — short brief, conditional BD block, then JSON candidates.
  return [
    `BUYER BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    `CANDIDATE SUPPLIERS (return one entry per agent for EACH supplier_id below):\n${JSON.stringify(lean, null, 0)}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// Compute a coarse confidence rollup from the per-item confidences.
function rollupConfidence(items: { confidence: "high" | "medium" | "low" }[]): "high" | "medium" | "low" {
  const total = items.length || 1
  const highRatio = items.filter((i) => i.confidence === "high").length / total
  const lowRatio = items.filter((i) => i.confidence === "low").length / total
  if (highRatio >= 0.7) return "high"
  if (lowRatio >= 0.5) return "low"
  return "medium"
}

// Run the agent call once and return the parsed structured object (or throw).
async function callCombinedAgent(prompt: string, retryHint?: string): Promise<CombinedAgentOutput> {
  // Using gpt-5-mini as the workhorse model — strong structured-output performance, low cost,
  // works great with Output.object() strict mode. Anthropic Opus is reserved for premium tier
  // (we leave a single-line model swap available for judges/demo days).
  const model = "openai/gpt-5-mini"

  // generateText with Output.object() is the AI SDK 6 replacement for the deprecated generateObject.
  const { output } = await generateText({
    model,
    system: ORCHESTRATOR_SYSTEM + (retryHint ? `\n\nRETRY GUIDANCE:\n${retryHint}` : ""),
    prompt,
    // Hard cap to control cost — combined output across 3 agents × 10 suppliers fits in <2k tokens.
    maxOutputTokens: 2400,
    // Force structured output validated against our combined schema.
    output: Output.object({ schema: CombinedAgentOutputSchema }),
  })
  // The destructured `output` is already typed by the schema.
  if (!output) throw new Error("Agent returned no structured output")
  return output as CombinedAgentOutput
}

// Apply the explainability guardrail to every item. If validation fails, retry once,
// then fall back to deterministic explanations built from raw supplier data.
async function withGuardrail(prompt: string, suppliers: Supplier[]): Promise<CombinedAgentOutput> {
  // Quick lookup map for fallback generation.
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))

  // First attempt.
  let out: CombinedAgentOutput
  try {
    out = await callCombinedAgent(prompt)
  } catch (e) {
    console.log("[v0] orchestrator: first attempt threw, retrying with hint", (e as Error).message)
    // Retry once with a stricter instruction if the first attempt produced an invalid object.
    out = await callCombinedAgent(prompt, "Your previous response failed schema validation. Return EXACT JSON matching the schema with no extra fields.")
  }

  // Validate every item's explainability block; if any item fails, retry once with strict guidance.
  const allItems = [...out.discovery, ...out.risk, ...out.comparison]
  const anyInvalid = allItems.some((item) => !validateExplainability(item))

  if (anyInvalid) {
    console.log("[v0] orchestrator: explainability validation failed, retrying with stricter hint")
    try {
      out = await callCombinedAgent(
        prompt,
        "Your previous explanations were too vague. Each explanation MUST reference at least one specific number from the supplier data (price, lead time, on-time %, MOQ, etc.). At least one key_factor MUST contain a digit.",
      )
    } catch (e) {
      console.log("[v0] orchestrator: retry threw, will fall back to deterministic explanations", (e as Error).message)
    }
  }

  // Final pass — for any item that STILL fails validation, replace its explainability fields
  // with the deterministic fallback. This guarantees the UI always renders trustworthy text.
  const repair = <T extends { supplier_id: string; explanation: string; key_factors: string[]; confidence: "high" | "medium" | "low"; confidence_reason: string }>(item: T): T => {
    if (validateExplainability(item)) return item
    const s = supplierById.get(item.supplier_id)
    if (!s) return item
    const fb = fallbackExplanation(s)
    return { ...item, explanation: fb.explanation, key_factors: fb.key_factors, confidence: fb.confidence, confidence_reason: fb.confidence_reason }
  }
  out.discovery = out.discovery.map(repair)
  out.risk = out.risk.map(repair)
  out.comparison = out.comparison.map(repair)

  return out
}

// Public entry point — call this from a server action or route handler.
export async function runSourcingOrchestrator(args: { query: string; bangladeshMode: boolean; topK?: number }): Promise<SourcingResult> {
  // Normalize topK.
  const topK = args.topK ?? 10

  // Build a stable cache key + look it up.
  const cacheKey = buildCacheKey({ query: args.query, bangladeshMode: args.bangladeshMode, topK })
  const cached = await getCached<SourcingResult>(cacheKey)
  if (cached) {
    console.log("[v0] orchestrator: cache hit", cacheKey.slice(0, 8))
    return { ...cached, meta: { ...cached.meta, cached: true } }
  }

  // Knowledge layer retrieval — Postgres FTS + category filter.
  const candidatePool = await retrieveCandidates(args.query, 20)
  if (candidatePool.length === 0) {
    throw new Error("No supplier candidates matched your query. Try rephrasing or removing specific certifications.")
  }

  // Server-side re-score for BD mode (or pass-through when off).
  const candidates = rescoreForBangladeshMode(candidatePool, args.bangladeshMode, topK)

  // Build the LLM prompt and run the guarded agent call.
  const prompt = buildUserPrompt(args.query, candidates, args.bangladeshMode)
  const agentOutput = await withGuardrail(prompt, candidates)

  // Build the response payload.
  const allConfidences = [...agentOutput.discovery, ...agentOutput.risk, ...agentOutput.comparison]
  const result: SourcingResult = {
    suppliers: candidates,
    discovery: agentOutput.discovery,
    risk: agentOutput.risk,
    comparison: agentOutput.comparison,
    meta: {
      bangladeshMode: args.bangladeshMode,
      cached: false,
      confidence: rollupConfidence(allConfidences),
      country_diversity: new Set(candidates.map((s) => s.country)).size,
      query: args.query,
    },
  }

  // Persist to cache for 24h. Errors are non-fatal.
  await setCached(cacheKey, result)
  return result
}

// Stable hash helper — exposed for the explainer endpoints that need their own cache scope.
export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12)
}
