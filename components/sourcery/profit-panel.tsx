"use client"

// Profit Intelligence Engine — deterministic per-supplier profit math.
// Inputs: 5 numeric fields shared across all suppliers. Outputs: landed cost, gross margin,
// risk-adjusted profit, total profit, and a "best of" badge per category.

import { useMemo } from "react"
import { Trophy, ShieldCheck, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TermLabel } from "@/components/sourcery/term-help"
import { rankProfit, type ProfitInputs, type ProfitResult } from "@/lib/profit"
import type { Supplier } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"
import { usePreferences } from "@/lib/preferences-context"

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
function explainProfit(supplier: Supplier, p: ProfitResult, bangladeshMode: boolean): string {
  const marginPct = (p.gross_margin * 100).toFixed(1)
  if (p.gross_margin < 0) return `Selling price below landed cost — order would lose ${formatMoney(Math.abs(p.total_profit), bangladeshMode)} at ${supplier.country} unit cost.`
  if (p.recommended_type === "max_profit") return `Highest risk-adjusted profit at ${marginPct}% margin despite a risk score of ${supplier.risk_score}/100.`
  if (p.recommended_type === "lowest_risk") return `Safest pick — risk score ${supplier.risk_score}/100, ${marginPct}% margin, ${supplier.on_time_rate}% on-time delivery.`
  if (p.recommended_type === "balanced") return `Best blend of upside and safety — ${marginPct}% margin against ${supplier.risk_score}/100 risk.`
  if (supplier.risk_score >= 40) return `${marginPct}% margin offset by elevated country risk (${supplier.risk_score}/100) — start with test orders.`
  return `${marginPct}% gross margin with ${supplier.on_time_rate}% on-time delivery from ${supplier.country}.`
}

export function ProfitPanel({ suppliers, inputs, onChange }: Props) {
  const { bangladeshMode } = usePreferences()
  // Compute ranked profit results — recomputed every render but the math is trivial.
  const ranked = useMemo(() => rankProfit(suppliers, inputs), [suppliers, inputs])
  // Quick lookup by id for joining with the supplier list.
  const byId = useMemo(() => new Map(ranked.map((r) => [r.supplier_id, r])), [ranked])
  // Negative-margin warning — true if any supplier currently loses money at the buyer's selling price.
  const anyNegative = ranked.some((r) => r.gross_margin < 0)

  // Single update helper to keep input handlers concise.
  const update = (k: keyof ProfitInputs, v: number) => onChange({ ...inputs, [k]: v })
  const maxProfit = useMemo(() => Math.max(...ranked.map((r) => Math.max(r.total_profit, 0)), 1), [ranked])
  const maxLandedCost = useMemo(() => Math.max(...ranked.map((r) => r.landed_cost), 1), [ranked])

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

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-black/10 bg-[#fffdf8] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Profit spread</p>
              <p className="mt-1 text-sm text-[#5d6965]">A quick view of who actually leaves more money on the table after costs and risk.</p>
            </div>
            <span className="text-xs text-[#6d7a75]">Higher is better</span>
          </div>
          <div className="space-y-3">
            {suppliers.map((s) => {
              const p = byId.get(s.id)
              if (!p) return null
              const width = Math.max(8, Math.round((Math.max(p.total_profit, 0) / maxProfit) * 100))
              return (
                <div key={`${s.id}-profitbar`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-[#16201d]">{s.name}</span>
                    <span className="font-mono text-[#16201d]">{formatMoney(p.total_profit, bangladeshMode)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ece3d2]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        p.total_profit < 0 ? "bg-rose-500" : p.recommended_type === "max_profit" ? "bg-[#16201d]" : p.recommended_type === "balanced" ? "bg-[#d9b44a]" : "bg-emerald-600",
                      )}
                      style={{ width: `${p.total_profit < 0 ? 12 : width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-[#fffdf8] p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Landed cost vs selling price</p>
            <p className="mt-1 text-sm text-[#5d6965]">Shows how much of your final selling price is already consumed before marketing or overhead.</p>
          </div>
          <div className="space-y-3">
            {suppliers.map((s) => {
              const p = byId.get(s.id)
              if (!p) return null
              const landedWidth = Math.min(100, Math.round((p.landed_cost / Math.max(inputs.selling_price, 1)) * 100))
              const costBandWidth = Math.max(10, Math.round((p.landed_cost / maxLandedCost) * 100))
              return (
                <div key={`${s.id}-costbar`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-[#16201d]">{s.name}</span>
                    <span className="font-mono text-[#53605c]">{formatMoney(p.landed_cost, bangladeshMode)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 overflow-hidden rounded-full bg-[#ece3d2]">
                      <div className="h-full rounded-full bg-[#d9b44a] transition-all duration-500" style={{ width: `${landedWidth}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6d7a75]">
                      <span>vs selling price</span>
                      <span>{landedWidth}% used</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f3ecde]">
                      <div className="h-full rounded-full bg-[#16201d]/70 transition-all duration-500" style={{ width: `${costBandWidth}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Per-supplier rows. */}
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-black/10 bg-[#eef1ea] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[#6d7a75]">
          <div className="col-span-4">Supplier</div>
          <div className="col-span-2 text-right"><TermLabel label="Landed" /></div>
          <div className="col-span-2 text-right"><TermLabel label="Margin" /></div>
          <div className="col-span-2 text-right"><TermLabel label="Risk-adj" /></div>
          <div className="col-span-2 text-right"><TermLabel label="Total profit" /></div>
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
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{explainProfit(s, p, bangladeshMode)}</p>
              </div>
              {/* Numeric cells. */}
              <Cell className="col-span-3 md:col-span-2">{formatMoney(p.landed_cost, bangladeshMode)}</Cell>
              <Cell className={cn("col-span-3 md:col-span-2", marginTone)}>{(p.gross_margin * 100).toFixed(1)}%</Cell>
              <Cell className="col-span-3 md:col-span-2">{(p.risk_adjusted_profit * 100).toFixed(1)}%</Cell>
              <Cell className="col-span-3 md:col-span-2">{formatMoney(p.total_profit, bangladeshMode)}</Cell>
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
        <TermLabel label={label} />
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
