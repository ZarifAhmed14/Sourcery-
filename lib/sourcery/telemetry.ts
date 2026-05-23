import { createHash } from "node:crypto"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"

export async function recordSourceEvent(result: SourcingResult): Promise<void> {
  if (!isAdminSupabaseConfigured()) return

  try {
    const supabase = getAdminClient()
    const { error } = await supabase.from("source_events").insert({
      request_id: result.meta.request_id,
      query_hash: createHash("sha256").update(result.meta.query.toLowerCase().trim()).digest("hex"),
      bangladesh_mode: result.meta.bangladeshMode,
      retrieval_mode: result.meta.retrieval_mode,
      llm_mode: result.meta.llm_mode,
      ai_provider: result.meta.ai_provider,
      result_count: result.suppliers.length,
      country_diversity: result.meta.country_diversity,
      elapsed_ms: result.meta.elapsed_ms,
    })
    void error
  } catch {
  }
}
