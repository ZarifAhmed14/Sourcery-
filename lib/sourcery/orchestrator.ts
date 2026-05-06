import { generateText, Output } from "ai"
import { createHash, randomUUID } from "node:crypto"
import { CombinedAgentOutputSchema, type CombinedAgentOutput, type ComparisonItem, type DiscoveryItem, type RiskItem } from "@/lib/schemas"
import { getReasoningModel, hasAiGenerationEnv, isAiDisabled } from "@/lib/env"
import { ORCHESTRATOR_SYSTEM, BANGLADESH_MODE_PROMPT } from "@/lib/prompts/system"
import { fallbackExplanation, validateExplainability } from "@/lib/guardrail"
import { buildCacheKey, getCached, setCached } from "@/lib/sourcery/cache"
import { retrieveCandidates, rescoreForBangladeshMode, type RetrievalMode } from "@/lib/sourcery/retrieval"
import { recordSourceEvent } from "@/lib/sourcery/telemetry"
import type { ApiMeta, Supplier, SupplierCategory } from "@/lib/types"

export type SourcingResult = {
  suppliers: Supplier[]
  discovery: DiscoveryItem[]
  risk: RiskItem[]
  comparison: ComparisonItem[]
  meta: ApiMeta & {
    bangladeshMode: boolean
    confidence: "high" | "medium" | "low"
    country_diversity: number
    query: string
  }
}

function leanSupplier(supplier: Supplier) {
  return {
    supplier_id: supplier.id,
    name: supplier.name,
    country: supplier.country,
    city: supplier.city,
    region: supplier.region,
    category: supplier.category,
    subcategory: supplier.subcategory,
    description: supplier.description,
    unit_price_usd: supplier.unit_price_usd,
    moq: supplier.moq,
    lead_time_days: supplier.lead_time_days,
    on_time_rate: supplier.on_time_rate,
    quality_rating: supplier.quality_rating,
    risk_score: supplier.risk_score,
    certifications: supplier.certifications,
    bgmea_certified: supplier.bgmea_certified,
    retrieval_score: supplier.retrieval_score,
  }
}

function buildUserPrompt(query: string, candidates: Supplier[], bangladeshMode: boolean): string {
  return [
    `BUYER_BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    `CANDIDATE_SUPPLIERS:\n${JSON.stringify(candidates.map(leanSupplier), null, 0)}`,
    "Return one discovery, one risk, and one comparison object for every supplier_id.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function querySignals(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
}

function deterministicFitScore(supplier: Supplier, query: string, bangladeshMode: boolean): number {
  const signals = querySignals(query)
  const haystack = `${supplier.name} ${supplier.country} ${supplier.category} ${supplier.subcategory} ${supplier.description} ${supplier.certifications.join(" ")}`.toLowerCase()
  const matches = signals.filter((signal) => haystack.includes(signal)).length
  const matchScore = signals.length ? Math.min(30, (matches / signals.length) * 30) : 10
  const qualityScore = supplier.quality_rating * 10
  const deliveryScore = supplier.on_time_rate * 0.2
  const leadScore = supplier.lead_time_days <= 35 ? 10 : supplier.lead_time_days <= 45 ? 6 : 2
  const riskPenalty = supplier.risk_score * 0.18
  const bdBonus = bangladeshMode && ["Bangladesh", "India", "Pakistan", "Vietnam"].includes(supplier.country) ? 8 : 0
  return Math.max(1, Math.min(100, Math.round(matchScore + qualityScore + deliveryScore + leadScore + bdBonus - riskPenalty)))
}

function riskFlags(supplier: Supplier, bangladeshMode: boolean): string[] {
  const flags: string[] = []
  if (supplier.lead_time_days > 45) flags.push(`Lead time is ${supplier.lead_time_days} days`)
  if (supplier.moq > 1000) flags.push(`MOQ is ${supplier.moq} units`)
  if (supplier.risk_score >= 45) flags.push(`Risk score is ${supplier.risk_score}/100`)
  if (supplier.on_time_rate < 90) flags.push(`On-time rate is ${supplier.on_time_rate}%`)
  if (bangladeshMode && ["Bangladesh", "India", "Pakistan"].includes(supplier.country)) {
    flags.push("BD-mode local familiarity adjustment applied")
  }
  return flags.slice(0, 5)
}

function deterministicOutput(suppliers: Supplier[], query: string, bangladeshMode: boolean): CombinedAgentOutput {
  const ranked = suppliers
    .map((supplier) => ({ supplier, fit: deterministicFitScore(supplier, query, bangladeshMode) }))
    .sort((a, b) => b.fit - a.fit)

  const discovery: DiscoveryItem[] = ranked.map(({ supplier, fit }, index) => ({
    supplier_id: supplier.id,
    rank: index + 1,
    fit_score: fit,
    explanation: `${supplier.name} fits with ${supplier.on_time_rate}% on-time delivery, ${supplier.lead_time_days}-day lead time, and ${supplier.moq} MOQ.`,
    key_factors: [`fit_score: ${fit}`, `on_time_rate: ${supplier.on_time_rate}%`, `lead_time: ${supplier.lead_time_days} days`, `moq: ${supplier.moq}`],
    confidence: fit >= 72 ? "high" : fit >= 48 ? "medium" : "low",
    confidence_reason: `Deterministic fallback used ${supplier.quality_rating}/5 quality and ${supplier.risk_score}/100 risk signals.`,
  }))

  const risk: RiskItem[] = ranked.map(({ supplier }) => {
    const flags = riskFlags(supplier, bangladeshMode)
    return {
      supplier_id: supplier.id,
      risk_flags: flags,
      bd_mode_adjusted: bangladeshMode && ["Bangladesh", "India", "Pakistan"].includes(supplier.country),
      explanation: `${supplier.name} has ${supplier.risk_score}/100 risk, ${supplier.on_time_rate}% on-time delivery, and ${supplier.lead_time_days}-day lead time.`,
      key_factors: [`risk_score: ${supplier.risk_score}/100`, `on_time_rate: ${supplier.on_time_rate}%`, `lead_time: ${supplier.lead_time_days} days`],
      confidence: flags.length <= 1 ? "high" : flags.length <= 3 ? "medium" : "low",
      confidence_reason: `Risk view is grounded in ${flags.length || 1} operational signals from the supplier row.`,
    }
  })

  const comparison: ComparisonItem[] = ranked.map(({ supplier }) => ({
    supplier_id: supplier.id,
    scorecard: {
      price: supplier.unit_price_usd,
      lead_time_days: supplier.lead_time_days,
      moq: supplier.moq,
      on_time_rate: supplier.on_time_rate,
      quality_rating: supplier.quality_rating,
    },
    explanation: `${supplier.name} compares at $${supplier.unit_price_usd}/unit, ${supplier.moq} MOQ, and ${supplier.quality_rating}/5 quality.`,
    key_factors: [`unit_price: $${supplier.unit_price_usd}`, `moq: ${supplier.moq}`, `quality_rating: ${supplier.quality_rating}/5`],
    confidence: "medium",
    confidence_reason: "Comparison is deterministic because the AI layer was unavailable or disabled.",
  }))

  return { discovery, risk, comparison }
}

function rollupConfidence(items: { confidence: "high" | "medium" | "low" }[]): "high" | "medium" | "low" {
  const total = items.length || 1
  const highRatio = items.filter((item) => item.confidence === "high").length / total
  const lowRatio = items.filter((item) => item.confidence === "low").length / total
  if (highRatio >= 0.7) return "high"
  if (lowRatio >= 0.5) return "low"
  return "medium"
}

async function callCombinedAgent(prompt: string, retryHint?: string): Promise<CombinedAgentOutput> {
  const { output } = await generateText({
    model: getReasoningModel(),
    system: ORCHESTRATOR_SYSTEM + (retryHint ? `\n\nRETRY_GUIDANCE:\n${retryHint}` : ""),
    prompt,
    maxOutputTokens: 1800,
    output: Output.object({ schema: CombinedAgentOutputSchema }),
  })

  if (!output) throw new Error("Agent returned no structured output")
  return output as CombinedAgentOutput
}

function completeAndRepair(out: CombinedAgentOutput, suppliers: Supplier[], fallback: CombinedAgentOutput): CombinedAgentOutput {
  const supplierIds = suppliers.map((supplier) => supplier.id)
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]))

  const repairExplanation = <T extends { supplier_id: string; explanation: string; key_factors: string[]; confidence: "high" | "medium" | "low"; confidence_reason: string }>(item: T): T => {
    if (validateExplainability(item)) return item
    const supplier = supplierById.get(item.supplier_id)
    if (!supplier) return item
    const repaired = fallbackExplanation(supplier)
    return { ...item, ...repaired }
  }

  const byId = <T extends { supplier_id: string }>(items: T[]) => new Map(items.map((item) => [item.supplier_id, item]))
  const fallbackDiscovery = byId(fallback.discovery)
  const fallbackRisk = byId(fallback.risk)
  const fallbackComparison = byId(fallback.comparison)
  const discovery = byId(out.discovery)
  const risk = byId(out.risk)
  const comparison = byId(out.comparison)

  return {
    discovery: supplierIds.map((id) => repairExplanation((discovery.get(id) ?? fallbackDiscovery.get(id))!)).sort((a, b) => a.rank - b.rank),
    risk: supplierIds.map((id) => repairExplanation((risk.get(id) ?? fallbackRisk.get(id))!)),
    comparison: supplierIds.map((id) => repairExplanation((comparison.get(id) ?? fallbackComparison.get(id))!)),
  }
}

async function runAgentWithFallback(prompt: string, suppliers: Supplier[], query: string, bangladeshMode: boolean): Promise<{ output: CombinedAgentOutput; mode: "ai" | "deterministic_fallback" }> {
  const fallback = deterministicOutput(suppliers, query, bangladeshMode)

  if (isAiDisabled() || !hasAiGenerationEnv()) {
    return { output: fallback, mode: "deterministic_fallback" }
  }

  try {
    const first = await callCombinedAgent(prompt)
    const repaired = completeAndRepair(first, suppliers, fallback)
    const invalid = [...repaired.discovery, ...repaired.risk, ...repaired.comparison].some((item) => !validateExplainability(item))
    if (!invalid) return { output: repaired, mode: "ai" }

    const retry = await callCombinedAgent(
      prompt,
      "Your previous explanations were too vague. Reference concrete numbers such as unit_price_usd, lead_time_days, moq, on_time_rate, quality_rating, or risk_score.",
    )
    return { output: completeAndRepair(retry, suppliers, fallback), mode: "ai" }
  } catch (err) {
    console.log("[sourcery] AI agent fallback:", (err as Error).message)
    return { output: fallback, mode: "deterministic_fallback" }
  }
}

function buildResult(args: {
  query: string
  bangladeshMode: boolean
  suppliers: Supplier[]
  output: CombinedAgentOutput
  cached: boolean
  requestId: string
  retrievalMode: RetrievalMode
  llmMode: "ai" | "deterministic_fallback"
  startedAt: number
}): SourcingResult {
  const allConfidences = [...args.output.discovery, ...args.output.risk, ...args.output.comparison]
  return {
    suppliers: args.suppliers,
    discovery: args.output.discovery,
    risk: args.output.risk,
    comparison: args.output.comparison,
    meta: {
      request_id: args.requestId,
      bangladeshMode: args.bangladeshMode,
      cached: args.cached,
      confidence: rollupConfidence(allConfidences),
      country_diversity: new Set(args.suppliers.map((supplier) => supplier.country)).size,
      query: args.query,
      retrieval_mode: args.retrievalMode,
      llm_mode: args.llmMode,
      elapsed_ms: Date.now() - args.startedAt,
    },
  }
}

export async function runSourcingOrchestrator(args: {
  query: string
  bangladeshMode: boolean
  topK?: number
  category?: SupplierCategory | null
  requestId?: string
}): Promise<SourcingResult> {
  const startedAt = Date.now()
  const requestId = args.requestId ?? randomUUID()
  const topK = args.topK ?? 10
  const cacheKey = buildCacheKey({ query: args.query, bangladeshMode: args.bangladeshMode, topK })
  const cached = await getCached<SourcingResult>(cacheKey)
  if (cached) {
    return {
      ...cached,
      meta: {
        ...cached.meta,
        request_id: requestId,
        cached: true,
        elapsed_ms: Date.now() - startedAt,
      },
    }
  }

  const retrieval = await retrieveCandidates(args.query, 20, args.category)
  if (retrieval.suppliers.length === 0) {
    throw new Error("No supplier candidates are available. Seed Supabase first, then rerun the query.")
  }

  const suppliers = rescoreForBangladeshMode(retrieval.suppliers, args.bangladeshMode, topK)
  const prompt = buildUserPrompt(args.query, suppliers, args.bangladeshMode)
  const agent = await runAgentWithFallback(prompt, suppliers, args.query, args.bangladeshMode)

  const result = buildResult({
    query: args.query,
    bangladeshMode: args.bangladeshMode,
    suppliers,
    output: agent.output,
    cached: false,
    requestId,
    retrievalMode: retrieval.mode,
    llmMode: agent.mode,
    startedAt,
  })

  await setCached(cacheKey, result)
  await recordSourceEvent(result)
  return result
}

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12)
}
