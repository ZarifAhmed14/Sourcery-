"use client"

// What-If Simulation Engine — applies user-controlled deltas to base profit inputs and
// re-ranks suppliers under simulated conditions. Deterministic re-rank = zero AI cost.
// A short rank-change explainer is generated locally (template) ONLY when the winner flips.

import { useMemo, useState } from "react"
import { ArrowRight, Sparkles, ChevronDown } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { runSimulation, defaultDeltas, type SimulationDeltas } from "@/lib/simulate"
import { rankProfit, formatUSD, type ProfitInputs } from "@/lib/profit"
import type { Supplier } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  // Suppliers in the comparison.
  suppliers: Supplier[]
  // Base profit inputs from the parent.
  baseInputs: ProfitInputs
}

// Build a deterministic one-sentence summary of why the winner changed.
function buildRankChangeExplainer(prevName: string, newName: string, d: SimulationDeltas): string {
  // Build a list of human-readable delta phrases.
  const parts: string[] = []
  if (d.shipping_cost_delta_pct !== 0) parts.push(`${d.shipping_cost_delta_pct > 0 ? "+" : ""}${d.shipping_cost_delta_pct}% shipping`)
  if (d.supplier_price_delta_pct !== 0) parts.push(`${d.supplier_price_delta_pct > 0 ? "+" : ""}${d.supplier_price_delta_pct}% supplier price`)
  if (d.lead_time_delta_days !== 0) parts.push(`${d.lead_time_delta_days > 0 ? "+" : ""}${d.lead_time_delta_days}d lead time`)
  const phrase = parts.length ? parts.join(", ") : "your input changes"
  return `${newName} overtakes ${prevName} once you apply ${phrase} — the ranking shifts because the risk-adjusted profit recomputes against the new landed cost.`
}

export function SimulationPanel({ suppliers, baseInputs }: Props) {
  // Drawer open state.
  const [open, setOpen] = useState(false)
  // Local delta state — defaults match the base inputs (no change).
  const [deltas, setDeltas] = useState<SimulationDeltas>(() => defaultDeltas(baseInputs))

  // Run the simulation deterministically — no AI, instant recompute on every change.
  const sim = useMemo(() => runSimulation(suppliers, baseInputs, deltas), [suppliers, baseInputs, deltas])
  // Compute the BASE rankings (no deltas) for side-by-side comparison.
  const base = useMemo(() => rankProfit(suppliers, baseInputs), [suppliers, baseInputs])
  // Map id → base rank for quick movement-arrow lookups.
  const baseRankById = useMemo(() => new Map(base.map((b) => [b.supplier_id, b.profit_rank])), [base])
  // Map id → supplier for label lookups.
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers])

  // Identify base + simulated winners.
  const baseWinner = base[0]
  const simWinner = sim.simResults[0]
  const winnerChanged = baseWinner && simWinner && baseWinner.supplier_id !== simWinner.supplier_id

  // Build the rank-change explainer deterministically (no AI call).
  const explainer = winnerChanged
    ? buildRankChangeExplainer(supplierById.get(baseWinner.supplier_id)?.name ?? "—", supplierById.get(simWinner.supplier_id)?.name ?? "—", deltas)
    : null

  // Reset all deltas back to no-change.
  const reset = () => setDeltas(defaultDeltas(baseInputs))

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      {/* Drawer header — click to expand. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-foreground" aria-hidden />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">What-If Simulation</p>
            <h2 className="font-serif text-xl text-foreground">Stress-test shipping, lead time, and price assumptions</h2>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {/* Body. */}
      {open && (
        <div className="space-y-5 border-t border-border/60 px-5 py-5">
          {/* Five controls. */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SliderRow
              label="Shipping cost"
              suffix="%"
              min={-50}
              max={200}
              step={5}
              value={deltas.shipping_cost_delta_pct}
              onChange={(v) => setDeltas({ ...deltas, shipping_cost_delta_pct: v })}
            />
            <SliderRow
              label="Supplier unit price"
              suffix="%"
              min={-30}
              max={100}
              step={1}
              value={deltas.supplier_price_delta_pct}
              onChange={(v) => setDeltas({ ...deltas, supplier_price_delta_pct: v })}
            />
            <SliderRow
              label="Lead time"
              suffix="d"
              min={-30}
              max={90}
              step={1}
              value={deltas.lead_time_delta_days}
              onChange={(v) => setDeltas({ ...deltas, lead_time_delta_days: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumField id="sim-qty" label="Order qty" value={deltas.order_quantity} step={50} onChange={(v) => setDeltas({ ...deltas, order_quantity: Math.max(1, Math.round(v)) })} />
              <NumField id="sim-price" label="Selling price" prefix="$" value={deltas.selling_price} step={0.5} onChange={(v) => setDeltas({ ...deltas, selling_price: Math.max(0, v) })} />
            </div>
          </div>

          {/* Winner-changed banner with deterministic explainer. */}
          {winnerChanged && explainer && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{explainer}</p>
            </div>
          )}

          {/* Side-by-side rank comparison. */}
          <div className="overflow-hidden rounded-xl border border-border/60">
            <div className="grid grid-cols-12 gap-3 border-b border-border/60 bg-secondary px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <div className="col-span-5">Supplier</div>
              <div className="col-span-2 text-right">Base rank</div>
              <div className="col-span-2 text-right">New rank</div>
              <div className="col-span-3 text-right">Sim total profit</div>
            </div>
            {sim.simResults.map((r) => {
              const supplier = supplierById.get(r.supplier_id)
              if (!supplier) return null
              const prev = baseRankById.get(r.supplier_id) ?? r.profit_rank
              const moved = prev - r.profit_rank
              return (
                <div key={r.supplier_id} className="grid grid-cols-12 items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
                  <div className="col-span-5">
                    <div className="font-medium text-foreground">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">{supplier.country}</div>
                  </div>
                  <div className="col-span-2 text-right font-mono text-sm tabular-nums text-muted-foreground">#{prev}</div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5 font-mono text-sm tabular-nums">
                    <span className="text-foreground">#{r.profit_rank}</span>
                    {moved !== 0 && (
                      <span className={cn("text-xs", moved > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {moved > 0 ? `▲${moved}` : `▼${Math.abs(moved)}`}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-right font-mono text-sm tabular-nums text-foreground">{formatUSD(r.total_profit)}</div>
                </div>
              )
            })}
          </div>

          {/* Reset button. */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={reset} className="rounded-full bg-transparent">
              Reset
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// Slider row with label + numeric readout.
function SliderRow({ label, suffix, min, max, step, value, onChange }: { label: string; suffix: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {value > 0 ? "+" : ""}
          {value}
          {suffix}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0] ?? 0)} />
    </div>
  )
}

// Numeric input row used for qty + selling price.
function NumField({ id, label, value, step, onChange, prefix }: { id: string; label: string; value: number; step: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center rounded-md border border-border/70 bg-background px-2">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input id={id} type="number" step={step} min={0} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className="border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0" />
      </div>
    </div>
  )
}
