// Server actions for Sourcery — persist sourcing runs and sign the user out.
// Server actions run only on the server, so the Supabase service role / cookies stay private.
"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"

// Persist a completed sourcing run for the currently signed-in user.
// Fire-and-forget from the client — silently no-ops if the user is not authenticated.
export async function saveSearchAction(payload: {
  query: string
  bangladeshMode: boolean
  result: SourcingResult
}): Promise<{ ok: boolean; reason?: string }> {
  // Server-side Supabase client; reads the request cookies automatically.
  const supabase = await createClient()
  // Determine whether someone is signed in. We don't error if not — we just skip.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: "not_authenticated" }

  // Insert the row. RLS policy "saved_searches_insert_own" enforces user_id = auth.uid().
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    query: payload.query,
    bangladesh_mode: payload.bangladeshMode,
    // The full agent output (suppliers + discovery + risk + comparison + explainability) lives in jsonb.
    results: payload.result,
    metadata: {
      // Number of suppliers returned — used by the dashboard list to show "12 suppliers".
      result_count: payload.result.suppliers.length,
      // Aggregate confidence rollup — surfaced as a pill on dashboard rows.
      confidence: payload.result.meta.confidence,
      // Country diversity check — useful for evals and future analytics.
      country_diversity: payload.result.meta.country_diversity,
      // Whether this run was served from the AI cache (telemetry only).
      cached: payload.result.meta.cached,
    },
  })

  if (error) {
    // We log but never throw — saving is best-effort and shouldn't break the UX.
    console.log("[v0] saveSearchAction insert error:", error.message)
    return { ok: false, reason: error.message }
  }
  return { ok: true }
}

// Sign the current user out and bounce them back to the landing page.
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
