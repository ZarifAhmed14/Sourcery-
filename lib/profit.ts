import type { Supplier } from "@/lib/types"

export type ProfitInputs = {
  selling_price: number
  shipping_cost_per_unit: number
  customs_rate: number
  packaging_cost_per_unit: number
  order_quantity: number
}

export const DEFAULT_PROFIT_INPUTS: ProfitInputs = {
  selling_price: 24,
  shipping_cost_per_unit: 1.5,
  customs_rate: 5,
  packaging_cost_per_unit: 0.8,
  order_quantity: 300,
}

export const PROFIT_FORMULAS = {
  landedCost: "unit price + shipping per unit + (unit price * customs rate / 100) + packaging cost",
  grossMarginPct: "((selling price - landed cost) / selling price) * 100",
  netProfit: "(selling price - landed cost) * order quantity",
  riskAdjustedMargin: "gross margin % * (1 - risk score / 100)",
} as const

export type ProfitResult = {
  supplier_id: string
  landed_cost: number
  gross_margin: number
  risk_adjusted_profit: number
  total_profit: number
  total_cost: number
  recommended_type: "max_profit" | "lowest_risk" | "balanced" | null
  profit_rank: number
}

export function calculateLandedCost(args: {
  unitPrice: number
  shippingPerUnit: number
  customsRate: number
  packagingCost: number
}): number {
  return args.unitPrice + args.shippingPerUnit + (args.unitPrice * args.customsRate) / 100 + args.packagingCost
}

export function calculateGrossMargin(args: { sellingPrice: number; landedCost: number }): number {
  return args.sellingPrice > 0 ? (args.sellingPrice - args.landedCost) / args.sellingPrice : 0
}

export function calculateNetProfit(args: { sellingPrice: number; landedCost: number; orderQuantity: number }): number {
  return (args.sellingPrice - args.landedCost) * args.orderQuantity
}

export function calculateRiskAdjustedMargin(args: { grossMargin: number; riskScore: number }): number {
  return args.grossMargin * (1 - args.riskScore / 100)
}

export function computeProfit(supplier: Supplier, inputs: ProfitInputs): Omit<ProfitResult, "recommended_type" | "profit_rank"> {
  const landed_cost = calculateLandedCost({
    unitPrice: supplier.unit_price_usd,
    shippingPerUnit: inputs.shipping_cost_per_unit,
    customsRate: inputs.customs_rate,
    packagingCost: inputs.packaging_cost_per_unit,
  })
  const gross_margin = calculateGrossMargin({ sellingPrice: inputs.selling_price, landedCost: landed_cost })
  const risk_adjusted_profit = calculateRiskAdjustedMargin({ grossMargin: gross_margin, riskScore: supplier.risk_score })
  const total_profit = calculateNetProfit({
    sellingPrice: inputs.selling_price,
    landedCost: landed_cost,
    orderQuantity: inputs.order_quantity,
  })
  const total_cost = landed_cost * inputs.order_quantity

  return { supplier_id: supplier.id, landed_cost, gross_margin, risk_adjusted_profit, total_profit, total_cost }
}

export function rankProfit(suppliers: Supplier[], inputs: ProfitInputs): ProfitResult[] {
  const raw = suppliers.map((supplier) => ({ supplier, profit: computeProfit(supplier, inputs) }))
  if (raw.length === 0) return []

  const maxProfitWinner = [...raw].sort((a, b) => {
    const d = b.profit.risk_adjusted_profit - a.profit.risk_adjusted_profit
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]

  const lowestRiskWinner = [...raw].sort((a, b) => {
    const d = a.supplier.risk_score - b.supplier.risk_score
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]

  const balancedWinner = [...raw].sort((a, b) => {
    const aScore = a.profit.risk_adjusted_profit * 0.6 + (1 - a.supplier.risk_score / 100) * 0.4
    const bScore = b.profit.risk_adjusted_profit * 0.6 + (1 - b.supplier.risk_score / 100) * 0.4
    const d = bScore - aScore
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })[0]

  const ranked = [...raw].sort((a, b) => {
    const d = b.profit.risk_adjusted_profit - a.profit.risk_adjusted_profit
    return d !== 0 ? d : a.supplier.moq - b.supplier.moq
  })

  return ranked.map((entry, idx) => {
    let recommended_type: ProfitResult["recommended_type"] = null
    if (entry.supplier.id === maxProfitWinner.supplier.id) recommended_type = "max_profit"
    else if (entry.supplier.id === lowestRiskWinner.supplier.id) recommended_type = "lowest_risk"
    else if (entry.supplier.id === balancedWinner.supplier.id) recommended_type = "balanced"
    return { ...entry.profit, recommended_type, profit_rank: idx + 1 }
  })
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n)
}

export function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`
}
