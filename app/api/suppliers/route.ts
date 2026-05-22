import { SupplierListRequestSchema } from "@/lib/schemas"
import { handleApiError, okJson, parseJson } from "@/lib/backend/http"
import { hasServiceSupabaseEnv } from "@/lib/env"
import { listDemoSuppliers } from "@/lib/sourcery/demo-suppliers"
import { getAdminClient } from "@/lib/supabase/admin"
import { normalizeSupplier, supplierSearchHaystack } from "@/lib/sourcery/supplier-normalizer"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const input = parseJson(SupplierListRequestSchema, Object.fromEntries(url.searchParams.entries()))
    const limit = input.limit ?? 50
    const offset = input.offset ?? 0
    const demo = listDemoSuppliers({ ...input, limit, offset })

    if (demo.count > 0) {
      return okJson({ ...demo, limit, offset, source: "demo" })
    }

    if (!hasServiceSupabaseEnv()) {
      return okJson({ ...demo, limit, offset, source: "demo" })
    }

    const supabase = getAdminClient()
    let query = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .order("rating", { ascending: false })

    if (input.country) query = query.ilike("country", `%${input.country}%`)
    if (input.region) query = query.eq("region", input.region)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    let suppliers = (data ?? []).map((row) => normalizeSupplier(row))

    if (input.category) suppliers = suppliers.filter((supplier) => supplier.category === input.category)
    if (input.q) {
      const tokens = input.q
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3)
        .slice(0, 8)
      if (tokens.length > 0) {
        const ranked = suppliers
          .map((supplier) => ({
            supplier,
            score: tokens.filter((token) => supplierSearchHaystack(supplier).includes(token)).length,
          }))
          .sort((a, b) => b.score - a.score || b.supplier.quality_rating - a.supplier.quality_rating)
          .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / tokens.length }))
        const matched = ranked.filter((supplier) => (supplier.retrieval_score ?? 0) > 0)
        suppliers = matched.length > 0 ? matched : ranked
      }
    }

    return okJson({
      suppliers: suppliers.slice(offset, offset + limit),
      count: input.q || input.category ? suppliers.length : count ?? suppliers.length,
      limit,
      offset,
      source: "supabase",
    })
  } catch (err) {
    return handleApiError(err, "Supplier list failed.")
  }
}
