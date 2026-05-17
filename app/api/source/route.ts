import { randomUUID } from "node:crypto"
import { SourceRequestSchema } from "@/lib/schemas"
import { ApiRequestError, errorJson, getClientIp, handleApiError, okJson, parseJson, readJson } from "@/lib/backend/http"
import { SOURCE_RATE_LIMIT, checkRateLimit } from "@/lib/backend/rate-limit"
import { runSourcingOrchestrator } from "@/lib/sourcery/orchestrator"

export const runtime = "nodejs"
export const maxDuration = 60

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
    const result = await runSourcingOrchestrator({
      query: input.query,
      bangladeshMode: false,
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
