// Deterministic What-If Simulation math — pure functions, no AI cost.
// Re-uses Supplier + ProfitInputs and produces simulated per-supplier results.

import type { Supplier } from "@/lib/types"
import type { ProfitInputs, ProfitResult } from "@/lib/profit"
import { rankProfit } from "@/lib/profit"

// User-controlled simulation deltas applied on top of base profit inputs.
export type SimulationDeltas = {
  // Shipping cost change in percent (-50 to +200).
  shipping_cost_delta_pct: number
  // Lead time change in days (-30 to +90). Affects display ordering only, not profit math.
  lead_time_delta_days: number
  // Order quantity override. Zero is valid and produces zero total profit/cost.
  order_quantity: number
  // New selling price (replaces ProfitInputs.selling_price).
  selling_price: number
  // Supplier unit-price change in percent (-30 to +100).
  supplier_price_delta_pct: number
}

// Default simulation = no deltas applied (mirrors current state).
export function defaultDeltas(base: ProfitInputs): SimulationDeltas {
  return {
    shipping_cost_delta_pct: 0,
    lead_time_delta_days: 0,
    order_quantity: base.order_quantity,
    selling_price: base.selling_price,
    supplier_price_delta_pct: 0,
  }
}

// Apply deltas to a supplier's base price + lead time, returning a "simulated" Supplier.
// Other fields (risk_score, on_time_rate, etc.) are unchanged.
export function applyDeltas(s: Supplier, d: SimulationDeltas): Supplier {
  return {
    ...s,
    unit_price_usd: Math.max(0, s.unit_price_usd * (1 + d.supplier_price_delta_pct / 100)),
    lead_time_days: Math.max(1, s.lead_time_days + d.lead_time_delta_days),
  }
}

// Run the simulation: re-rank suppliers under the simulated conditions.
// Returns both the simulated ProfitResult[] AND the simulated Supplier[] (for lead-time display).
export function runSimulation(
  suppliers: Supplier[],
  base: ProfitInputs,
  deltas: SimulationDeltas,
): { simSuppliers: Supplier[]; simResults: ProfitResult[]; simInputs: ProfitInputs } {
  // Build the simulated inputs by applying selling_price + shipping + qty deltas.
  const simInputs: ProfitInputs = {
    ...base,
    selling_price: deltas.selling_price,
    shipping_cost_per_unit: Math.max(0, base.shipping_cost_per_unit * (1 + deltas.shipping_cost_delta_pct / 100)),
    order_quantity: deltas.order_quantity,
  }
  // Build simulated supplier list with adjusted price + lead time.
  const simSuppliers = suppliers.map((s) => applyDeltas(s, deltas))
  // Re-rank with the simulated inputs.
  const simResults = rankProfit(simSuppliers, simInputs)
  return { simSuppliers, simResults, simInputs }
}
