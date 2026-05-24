"use server"

import { redirect } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import type { SourcingResult } from "@/lib/sourcery/orchestrator"
import type { SupplierCategory } from "@/lib/types"

export async function saveSearchAction(payload: {
  query: string
  bangladeshMode: boolean
  result: SourcingResult
  category?: SupplierCategory
  product?: string
  type?: string | null
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "supabase_not_configured" }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, reason: "not_authenticated" }

  const canonical = await supabase.from("saved_searches").insert({
    user_id: user.id,
    query: payload.query,
    bangladesh_mode: payload.bangladeshMode,
    results: payload.result,
    metadata: {
      result_count: payload.result.suppliers.length,
      confidence: payload.result.meta.confidence,
      country_diversity: payload.result.meta.country_diversity,
      cached: payload.result.meta.cached,
      result_mode: payload.result.meta.result_mode,
      result_quality: payload.result.meta.result_quality,
      ranking_version: payload.result.meta.ranking_version,
      category: payload.category,
      product: payload.product,
      type: payload.type,
    },
  })

  if (!canonical.error) return { ok: true }

  const legacy = await supabase.from("saved_searches").insert({
    user_id: user.id,
    query: payload.query,
    filters: {
      bangladesh_mode: payload.bangladeshMode,
      category: payload.category ?? null,
      product: payload.product ?? null,
      type: payload.type ?? null,
    },
    result_supplier_ids: payload.result.suppliers.map((supplier) => supplier.id),
    results_snapshot: payload.result,
    notes: `Saved by Sourcery compatibility path. request_id=${payload.result.meta.request_id}`,
  })

  if (legacy.error) {
    return { ok: false, reason: legacy.error.message }
  }

  return { ok: true }
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/")
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
