import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import { generateStructuredObject, type AiGenerationProvider } from "@/lib/ai/generation"
import { ApiRequestError } from "@/lib/backend/http"
import { getSourceAiProvider, isFreeSourceAiEnabled } from "@/lib/env"
import { buildCacheKey, getCached, setCached } from "@/lib/sourcery/cache"
import { detectCategory, retrieveCandidates, rescoreForBangladeshMode, type RetrievalMode } from "@/lib/sourcery/retrieval"
import { isSupportedProduct, supportedProductHelpText } from "@/lib/sourcery/supported-products"
import { recordSourceEvent } from "@/lib/sourcery/telemetry"
import { BANGLADESH_MODE_PROMPT } from "@/lib/prompts/system"
import type { ApiMeta, Supplier, SupplierCategory, SupplierRegion } from "@/lib/types"

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

type DiscoveryItem = {
  supplier_id: string
  rank: number
  fit_score: number
  explanation: string
  key_factors: string[]
  confidence: "high" | "medium" | "low"
  confidence_reason: string
}

type RiskItem = {
  supplier_id: string
  risk_flags: string[]
  bd_mode_adjusted: boolean
  explanation: string
  key_factors: string[]
  confidence: "high" | "medium" | "low"
  confidence_reason: string
}

type ComparisonItem = {
  supplier_id: string
  scorecard: {
    price: number
    lead_time_days: number
    moq: number
    on_time_rate: number
    quality_rating: number
  }
  explanation: string
  key_factors: string[]
  confidence: "high" | "medium" | "low"
  confidence_reason: string
}

type CombinedAgentOutput = {
  discovery: DiscoveryItem[]
  risk: RiskItem[]
  comparison: ComparisonItem[]
}

const RANKING_VERSION = "v2-lite"

const LiteRankingItemSchema = z.object({
  supplier_id: z.string().min(2),
  rank: z.number().int().min(1).max(10),
  fit_summary: z.string().min(12).max(220),
  watchout: z.string().min(8).max(180),
})

const LiteRankingResponseSchema = z.object({
  rankings: z.array(LiteRankingItemSchema).min(1).max(10),
})

type LiteRankingResponse = z.infer<typeof LiteRankingResponseSchema>

const LITE_RANKING_JSON_SCHEMA = {
  name: "sourcery_ranking_lite",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      rankings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            supplier_id: { type: "string" },
            rank: { type: "integer" },
            fit_summary: { type: "string" },
            watchout: { type: "string" },
          },
          required: ["supplier_id", "rank", "fit_summary", "watchout"],
        },
      },
    },
    required: ["rankings"],
  },
} as const

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

function buildLiteRankingPrompt(query: string, candidates: Supplier[], bangladeshMode: boolean, buyerFilters: string): string {
  return [
    "You are Sourcery, a sourcing ranking analyst.",
    "Rank every supplier from best to worst for this buyer brief.",
    "Return strict JSON only with one rankings[] item for every supplier.",
    "Use supplier_id exactly as provided. Do not invent or omit suppliers.",
    "fit_summary: one short sentence on why the supplier fits.",
    "watchout: one short sentence on the main caution.",
    "Mention concrete numbers when helpful, especially MOQ, lead time, price, quality rating, or on-time rate.",
    `BUYER_BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    buyerFilters,
    `CANDIDATE_SUPPLIERS:\n${JSON.stringify(candidates.map(leanSupplier), null, 0)}`,
    `JSON_RESPONSE_SHAPE:\n{
  "rankings": [
    {
      "supplier_id": "<id>",
      "rank": 1,
      "fit_summary": "Strong balance of price and lead time for the brief.",
      "watchout": "MOQ is 1500 units, so it is better for established demand."
    }
  ]
}`,
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

function discoveryConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 78) return "high"
  if (score >= 55) return "medium"
  return "low"
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

function rankingKeyFactors(supplier: Supplier, watchout?: string): string[] {
  const factors = [
    `unit_price: $${supplier.unit_price_usd}`,
    `lead_time: ${supplier.lead_time_days} days`,
    `moq: ${supplier.moq}`,
    `quality_rating: ${supplier.quality_rating}/5`,
  ]
  if (watchout) factors.push(`watchout: ${watchout}`)
  return factors.slice(0, 5)
}

function buildRiskItems(suppliers: Supplier[], bangladeshMode: boolean, mode: "ai" | "deterministic_fallback"): RiskItem[] {
  return suppliers.map((supplier) => {
    const flags = riskFlags(supplier, bangladeshMode)
    return {
      supplier_id: supplier.id,
      risk_flags: flags,
      bd_mode_adjusted: bangladeshMode && ["Bangladesh", "India", "Pakistan"].includes(supplier.country),
      explanation: `${supplier.name} has ${supplier.risk_score}/100 risk, ${supplier.on_time_rate}% on-time delivery, and ${supplier.lead_time_days}-day lead time.`,
      key_factors: [`risk_score: ${supplier.risk_score}/100`, `on_time_rate: ${supplier.on_time_rate}%`, `lead_time: ${supplier.lead_time_days} days`],
      confidence: flags.length <= 1 ? "high" : flags.length <= 3 ? "medium" : "low",
      confidence_reason:
        mode === "ai"
          ? "Risk is computed directly from supplier data after the AI ranking step."
          : `Risk view is grounded in ${flags.length || 1} operational signals from the supplier row.`,
    }
  })
}

function buildComparisonItems(suppliers: Supplier[], mode: "ai" | "deterministic_fallback"): ComparisonItem[] {
  return suppliers.map((supplier) => ({
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
    confidence: mode === "ai" ? "high" : "medium",
    confidence_reason:
      mode === "ai"
        ? "Comparison metrics are computed directly from the supplier dataset."
        : "Comparison is rules-ranked because the AI layer was unavailable or disabled.",
  }))
}

function buildDeterministicOutput(suppliers: Supplier[], query: string, bangladeshMode: boolean): CombinedAgentOutput {
  const ranked = suppliers
    .map((supplier) => ({ supplier, fit: deterministicFitScore(supplier, query, bangladeshMode) }))
    .sort((a, b) => b.fit - a.fit)

  const orderedSuppliers = ranked.map((item) => item.supplier)
  const discovery: DiscoveryItem[] = ranked.map(({ supplier, fit }, index) => ({
    supplier_id: supplier.id,
    rank: index + 1,
    fit_score: fit,
    explanation: `${supplier.name} fits with ${supplier.on_time_rate}% on-time delivery, ${supplier.lead_time_days}-day lead time, and ${supplier.moq} MOQ.`,
    key_factors: rankingKeyFactors(supplier),
    confidence: discoveryConfidence(fit),
    confidence_reason: `Data-ranked from supplier data using ${supplier.quality_rating}/5 quality, ${supplier.risk_score}/100 risk, MOQ, and lead time signals.`,
  }))

  return {
    discovery,
    risk: buildRiskItems(orderedSuppliers, bangladeshMode, "deterministic_fallback"),
    comparison: buildComparisonItems(orderedSuppliers, "deterministic_fallback"),
  }
}

function validateLiteRanking(rankings: LiteRankingResponse, suppliers: Supplier[]): void {
  const expectedIds = new Set(suppliers.map((supplier) => supplier.id))
  const seenIds = new Set<string>()
  const seenRanks = new Set<number>()

  if (rankings.rankings.length !== suppliers.length) {
    throw new Error(`Ranking response count mismatch. Expected ${suppliers.length}, received ${rankings.rankings.length}.`)
  }

  for (const item of rankings.rankings) {
    if (!expectedIds.has(item.supplier_id)) throw new Error(`Unknown supplier_id in ranking response: ${item.supplier_id}`)
    if (seenIds.has(item.supplier_id)) throw new Error(`Duplicate supplier_id in ranking response: ${item.supplier_id}`)
    if (seenRanks.has(item.rank)) throw new Error(`Duplicate rank in ranking response: ${item.rank}`)
    seenIds.add(item.supplier_id)
    seenRanks.add(item.rank)
  }
}

function buildAiGuidedOutput(rankings: LiteRankingResponse, suppliers: Supplier[], query: string, bangladeshMode: boolean): CombinedAgentOutput {
  validateLiteRanking(rankings, suppliers)
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]))
  const ordered = rankings.rankings
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((item) => ({ ranking: item, supplier: byId.get(item.supplier_id)! }))

  const descendingScores = ordered
    .map(({ supplier }) => deterministicFitScore(supplier, query, bangladeshMode))
    .sort((a, b) => b - a)

  const discovery: DiscoveryItem[] = ordered.map(({ ranking, supplier }, index) => {
    const fit = descendingScores[index] ?? deterministicFitScore(supplier, query, bangladeshMode)
    return {
      supplier_id: supplier.id,
      rank: index + 1,
      fit_score: fit,
      explanation: ranking.fit_summary,
      key_factors: rankingKeyFactors(supplier, ranking.watchout),
      confidence: discoveryConfidence(fit),
      confidence_reason: "AI-ranked using the buyer brief, then grounded by backend supplier metrics.",
    }
  })

  const orderedSuppliers = ordered.map((item) => item.supplier)
  return {
    discovery,
    risk: buildRiskItems(orderedSuppliers, bangladeshMode, "ai"),
    comparison: buildComparisonItems(orderedSuppliers, "ai"),
  }
}

function rollupConfidence(items: { confidence: "high" | "medium" | "low" }[]): "high" | "medium" | "low" {
  const total = items.length || 1
  const highRatio = items.filter((item) => item.confidence === "high").length / total
  const lowRatio = items.filter((item) => item.confidence === "low").length / total
  if (highRatio >= 0.7) return "high"
  if (lowRatio >= 0.5) return "low"
  return "medium"
}

function deriveResultQuality(args: {
  llmMode: "ai" | "deterministic_fallback"
  supplierCount: number
  confidence: "high" | "medium" | "low"
}): ApiMeta["result_quality"] {
  if (args.supplierCount <= 2) return "limited_supplier_pool"
  if (args.llmMode === "deterministic_fallback") return "rules_based_fallback"
  if (args.confidence === "high") return "high_confidence"
  return "standard"
}

async function callLiteRankingAgent(
  query: string,
  suppliers: Supplier[],
  bangladeshMode: boolean,
  buyerFilters: string,
  providerOverride: AiGenerationProvider,
): Promise<{ output: LiteRankingResponse; provider: Exclude<AiGenerationProvider, "none"> }> {
  return generateStructuredObject({
    system: [
      "You are Sourcery's sourcing ranking analyst.",
      "Return valid JSON only.",
      "Rank every supplier exactly once and keep summaries concise.",
    ].join("\n"),
    prompt: buildLiteRankingPrompt(query, suppliers, bangladeshMode, buyerFilters),
    maxOutputTokens: 1800,
    schema: LiteRankingResponseSchema,
    jsonSchema: LITE_RANKING_JSON_SCHEMA,
    providerOverride,
  })
}

async function runAgentWithFallback(args: {
  suppliers: Supplier[]
  query: string
  bangladeshMode: boolean
  buyerFilters: string
  sourceProvider: AiGenerationProvider
}): Promise<{ output: CombinedAgentOutput; mode: "ai" | "deterministic_fallback"; provider: AiGenerationProvider }> {
  const fallback = buildDeterministicOutput(args.suppliers, args.query, args.bangladeshMode)
  if (args.sourceProvider === "none") {
    return { output: fallback, mode: "deterministic_fallback", provider: "none" }
  }

  try {
    const ranked = await callLiteRankingAgent(args.query, args.suppliers, args.bangladeshMode, args.buyerFilters, args.sourceProvider)
    return {
      output: buildAiGuidedOutput(ranked.output, args.suppliers, args.query, args.bangladeshMode),
      mode: "ai",
      provider: ranked.provider,
    }
  } catch (err) {
    console.log("[sourcery] AI agent fallback:", (err as Error).message)
    return { output: fallback, mode: "deterministic_fallback", provider: "none" }
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
  const confidence = rollupConfidence(allConfidences)
  const countryDiversity = new Set(args.suppliers.map((supplier) => supplier.country)).size

  return {
    suppliers: args.suppliers,
    discovery: args.output.discovery,
    risk: args.output.risk,
    comparison: args.output.comparison,
    meta: {
      request_id: args.requestId,
      bangladeshMode: args.bangladeshMode,
      cached: args.cached,
      confidence,
      country_diversity: countryDiversity,
      query: args.query,
      retrieval_mode: args.retrievalMode,
      llm_mode: args.llmMode,
      ai_provider: args.aiProvider,
      result_mode: args.llmMode === "ai" ? "ai_ranked" : "rules_ranked",
      result_quality: deriveResultQuality({
        llmMode: args.llmMode,
        supplierCount: args.suppliers.length,
        confidence,
      }),
      ranking_version: RANKING_VERSION,
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
  if (UNSUPPORTED_DEMO_QUERY.test(args.query) || !detectedCategory || !isSupportedProduct(detectedCategory, args.product)) {
    throw new ApiRequestError(
      "BAD_REQUEST",
      `This demo workspace is locked to supported product paths. Please choose one category/product chip first. Supported paths: ${supportedProductHelpText()}`,
      400,
    )
  }

  const requestId = args.requestId ?? randomUUID()
  const topK = args.topK ?? 10
  const configuredProvider = getSourceAiProvider()
  const sourceProvider =
    (configuredProvider === "pollinations" || configuredProvider === "gemini" || configuredProvider === "groq") && !isFreeSourceAiEnabled()
      ? "none"
      : configuredProvider

  const cacheKey = buildCacheKey({
    version: `source-${RANKING_VERSION}`,
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
    throw new ApiRequestError(
      "NOT_FOUND",
      "Sorry, there are no available suppliers for this product and filter combination at the moment.",
      404,
    )
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

  const agent = await runAgentWithFallback({
    suppliers,
    query: args.query,
    bangladeshMode: args.bangladeshMode,
    buyerFilters,
    sourceProvider,
  })

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

  await setCached(cacheKey, result)
  await recordSourceEvent(result)
  return result
}

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12)
}
