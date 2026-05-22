import { BargainRequestSchema } from "@/lib/schemas"
import type { z } from "zod"
import { getBargainAiProvider } from "@/lib/env"
import { generatePlainText } from "@/lib/ai/generation"
import { BARGAIN_RATE_LIMIT, checkRateLimit } from "@/lib/backend/rate-limit"
import { errorJson, getClientIp, handleApiError, okJson, parseJson, readJson } from "@/lib/backend/http"

export const runtime = "nodejs"
export const maxDuration = 30

type BargainInput = z.infer<typeof BargainRequestSchema>

function deterministicBanglaFallback(input: BargainInput): string {
  const productDescription = input.productDescription ?? "consumer products"
  const orderQuantity = input.orderQuantity ?? 300
  return [
    `আসসালামু আলাইকুম, ${input.supplier.name} টিম,`,
    `আমরা ${input.supplier.country} থেকে ${productDescription} সোর্সিং করতে আগ্রহী।`,
    `আপনাদের ইউনিট মূল্য $${input.supplier.unit_price_usd}, MOQ ${input.supplier.moq} ইউনিট এবং লিড টাইম ${input.supplier.lead_time_days} দিন দেখেছি।`,
    `${orderQuantity} ইউনিট অর্ডারের জন্য সেরা মূল্য, স্যাম্পল সুবিধা এবং উৎপাদন সময় জানালে উপকৃত হব।`,
  ].join(" ")
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rate = checkRateLimit(`bargain:${ip}`, BARGAIN_RATE_LIMIT)
    if (!rate.allowed) {
      return errorJson("RATE_LIMITED", "Too many bargain requests. Please wait before trying again.", 429, {
        retry_after_seconds: rate.retryAfter,
      })
    }

    const rawInput = parseJson(BargainRequestSchema, await readJson(req))
    const input: BargainInput = {
      ...rawInput,
      productDescription: rawInput.productDescription ?? "consumer products",
      orderQuantity: rawInput.orderQuantity ?? 300,
    }
    const fallback = deterministicBanglaFallback(input)
    const provider = getBargainAiProvider()

    if (provider === "none") {
      return okJson({ message: fallback, meta: { llm_mode: "deterministic_fallback", ai_provider: "none" } })
    }

    const prompt = [
      "Generate a professional but friendly supplier outreach message in Bengali script.",
      `Buyer is interested in ${input.productDescription ?? "consumer products"} from ${input.supplier.name} in ${input.supplier.country}.`,
      `Reference unit price $${input.supplier.unit_price_usd}, MOQ ${input.supplier.moq} units, lead time ${input.supplier.lead_time_days} days.`,
      `The buyer is considering ${input.orderQuantity ?? 300} units.`,
      "Ask politely about price flexibility, sample availability, and production timeline.",
      "Tone: respectful and business-appropriate for South Asian B2B communication.",
      "Return only the message body. Maximum 80 words.",
    ].join("\n")

    try {
      const result = await generatePlainText({
        prompt,
        maxOutputTokens: 220,
        providerOverride: provider,
      })
      const message = result.text.trim()
      return okJson({
        message: message || fallback,
        meta: {
          llm_mode: message ? "ai" : "deterministic_fallback",
          ai_provider: message ? result.provider : provider,
        },
      })
    } catch (err) {
      console.log("[sourcery] bargain fallback:", (err as Error).message)
      return okJson({ message: fallback, meta: { llm_mode: "deterministic_fallback", ai_provider: provider } })
    }
  } catch (err) {
    return handleApiError(err, "Bargain agent failed.")
  }
}
