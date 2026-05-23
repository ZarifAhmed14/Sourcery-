import { createHash, randomUUID } from "node:crypto"
import { z } from "zod"
import { generateStructuredObject, type AiGenerationProvider } from "@/lib/ai/generation"
import { ApiRequestError } from "@/lib/backend/http"
import { getSourceAiProvider, isFreeSourceAiEnabled } from "@/lib/env"
import { buildCacheKey, getCached, setCached } from "@/lib/sourcery/cache"
import { detectCategory, retrieveCandidates, rescoreForBangladeshMode, type RetrievalMode } from "@/lib/sourcery/retrieval"
import { inferSupportedProduct, isSupportedProduct, supportedProductHelpText } from "@/lib/sourcery/supported-products"
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

const RANKING_VERSION = "v4-audit-hardening-4"

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
const BAD_EXPLANATION_START = /^this supplier was selected\b/i

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
    "fit_summary: Write one to two sentences explaining why this supplier ranks here for this buyer's search. Be specific to the supplier's actual data - mention their MOQ, lead time, price, or certifications only if they are genuinely relevant to the search. Do not start with 'This supplier was selected because'. Do not copy the best_for field. Write like a procurement advisor giving a quick honest take, not a system generating a report. If there is a tradeoff the buyer should know about, mention it plainly.",
    "watchout: one short sentence on the main caution.",
    "Keep fit_summary concise: 1-2 sentences, maximum 220 characters.",
    "Use varied language across supplier cards.",
    `BUYER_BRIEF:\n${query}`,
    bangladeshMode ? BANGLADESH_MODE_PROMPT : "",
    buyerFilters,
    `CANDIDATE_SUPPLIERS:\n${JSON.stringify(candidates.map(leanSupplier), null, 0)}`,
    `JSON_RESPONSE_SHAPE:\n{
  "rankings": [
    {
      "supplier_id": "<id>",
      "rank": 1,
      "fit_summary": "Beximco's MOQ suits mid-size brands; pricing is solid, but plan around the longer lead time for seasonal orders.",
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

function supplierBestForLabel(supplier: Supplier): string {
  if (supplier.moq <= 400) return "small test orders"
  if (supplier.lead_time_days <= 22) return "fast restocks"
  if (supplier.unit_price_usd <= 2.5) return "margin-first buying"
  if ((supplier.rating ?? supplier.quality_rating) >= 4.6) return "premium quality"
  if (supplier.bgmea_certified) return "compliance-sensitive sourcing"
  if (supplier.country === "Bangladesh") return "local Bangladesh sourcing"
  return "balanced sourcing"
}

function trimToSentences(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ")
    .slice(0, 220)
    .trim()
}

function hasBadExplanation(explanation: string, supplier: Supplier): boolean {
  const normalized = explanation.trim().toLowerCase()
  const bestFor = supplierBestForLabel(supplier).toLowerCase()
  return !normalized || BAD_EXPLANATION_START.test(normalized) || normalized.includes(bestFor)
}

function buildBuyerExplanation(supplier: Supplier, query: string, rank?: number): string {
  const product = supplier.products?.[0] ?? supplier.subcategory
  const queryMentionsSpeed = /\b(fast|rush|quick|urgent|restock|short lead|lead under|under \d+ days)\b/i.test(query)
  const queryMentionsPrice = /\b(price|cheap|budget|margin|low cost|unit price|target)\b/i.test(query)
  const queryMentionsCompliance = /\b(cert|certified|compliance|bgmea|bsci|oeko|sedex|audit|gots)\b/i.test(query)
  const queryMentionsBangladesh = /\b(bangladesh|bd|dhaka|local|south asia)\b/i.test(query)
  const isDenimSearch = /\b(denim|jeans)\b/i.test(query)

  if (queryMentionsSpeed && supplier.lead_time_days <= 35) {
    return `${supplier.name} is useful for ${product} when timing matters; the ${supplier.lead_time_days}-day lead time keeps the order moving without an unusually long production window.`
  }
  if (queryMentionsSpeed && supplier.lead_time_days > 45) {
    if (rank === 2) {
      return `${supplier.name} is worth comparing on ${product} if the buyer can trade speed for factory fit. The ${supplier.lead_time_days}-day lead needs calendar room before launch.`
    }
    if (rank === 3) {
      return `${supplier.name} stays in the shortlist for ${product} because the profile is relevant, but it is not a rush-order pick with a ${supplier.lead_time_days}-day lead.`
    }
    if (rank && rank > 3) {
      return `${supplier.name} gives the buyer another credible ${product} option, though the ${supplier.lead_time_days}-day lead means it belongs in planned production rather than quick restock.`
    }
    return `${supplier.name} has relevant ${product} capability, but the ${supplier.lead_time_days}-day lead time is the tradeoff. Use it for planned orders, not urgent replenishment.`
  }
  if (supplier.lead_time_days <= 28) {
    return `${supplier.name} stands out on speed for ${product}: a ${supplier.lead_time_days}-day lead time gives the buyer more room for sampling, inspection, and restock planning.`
  }
  if (queryMentionsCompliance && supplier.certifications.length > 0) {
    return `${supplier.name} brings useful certification coverage (${supplier.certifications.slice(0, 2).join(", ")}), which helps when the buyer needs a cleaner compliance conversation.`
  }
  if (queryMentionsPrice || supplier.unit_price_usd <= 3) {
    return `${supplier.name} gives the buyer more pricing room at $${supplier.unit_price_usd}/unit, leaving space for freight, packaging, and resale margin.`
  }
  if (supplier.moq <= 600) {
    return `${supplier.name}'s MOQ of ${supplier.moq.toLocaleString()} makes it easier to test ${product} before committing to a larger production run.`
  }
  if (isDenimSearch && supplier.moq >= 3000 && rank === 1) {
    return `${supplier.name}'s MOQ suits mid-size denim programs; the main tradeoff is planning around lead time, so it fits seasonal orders better than rush replenishment.`
  }
  if (isDenimSearch && supplier.unit_price_usd <= 7.3) {
    return `${supplier.name} comes in cheaper per unit than many Bangladesh denim options. Worth comparing side by side if the buyer can stay flexible on lead time.`
  }
  if (isDenimSearch && supplier.lead_time_days <= 55) {
    return `${supplier.name} has one of the shorter production windows in this denim set, which helps if the buyer wants a large order without waiting as long.`
  }
  if (isDenimSearch && supplier.risk_score <= 15) {
    return `${supplier.name} keeps risk comparatively low for a larger denim order; confirm wash approvals and inspection steps before scaling.`
  }
  if (isDenimSearch && supplier.certifications.some((cert) => /sedex|bsci|oeko/i.test(cert))) {
    return `${supplier.name} brings useful factory-readiness signals for denim sourcing; ask for current audit and fabric documentation before quoting.`
  }
  if (supplier.moq >= 3000) {
    return `${supplier.name}'s MOQ of ${supplier.moq.toLocaleString()} suits buyers with proven demand; pair it with sample and wash approval before placing a seasonal order.`
  }
  if (supplier.quality_rating >= 4.5 || (supplier.rating ?? 0) >= 4.5) {
    return `${supplier.name} is strongest when product consistency matters, with quality signals that make it worth comparing before choosing the cheapest quote.`
  }
  if (queryMentionsBangladesh && supplier.country === "Bangladesh") {
    return `${supplier.name} keeps the search local in Bangladesh, which should make sampling, follow-up, and supplier coordination easier for this brief.`
  }
  if (supplier.risk_score <= 30) {
    return `${supplier.name} has fewer operational warning signs than many alternatives, so it is a practical profile to review early in the shortlist.`
  }

  return `${supplier.name} gives the buyer a workable comparison point for ${product}, especially if they want to balance supplier fit before deciding who to contact.`
}

function safeSupplierExplanation(supplier: Supplier, query: string, explanation?: string | null, rank?: number): string {
  const cleaned = trimToSentences(explanation ?? "")
  if (!hasBadExplanation(cleaned, supplier)) return cleaned
  return buildBuyerExplanation(supplier, query, rank)
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
    explanation: buildBuyerExplanation(supplier, query, index + 1),
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
      explanation: safeSupplierExplanation(supplier, query, ranking.fit_summary, index + 1),
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
  relaxed: boolean
}): ApiMeta["result_quality"] {
  if (args.relaxed) return "standard"
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
  const system = [
    "You are Sourcery's sourcing ranking analyst.",
    "Return valid JSON only.",
    "Rank every supplier exactly once and keep summaries concise.",
  ].join("\n")
  const prompt = buildLiteRankingPrompt(query, suppliers, bangladeshMode, buyerFilters)
  const result = await generateStructuredObject({
    system,
    prompt,
    maxOutputTokens: 1800,
    schema: LiteRankingResponseSchema,
    jsonSchema: LITE_RANKING_JSON_SCHEMA,
    providerOverride,
  })

  if (!hasInvalidGeneratedExplanations(result.output, suppliers)) return result

  return generateStructuredObject({
    system: [
      system,
      "Your previous supplier explanations copied a label or used banned template wording.",
      "Rewrite fit_summary values as procurement-advisor advice. Do not start with 'This supplier was selected because'. Do not copy any best_for-style label.",
      "Return valid JSON only.",
    ].join("\n"),
    prompt: [
      prompt,
      "Regenerate the full rankings object once. Keep the same supplier IDs and rank every supplier exactly once.",
    ].join("\n\n"),
    maxOutputTokens: 1800,
    schema: LiteRankingResponseSchema,
    jsonSchema: LITE_RANKING_JSON_SCHEMA,
    providerOverride,
  })
}

function hasInvalidGeneratedExplanations(rankings: LiteRankingResponse, suppliers: Supplier[]): boolean {
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]))
  return rankings.rankings.some((ranking) => {
    const supplier = byId.get(ranking.supplier_id)
    return !supplier || hasBadExplanation(ranking.fit_summary, supplier)
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
  } catch {
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
  relaxedFilters: boolean
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
        relaxed: args.relaxedFilters,
      }),
      relaxed_filters: args.relaxedFilters,
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
  const effectiveProduct = detectedCategory ? args.product ?? inferSupportedProduct(detectedCategory, args.query) : args.product
  if (UNSUPPORTED_DEMO_QUERY.test(args.query) || !detectedCategory || !isSupportedProduct(detectedCategory, effectiveProduct)) {
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
    product: effectiveProduct,
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
    product: effectiveProduct,
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
    relaxedFilters: retrieval.relaxed,
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
