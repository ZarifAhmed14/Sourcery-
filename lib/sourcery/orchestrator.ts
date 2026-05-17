import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import {
  CombinedAgentOutputSchema,
  ComparisonItemSchema,
  DiscoveryItemSchema,
  RiskItemSchema,
  type CombinedAgentOutput,
  type ComparisonItem,
  type DiscoveryItem,
  type RiskItem,
} from "@/lib/schemas"
import { getAiGenerationProvider, isFreeSourceAiEnabled } from "@/lib/env"
import { generateStructuredObject, type AiGenerationProvider } from "@/lib/ai/generation"
import { ORCHESTRATOR_SYSTEM, BANGLADESH_MODE_PROMPT } from "@/lib/prompts/system"
import { fallbackExplanation, validateExplainability } from "@/lib/guardrail"
import { buildCacheKey, getCached, setCached } from "@/lib/sourcery/cache"
import { detectCategory, retrieveCandidates, rescoreForBangladeshMode, type RetrievalMode } from "@/lib/sourcery/retrieval"
import { recordSourceEvent } from "@/lib/sourcery/telemetry"
import { isSupportedProduct, supportedProductHelpText } from "@/lib/sourcery/supported-products"
import type { ApiMeta, Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"
import { ApiRequestError } from "@/lib/backend/http"

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

const SingleSupplierAgentOutputSchema = z.object({
  discovery: DiscoveryItemSchema,
  risk: RiskItemSchema,
  comparison: ComparisonItemSchema,
})

type SingleSupplierAgentOutput = z.infer<typeof SingleSupplierAgentOutputSchema>

const UNSUPPORTED_DEMO_QUERY =
  /\b(electronic|electronics|sensor|sensors|module|modules|pcb|bluetooth|smart device|charger|earbud|power bank|adapter)\b/i

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

function responseShape(candidates: Supplier[]): string {
  return `JSON_RESPONSE_SHAPE:
{
  "discovery": [
    {
      "supplier_id": "<uuid from candidate list>",
      "rank": 1,
      "fit_score": 75,
      "explanation": "Selected for 96% on-time rate and 24-day lead time.",
      "key_factors": ["on_time_rate: 96%", "lead_time: 24 days"],
      "confidence": "high",
      "confidence_reason": "Strong match across 4 supplier signals."
    }
  ],
  "risk": [
    {
      "supplier_id": "<uuid from candidate list>",
      "risk_flags": ["MOQ is 500 units"],
      "bd_mode_adjusted": false,
      "explanation": "Risk is moderate at 22/100 with 24-day lead time.",
      "key_factors": ["risk_score: 22/100", "lead_time: 24 days"],
      "confidence": "medium",
      "confidence_reason": "Risk uses lead time, MOQ, and risk score."
    }
  ],
  "comparison": [
    {
      "supplier_id": "<uuid from candidate list>",
      "scorecard": {
        "price": 1.2,
        "lead_time_days": 24,
        "moq": 500,
        "on_time_rate": 96,
        "quality_rating": 4.7
      },
      "explanation": "Compares at $1.2/unit, 500 MOQ, and 4.7/5 quality.",
      "key_factors": ["unit_price: $1.2", "quality_rating: 4.7/5"],
      "confidence": "medium",
      "confidence_reason": "Comparison uses concrete supplier row fields."
    }
  ]
}
Return exactly ${candidates.length} items in each array. Use only supplier_id values from the candidate list. Use no extra top-level keys.`
}

function buildUserPrompt(query: string, candidates: Supplier[], bangladeshMode: boolean): string {
  return [
    `BUYER_BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    `CANDIDATE_SUPPLIERS:\n${JSON.stringify(candidates.map(leanSupplier), null, 0)}`,
    responseShape(candidates),
    "Return one discovery, one risk, and one comparison object for every supplier_id.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function buildBuyerFiltersBlock(filters: {
  country?: string | null
  region?: SupplierRegion | null
  targetUnitPriceMin?: number | null
  targetUnitPriceMax?: number | null
  orderQuantity?: number | null
  maxMOQ?: number | null
  maxLeadTimeDays?: number | null
  minQualityRating?: number | null
}): string {
  const lines = [
    filters.country ? `country: ${filters.country}` : null,
    filters.region ? `region: ${filters.region}` : null,
    typeof filters.targetUnitPriceMin === "number" ? `target_unit_price_min: ${filters.targetUnitPriceMin}` : null,
    typeof filters.targetUnitPriceMax === "number" ? `target_unit_price_max: ${filters.targetUnitPriceMax}` : null,
    typeof filters.orderQuantity === "number" ? `order_quantity: ${filters.orderQuantity}` : null,
    typeof filters.maxMOQ === "number" ? `max_moq: ${filters.maxMOQ}` : null,
    typeof filters.maxLeadTimeDays === "number" ? `max_lead_time_days: ${filters.maxLeadTimeDays}` : null,
    typeof filters.minQualityRating === "number" ? `min_quality_rating: ${filters.minQualityRating}` : null,
  ].filter(Boolean)

  return lines.length > 0 ? `BUYER_FILTERS:\n${lines.join("\n")}` : ""
}

function buildSingleSupplierPrompt(
  query: string,
  supplier: Supplier,
  rank: number,
  bangladeshMode: boolean,
  buyerFilters: string,
): string {
  return [
    `BUYER_BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    buyerFilters,
    `SUPPLIER:\n${JSON.stringify(leanSupplier(supplier), null, 0)}`,
    `Return strict JSON only with this exact shape:
{
  "discovery": {
    "supplier_id": "${supplier.id}",
    "rank": ${rank},
    "fit_score": 75,
    "explanation": "Use concrete supplier numbers.",
    "key_factors": ["on_time_rate: ${supplier.on_time_rate}%", "lead_time: ${supplier.lead_time_days} days"],
    "confidence": "high",
    "confidence_reason": "One sentence under 160 chars."
  },
  "risk": {
    "supplier_id": "${supplier.id}",
    "risk_flags": ["Risk flag with concrete value"],
    "bd_mode_adjusted": ${bangladeshMode && ["Bangladesh", "India", "Pakistan"].includes(supplier.country) ? "true" : "false"},
    "explanation": "Use concrete supplier numbers.",
    "key_factors": ["risk_score: ${supplier.risk_score}/100", "moq: ${supplier.moq}"],
    "confidence": "medium",
    "confidence_reason": "One sentence under 160 chars."
  },
  "comparison": {
    "supplier_id": "${supplier.id}",
    "scorecard": {
      "price": ${supplier.unit_price_usd},
      "lead_time_days": ${supplier.lead_time_days},
      "moq": ${supplier.moq},
      "on_time_rate": ${supplier.on_time_rate},
      "quality_rating": ${supplier.quality_rating}
    },
    "explanation": "Use concrete supplier numbers.",
    "key_factors": ["unit_price: $${supplier.unit_price_usd}", "quality_rating: ${supplier.quality_rating}/5"],
    "confidence": "medium",
    "confidence_reason": "One sentence under 160 chars."
  }
}`,
    "Do not change supplier_id, rank, or scorecard numbers. Keep explanations short and specific.",
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

async function callCombinedAgent(
  prompt: string,
  maxOutputTokens: number,
  retryHint?: string,
): Promise<{ output: CombinedAgentOutput; provider: Exclude<AiGenerationProvider, "none"> }> {
  const result = await generateStructuredObject({
    system: ORCHESTRATOR_SYSTEM + (retryHint ? `\n\nRETRY_GUIDANCE:\n${retryHint}` : ""),
    prompt,
    maxOutputTokens,
    schema: CombinedAgentOutputSchema,
  })

  return result
}

async function callSingleSupplierAgents(
  suppliers: Supplier[],
  query: string,
  bangladeshMode: boolean,
  buyerFilters: string,
): Promise<{ output: CombinedAgentOutput; provider: Exclude<AiGenerationProvider, "none"> }> {
  const items: Array<{
    output: SingleSupplierAgentOutput
    provider: Exclude<AiGenerationProvider, "none">
  }> = []

  for (const [index, supplier] of suppliers.entries()) {
    const result = await generateStructuredObject<SingleSupplierAgentOutput>({
      system: [
        "You are Sourcery's lightweight sourcing analyst.",
        "Score exactly one supplier for discovery, risk, and comparison.",
        "Return valid JSON only. Use the numeric supplier row fields; do not invent data.",
      ].join("\n"),
      prompt: buildSingleSupplierPrompt(query, supplier, index + 1, bangladeshMode, buyerFilters),
      maxOutputTokens: 900,
      schema: SingleSupplierAgentOutputSchema,
    })
    items.push(result)
  }

  return {
    output: {
      discovery: items.map((item) => item.output.discovery).sort((a, b) => a.rank - b.rank),
      risk: items.map((item) => item.output.risk),
      comparison: items.map((item) => item.output.comparison),
    },
    provider: items[0]?.provider ?? "pollinations",
  }
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

async function runAgentWithFallback(
  prompt: string,
  suppliers: Supplier[],
  query: string,
  bangladeshMode: boolean,
  buyerFilters: string,
  sourceProvider: AiGenerationProvider = getAiGenerationProvider(),
): Promise<{ output: CombinedAgentOutput; mode: "ai" | "deterministic_fallback"; provider: AiGenerationProvider }> {
  const fallback = deterministicOutput(suppliers, query, bangladeshMode)
  const configuredProvider = sourceProvider

  if (configuredProvider === "none") {
    return { output: fallback, mode: "deterministic_fallback", provider: "none" }
  }

  try {
    if (configuredProvider === "pollinations") {
      const lite = await callSingleSupplierAgents(suppliers, query, bangladeshMode, buyerFilters)
      const repaired = completeAndRepair(lite.output, suppliers, fallback)
      const invalid = [...repaired.discovery, ...repaired.risk, ...repaired.comparison].some((item) => !validateExplainability(item))
      if (!invalid) return { output: repaired, mode: "ai", provider: lite.provider }
      throw new Error("Pollinations supplier output failed explainability validation")
    }

    const maxOutputTokens = Math.max(3600, Math.min(5200, suppliers.length * 420))
    const first = await callCombinedAgent(prompt, maxOutputTokens)
    const repaired = completeAndRepair(first.output, suppliers, fallback)
    const invalid = [...repaired.discovery, ...repaired.risk, ...repaired.comparison].some((item) => !validateExplainability(item))
    if (!invalid) return { output: repaired, mode: "ai", provider: first.provider }

    const retry = await callCombinedAgent(
      prompt,
      maxOutputTokens,
      "Your previous explanations were too vague. Reference concrete numbers such as unit_price_usd, lead_time_days, moq, on_time_rate, quality_rating, or risk_score.",
    )
    return { output: completeAndRepair(retry.output, suppliers, fallback), mode: "ai", provider: retry.provider }
  } catch (err) {
    console.log("[sourcery] AI agent fallback:", (err as Error).message)
    return { output: fallback, mode: "deterministic_fallback", provider: configuredProvider }
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
  aiProvider: AiGenerationProvider
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
      ai_provider: args.aiProvider,
      elapsed_ms: Date.now() - args.startedAt,
    },
  }
}

export async function runSourcingOrchestrator(args: {
  query: string
  bangladeshMode: boolean
  topK?: number
  category?: SupplierCategory | null
  product?: string | null
  country?: string | null
  region?: SupplierRegion | null
  targetUnitPriceMin?: number | null
  targetUnitPriceMax?: number | null
  orderQuantity?: number | null
  maxMOQ?: number | null
  maxLeadTimeDays?: number | null
  minQualityRating?: number | null
  requestId?: string
}): Promise<SourcingResult> {
  const startedAt = Date.now()
  const detectedCategory = args.category ?? detectCategory(args.query)
  if (
    UNSUPPORTED_DEMO_QUERY.test(args.query) ||
    !detectedCategory ||
    !isSupportedProduct(detectedCategory, args.product)
  ) {
    throw new ApiRequestError(
      "BAD_REQUEST",
      `This demo workspace is locked to supported product paths. Please choose one category/product chip first. Supported paths: ${supportedProductHelpText()}`,
      400,
    )
  }
  const requestId = args.requestId ?? randomUUID()
  const topK = args.topK ?? 10
  const configuredProvider = getAiGenerationProvider()
  const sourceProvider =
    (configuredProvider === "pollinations" || configuredProvider === "gemini") && !isFreeSourceAiEnabled()
      ? "none"
      : configuredProvider
  const cacheKey = buildCacheKey({
    query: args.query,
    bangladeshMode: args.bangladeshMode,
    topK,
    category: detectedCategory,
    product: args.product,
    country: args.country,
    region: args.region,
    targetUnitPriceMin: args.targetUnitPriceMin,
    targetUnitPriceMax: args.targetUnitPriceMax,
    orderQuantity: args.orderQuantity,
    maxMOQ: args.maxMOQ,
    maxLeadTimeDays: args.maxLeadTimeDays,
    minQualityRating: args.minQualityRating,
    aiProvider: sourceProvider,
  })
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

  const retrieval = await retrieveCandidates(args.query, 20, detectedCategory, {
    product: args.product,
    country: args.country,
    region: args.region,
    targetUnitPriceMin: args.targetUnitPriceMin,
    targetUnitPriceMax: args.targetUnitPriceMax,
    orderQuantity: args.orderQuantity,
    maxMOQ: args.maxMOQ,
    maxLeadTimeDays: args.maxLeadTimeDays,
    minQualityRating: args.minQualityRating,
  })
  if (retrieval.suppliers.length === 0) {
    throw new Error("No supplier candidates are available. Seed Supabase first, then rerun the query.")
  }

  const suppliers = rescoreForBangladeshMode(retrieval.suppliers, args.bangladeshMode, topK)
  const buyerFilters = buildBuyerFiltersBlock({
    country: args.country,
    region: args.region,
    targetUnitPriceMin: args.targetUnitPriceMin,
    targetUnitPriceMax: args.targetUnitPriceMax,
    orderQuantity: args.orderQuantity,
    maxMOQ: args.maxMOQ,
    maxLeadTimeDays: args.maxLeadTimeDays,
    minQualityRating: args.minQualityRating,
  })
  const prompt = [buildUserPrompt(args.query, suppliers, args.bangladeshMode), buyerFilters].filter(Boolean).join("\n\n")
  const agent = await runAgentWithFallback(prompt, suppliers, args.query, args.bangladeshMode, buyerFilters, sourceProvider)

  const result = buildResult({
    query: args.query,
    bangladeshMode: args.bangladeshMode,
    suppliers,
    output: agent.output,
    cached: false,
    requestId,
    retrievalMode: retrieval.mode,
    llmMode: agent.mode,
    aiProvider: agent.provider,
    startedAt,
  })

  if (agent.mode === "ai" || agent.provider === "none") {
    await setCached(cacheKey, result)
  }
  await recordSourceEvent(result)
  return result
}

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12)
}
