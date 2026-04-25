// HTTP entry point for the sourcing orchestrator. Called from the chat UI on every query.
// Server-only — never expose AI Gateway calls or DB queries to the client.

import { NextResponse } from "next/server"
import { runSourcingOrchestrator } from "@/lib/sourcery/orchestrator"

// Force Node.js runtime — AI SDK 6 explicitly forbids edge runtime in API routes.
export const runtime = "nodejs"

// Allow longer execution since Opus + 3-agent orchestration can take 10–20s.
export const maxDuration = 60

// POST /api/source — body: { query: string, bangladeshMode?: boolean }
export async function POST(req: Request) {
  try {
    // Parse + validate the JSON body.
    const body = await req.json().catch(() => ({}))
    const query = typeof body?.query === "string" ? body.query.trim() : ""
    const bangladeshMode = body?.bangladeshMode === true
    if (query.length < 5) {
      return NextResponse.json({ error: "Query must be at least 5 characters." }, { status: 400 })
    }
    // Cap query length to limit token waste from absurd inputs.
    const safeQuery = query.slice(0, 800)

    // Run the orchestrator (cache-first; falls through to LLM on miss).
    const result = await runSourcingOrchestrator({ query: safeQuery, bangladeshMode })

    // Return the rich payload as JSON.
    return NextResponse.json(result)
  } catch (err) {
    // Log the full error server-side, but only return a safe message to the client.
    console.log("[v0] /api/source error:", (err as Error).message)
    return NextResponse.json({ error: (err as Error).message ?? "Sourcing run failed." }, { status: 500 })
  }
}
