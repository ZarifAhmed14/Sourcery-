// Bargain Copilot endpoint — generates a Bangla supplier outreach message.
// Uses gpt-5-mini with a tight 200-token cap for cost discipline (~$0.001 per call).

import { NextResponse } from "next/server"
import { generateText } from "ai"

// Force Node.js runtime — required for AI SDK v6.
export const runtime = "nodejs"
// 30s budget is more than enough for a 80-word generation.
export const maxDuration = 30

// POST /api/bargain
export async function POST(req: Request) {
  try {
    // Parse + minimally validate the request body.
    const body = await req.json().catch(() => ({}))
    const supplier = body?.supplier as { name?: string; country?: string; unit_price_usd?: number; moq?: number; lead_time_days?: number } | undefined
    const productDescription = typeof body?.productDescription === "string" ? body.productDescription.slice(0, 400) : ""
    const orderQuantity = Number.isFinite(body?.orderQuantity) ? Number(body.orderQuantity) : 300
    if (!supplier?.name || !supplier?.country) {
      return NextResponse.json({ error: "Missing supplier name/country." }, { status: 400 })
    }

    // Compose the prompt — concrete numeric grounding so the message references real data.
    const prompt = [
      `Generate a polite, business-appropriate supplier outreach message in BANGLA (Bengali script).`,
      `Buyer is interested in ${productDescription || "consumer products"} from ${supplier.name} in ${supplier.country}.`,
      `Reference: unit price $${supplier.unit_price_usd ?? "—"}, MOQ ${supplier.moq ?? "—"} units, lead time ${supplier.lead_time_days ?? "—"} days.`,
      `The buyer is considering an order of ${orderQuantity} units.`,
      `Politely ask if there is flexibility on price, request a sample, and ask about timeline.`,
      `Tone: respectful, professional, appropriate for South Asian B2B norms.`,
      `Output: ONLY the Bangla message body. Maximum ~80 words. No preamble, no English translation.`,
    ].join("\n")

    // gpt-5-mini is the right tool here — fast, cheap, multilingual.
    const result = await generateText({
      model: "openai/gpt-5-mini",
      prompt,
      // Tight ceiling — 80 Bangla words is well under 200 tokens.
      maxOutputTokens: 220,
    })

    // Trim and return.
    const message = (result.text ?? "").trim()
    if (!message) return NextResponse.json({ error: "Bargain agent returned an empty message." }, { status: 502 })
    return NextResponse.json({ message })
  } catch (err) {
    console.log("[v0] /api/bargain error:", (err as Error).message)
    return NextResponse.json({ error: (err as Error).message ?? "Bargain agent failed." }, { status: 500 })
  }
}
