"use client"

// Profit Intelligence Engine — deterministic per-supplier profit math.
// Inputs: 5 numeric fields shared across all suppliers. Outputs: landed cost, gross margin,
// risk-adjusted profit, total profit, and a "best of" badge per category.

import { useMemo } from "react"
import { Trophy, ShieldCheck, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { rankProfit, formatUSD, type ProfitInputs, type ProfitResult } from "@/lib/profit"
import type { Supplier } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  // Suppliers being compared.
  suppliers: Supplier[]
  // Current input state (parent owns it so SimulationPanel can read it too).
  inputs: ProfitInputs
  // Setter — the parent re-renders both this and the simulation when inputs change.
  onChange: (next: ProfitInputs) => void
}

// Map badge type → icon + label + color class for the recommended-supplier badges.
const BADGE_META = {
  max_profit: { icon: Trophy, label: "Max Profit", className: "bg-foreground text-background" },
  lowest_risk: { icon: ShieldCheck, label: "Lowest Risk", className: "bg-emerald-600 text-white" },
  balanced: { icon: Scale, label: "Balanced", className: "bg-amber-500 text-foreground" },
} as const

// Build a one-sentence deterministic explanation for a profit result. No AI cost.
function explainProfit(supplier: Supplier, p: ProfitResult): string {
  const marginPct = (p.gross_margin * 100).toFixed(1)
  if (p.gross_margin < 0) return `Selling price below landed cost — order would lose ${formatUSD(Math.abs(p.total_profit))} at ${supplier.country} unit cost.`
  if (p.recommended_type === "max_profit") return `Highest risk-adjusted profit at ${marginPct}% margin despite a risk score of ${supplier.risk_score}/100.`
  if (p.recommended_type === "lowest_risk") return `Safest pick — risk score ${supplier.risk_score}/100, ${marginPct}% margin, ${supplier.on_time_rate}% on-time delivery.`
  if (p.recommended_type === "balanced") return `Best blend of upside and safety — ${marginPct}% margin against ${supplier.risk_score}/100 risk.`
  if (supplier.risk_score >= 40) return `${marginPct}% margin offset by elevated country risk (${supplier.risk_score}/100) — start with test orders.`
  return `${marginPct}% gross margin with ${supplier.on_time_rate}% on-time delivery from ${supplier.country}.`
}

export function ProfitPanel({ suppliers, inputs, onChange }: Props) {
  // Compute ranked profit results — recomputed every render but the math is trivial.
  const ranked = useMemo(() => rankProfit(suppliers, inputs), [suppliers, inputs])
  // Quick lookup by id for joining with the supplier list.
  const byId = useMemo(() => new Map(ranked.map((r) => [r.supplier_id, r])), [ranked])
  // Negative-margin warning — true if any supplier currently loses money at the buyer's selling price.
  const anyNegative = ranked.some((r) => r.gross_margin < 0)

  // Single update helper to keep input handlers concise.
  const update = (k: keyof ProfitInputs, v: number) => onChange({ ...inputs, [k]: v })

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      {/* Section header. */}
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Profit Intelligence</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#16201d]">Margin, landed cost, and risk-adjusted upside</h2>
        </div>
      </header>

      {/* Negative-margin warning banner. */}
      {anyNegative && (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Heads up — one or more suppliers have negative margin at your current selling price. Adjust selling price or remove them from comparison.
        </div>
      )}

      {/* Inputs row — 5 numeric fields. */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-black/10 bg-[#f7f4ec] p-4 md:grid-cols-5">
        <NumberField id="selling_price" label="Selling price" suffix="$" step={0.5} value={inputs.selling_price} onChange={(v) => update("selling_price", v)} />
        <NumberField id="shipping" label="Shipping / unit" suffix="$" step={0.1} value={inputs.shipping_cost_per_unit} onChange={(v) => update("shipping_cost_per_unit", v)} />
        <NumberField id="customs" label="Customs %" suffix="%" step={0.5} value={inputs.customs_rate} onChange={(v) => update("customs_rate", v)} />
        <NumberField id="packaging" label="Packaging / unit" suffix="$" step={0.1} value={inputs.packaging_cost_per_unit} onChange={(v) => update("packaging_cost_per_unit", v)} />
        <NumberField id="qty" label="Order qty" suffix="" step={50} value={inputs.order_quantity} onChange={(v) => update("order_quantity", Math.max(1, Math.round(v)))} />
      </div>

      {/* Per-supplier rows. */}
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-black/10 bg-[#eef1ea] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[#6d7a75]">
          <div className="col-span-4">Supplier</div>
          <div className="col-span-2 text-right">Landed</div>
          <div className="col-span-2 text-right">Margin</div>
          <div className="col-span-2 text-right">Risk-adj</div>
          <div className="col-span-2 text-right">Total profit</div>
        </div>
        {suppliers.map((s) => {
          const p = byId.get(s.id)
          if (!p) return null
          const badge = p.recommended_type ? BADGE_META[p.recommended_type] : null
          // Margin tone — green/amber/red driven by gross_margin %.
          const marginTone = p.gross_margin > 0.4 ? "text-emerald-600" : p.gross_margin > 0.2 ? "text-amber-600" : p.gross_margin > 0 ? "text-foreground" : "text-rose-600"
          return (
            <div key={s.id} className="grid grid-cols-12 gap-3 border-b border-black/10 px-4 py-4 last:border-b-0">
              {/* Supplier identity + badge + AI-style explanation (deterministic). */}
              <div className="col-span-12 md:col-span-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.country}</span>
                  {badge && (
                    <Badge className={cn("gap-1", badge.className)}>
                      <badge.icon className="h-3 w-3" />
                      {badge.label}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{explainProfit(s, p)}</p>
              </div>
              {/* Numeric cells. */}
              <Cell className="col-span-3 md:col-span-2">{formatUSD(p.landed_cost)}</Cell>
              <Cell className={cn("col-span-3 md:col-span-2", marginTone)}>{(p.gross_margin * 100).toFixed(1)}%</Cell>
              <Cell className="col-span-3 md:col-span-2">{(p.risk_adjusted_profit * 100).toFixed(1)}%</Cell>
              <Cell className="col-span-3 md:col-span-2">{formatUSD(p.total_profit)}</Cell>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Internal — single right-aligned numeric cell.
function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-right font-mono text-sm tabular-nums text-foreground", className)}>{children}</div>
}

// Internal — labeled numeric input used by the inputs row.
function NumberField({
  id,
  label,
  suffix,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  suffix: string
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center rounded-md border border-border/70 bg-background px-2">
        {suffix === "$" && <span className="text-xs text-muted-foreground">$</span>}
        <Input
          id={id}
          type="number"
          step={step}
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
        />
        {suffix === "%" && <span className="text-xs text-muted-foreground">%</span>}
      </div>
    </div>
  )
}
