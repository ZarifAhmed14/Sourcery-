import { randomUUID } from "node:crypto"
import { SourceRequestSchema } from "@/lib/schemas"
import { ApiRequestError, errorJson, getClientIp, handleApiError, okJson, parseJson, readJson } from "@/lib/backend/http"
import { SOURCE_RATE_LIMIT, checkRateLimit } from "@/lib/backend/rate-limit"
import { runSourcingOrchestrator } from "@/lib/sourcery/orchestrator"
import { productDisplayName } from "@/lib/sourcery/product-variants"

export const runtime = "nodejs"
export const maxDuration = 60

function buildSourceQuery(input: {
  query?: string
  brief?: string
  category?: string | null
  product?: string | null
  country?: string | null
  region?: string | null
  targetUnitPriceMin?: number | null
  targetUnitPriceMax?: number | null
  orderQuantity?: number | null
}) {
  const explicit = [input.brief, input.query].map((value) => value?.trim()).find(Boolean)
  if (explicit) return explicit

  const parts = [
    input.product ? `${productDisplayName(input.product)} suppliers` : null,
    input.category ? `category ${input.category}` : null,
    input.country ? `country ${input.country}` : null,
    input.region ? `region ${input.region}` : null,
    typeof input.targetUnitPriceMin === "number" ? `min unit price $${input.targetUnitPriceMin}` : null,
    typeof input.targetUnitPriceMax === "number" ? `max unit price $${input.targetUnitPriceMax}` : null,
    typeof input.orderQuantity === "number" ? `order quantity ${input.orderQuantity} units` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : "supplier search"
}

export async function POST(req: Request) {
  const requestId = randomUUID()
  try {
    const ip = getClientIp(req)
    const rate = checkRateLimit(`source:${ip}`, SOURCE_RATE_LIMIT)
    if (!rate.allowed) {
      return errorJson("RATE_LIMITED", "Too many sourcing runs. Please wait before trying again.", 429, {
        retry_after_seconds: rate.retryAfter,
      })
    }

    const input = parseJson(SourceRequestSchema, await readJson(req))
    const query = buildSourceQuery(input)
    const result = await runSourcingOrchestrator({
      query,
      bangladeshMode: input.bangladeshMode ?? false,
      topK: input.topK ?? 10,
      category: input.category,
      product: input.product,
      country: input.country,
      region: input.region,
      targetUnitPriceMin: input.targetUnitPriceMin,
      targetUnitPriceMax: input.targetUnitPriceMax,
      orderQuantity: input.orderQuantity,
      maxMOQ: input.maxMOQ,
      maxLeadTimeDays: input.maxLeadTimeDays,
      minQualityRating: input.minQualityRating,
      requestId,
    })

    return okJson(result)
  } catch (err) {
    if (err instanceof ApiRequestError) return handleApiError(err)
    return handleApiError(err, "Sourcing run failed.")
  }
}
