import { errorJson, handleApiError, okJson } from "@/lib/backend/http"
import { hasServiceSupabaseEnv } from "@/lib/env"
import { findDemoSupplier } from "@/lib/sourcery/demo-suppliers"
import { getAdminClient } from "@/lib/supabase/admin"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const demo = findDemoSupplier(id)

    if (demo) {
      return okJson({ supplier: demo, source: "demo" })
    }

    if (!hasServiceSupabaseEnv()) {
      return errorJson("NOT_FOUND", "Supplier not found.", 404)
    }

    const supabase = getAdminClient()
    const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return errorJson("NOT_FOUND", "Supplier not found.", 404)
    return okJson({ supplier: normalizeSupplier(data), source: "supabase" })
  } catch (err) {
    return handleApiError(err, "Supplier lookup failed.")
  }
}
