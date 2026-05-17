import { SimulationRequestSchema } from "@/lib/schemas"
import { handleApiError, okJson, parseJson, readJson } from "@/lib/backend/http"
import { runSimulation } from "@/lib/simulate"
import type { Supplier } from "@/lib/types"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const input = parseJson(SimulationRequestSchema, await readJson(req))
    const suppliers = input.suppliers.map((supplier) => ({
      ...supplier,
      certifications: supplier.certifications ?? [],
      bgmea_certified: supplier.bgmea_certified ?? false,
    })) as Supplier[]
    const baseInputs = {
      selling_price: input.baseInputs.selling_price,
      shipping_cost_per_unit: input.baseInputs.shipping_cost_per_unit ?? 1.5,
      customs_rate: input.baseInputs.customs_rate ?? 5,
      packaging_cost_per_unit: input.baseInputs.packaging_cost_per_unit ?? 0.8,
      order_quantity: input.baseInputs.order_quantity ?? 300,
    }
    const deltas = {
      shipping_cost_delta_pct: input.deltas.shipping_cost_delta_pct ?? 0,
      lead_time_delta_days: input.deltas.lead_time_delta_days ?? 0,
      order_quantity: input.deltas.order_quantity ?? baseInputs.order_quantity,
      selling_price: input.deltas.selling_price,
      supplier_price_delta_pct: input.deltas.supplier_price_delta_pct ?? 0,
    }
    const result = runSimulation(suppliers, baseInputs, deltas)
    return okJson(result)
  } catch (err) {
    return handleApiError(err, "Simulation failed.")
  }
}
