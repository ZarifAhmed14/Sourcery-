// Deterministic profit math — runs entirely client-side, zero AI cost.
// Used by ProfitBreakdownPanel and consumed by SimulationPanel.

import type { Supplier } from "@/lib/types"

// User-controlled inputs shared across all suppliers in the comparison view.
export type ProfitInputs = {
  // Buyer's selling price per unit in USD (required, > 0).
  selling_price: number
  // Per-unit shipping cost (freight + handling), USD.
  shipping_cost_per_unit: number
  // Customs/duty rate as a percentage of unit price (0–100).
  customs_rate: number
  // Per-unit packaging cost, USD.
  packaging_cost_per_unit: number
  // Order quantity in units used for total profit calculations.
  order_quantity: number
}

// Sensible defaults — enough to render the panel before the user touches anything.
export const DEFAULT_PROFIT_INPUTS: ProfitInputs = {
  selling_price: 24,
  shipping_cost_per_unit: 1.5,
  customs_rate: 5,
  packaging_cost_per_unit: 0.8,
  order_quantity: 300,
}

// Per-supplier output of the profit calculation.
export type ProfitResult = {
  // The supplier this result is for.
  supplier_id: string
  // Total landed cost per unit (price + shipping + customs + packaging).
  landed_cost: number
  // Gross margin as a fraction in [-Infinity, 1] (negative = loss).
  gross_margin: number
  // Margin discounted by supplier risk score (0..1 of unit profit).
  risk_adjusted_profit: number
  // Total profit across the full order quantity.
  total_profit: number
  // Total cost across the full order quantity.
  total_cost: number
  // Optional badge — only the winner of each category gets one.
  recommended_type: "max_profit" | "lowest_risk" | "balanced" | null
  // 1-indexed rank by risk-adjusted profit (1 = highest).
  profit_rank: number
}

// Compute the per-supplier profit metrics — pure function, no side effects.
export function computeProfit(supplier: Supplier, inputs: ProfitInputs): Omit<ProfitResult, "recommended_type" | "profit_rank"> {
  // Customs is calculated as a percentage of the unit price (typical import duty model).
  const customs_cost_per_unit = supplier.unit_price_usd * (inputs.customs_rate / 100)
  // Landed cost = sum of all per-unit costs.
  const landed_cost = supplier.unit_price_usd + inputs.shipping_cost_per_unit + customs_cost_per_unit + inputs.packaging_cost_per_unit
  // Gross margin as a fraction of selling price; can be negative if landed_cost > selling_price.
  const gross_margin = inputs.selling_price > 0 ? (inputs.selling_price - landed_cost) / inputs.selling_price : 0
  // Normalize the supplier's 0–100 risk score into a 0..1 discount factor.
  const risk_score_normalized = supplier.risk_score / 100
  // Apply the risk discount to the gross margin.
  const risk_adjusted_profit = gross_margin * (1 - risk_score_normalized)
  // Aggregate over the full order quantity.
  const total_profit = (inputs.selling_price - landed_cost) * inputs.order_quantity
  const total_cost = landed_cost * inputs.order_quantity
  // Return a partial — recommended_type and profit_rank are filled in by the ranker.
  return { supplier_id: supplier.id, landed_cost, gross_margin, risk_adjusted_profit, total_profit, total_cost }
}

// Rank suppliers and assign badges (max_profit / lowest_risk / balanced).
// Tie-break: lower MOQ wins.
export function rankProfit(suppliers: Supplier[], inputs: ProfitInputs): ProfitResult[] {
  // First pass — compute raw profit metrics for every supplier.
  const raw = suppliers.map((s) => ({ supplier: s, profit: computeProfit(s, inputs) }))

  // Find the winner of each category. We compare by the relevant metric, with MOQ as tie-breaker.
  // Max profit = highest risk_adjusted_profit.
  const maxProfitWinner = [...raw].sort((a, b) => {
    const d = b.profit.risk_adjusted_profit - a.profit.risk_adjusted_profit
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]
  // Lowest risk = lowest risk_score.
  const lowestRiskWinner = [...raw].sort((a, b) => {
    const d = a.supplier.risk_score - b.supplier.risk_score
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]
  // Balanced = weighted blend (60% margin, 40% safety).
  const balancedWinner = [...raw].sort((a, b) => {
    const aScore = a.profit.risk_adjusted_profit * 0.6 + (1 - a.supplier.risk_score / 100) * 0.4
    const bScore = b.profit.risk_adjusted_profit * 0.6 + (1 - b.supplier.risk_score / 100) * 0.4
    const d = bScore - aScore
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]

  // Build the rank map — sorted by risk-adjusted profit descending, then by MOQ ascending.
  const ranked = [...raw].sort((a, b) => {
    const d = b.profit.risk_adjusted_profit - a.profit.risk_adjusted_profit
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })
  // Assemble final ProfitResult objects with rank + badge.
  return ranked.map((entry, idx) => {
    // Determine which (if any) badge applies. Same supplier may win multiple — pick max_profit > lowest_risk > balanced.
    let recommended_type: ProfitResult["recommended_type"] = null
    if (entry.supplier.id === maxProfitWinner.supplier.id) recommended_type = "max_profit"
    else if (entry.supplier.id === lowestRiskWinner.supplier.id) recommended_type = "lowest_risk"
    else if (entry.supplier.id === balancedWinner.supplier.id) recommended_type = "balanced"
    return { ...entry.profit, recommended_type, profit_rank: idx + 1 }
  })
}

// Helper to format USD currency strings consistently across the UI.
export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
}

// Helper to format a 0..1 fraction as a signed percentage string.
export function formatPct(fraction: number): string {
  const pct = fraction * 100
  const sign = pct >= 0 ? "" : ""
  return `${sign}${pct.toFixed(1)}%`
}
