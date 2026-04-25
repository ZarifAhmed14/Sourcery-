"use client"

// Single supplier result card — rendered inside the chat thread for each shortlisted supplier.
// Combines Discovery rank, scorecard numbers, BGMEA badge, and the Why-this accordion.

import type { Supplier } from "@/lib/types"
import type { DiscoveryItem, RiskItem, ComparisonItem } from "@/lib/schemas"
import { WhyAccordion } from "@/components/sourcery/why-accordion"
import { Badge } from "@/components/ui/badge"
import { formatUSD } from "@/lib/profit"
import { cn } from "@/lib/utils"

type Props = {
  supplier: Supplier
  discovery: DiscoveryItem
  risk: RiskItem
  comparison: ComparisonItem
  bangladeshMode: boolean
}

// Bilingual mini-label rendered below the English label when BD mode is on.
function BilingualLabel({ en, bn, on }: { en: string; bn: string; on: boolean }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      <div>{en}</div>
      {on && <div className="mt-0.5 normal-case tracking-normal text-muted-foreground/80">{bn}</div>}
    </div>
  )
}

export function SupplierCard({ supplier, discovery, risk, comparison, bangladeshMode }: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      {/* Top header — rank, name, location, badges. */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {/* Rank pill — the Discovery agent's choice. */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {discovery.rank}
            </span>
            <h3 className="truncate font-serif text-xl text-foreground">{supplier.name}</h3>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {supplier.city}, {supplier.country} · {supplier.subcategory}
          </p>
        </div>
        {/* Right-side badges — BGMEA, fit score, BD-adjusted risk note. */}
        <div className="flex flex-wrap items-center gap-2">
          {supplier.bgmea_certified && bangladeshMode && (
            <Badge className="bg-[#006a4e] text-white hover:bg-[#006a4e]">BGMEA</Badge>
          )}
          {risk.bd_mode_adjusted && <Badge variant="outline">BD-adj risk −20%</Badge>}
          <Badge variant="secondary">Fit {Math.round(discovery.fit_score)}</Badge>
        </div>
      </header>

      {/* Scorecard grid — five numeric KPIs in a row, with optional Bangla labels. */}
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
        <ScoreCell value={formatUSD(comparison.scorecard.price)} en="Unit Price" bn="একক মূল্য" on={bangladeshMode} />
        <ScoreCell value={`${comparison.scorecard.lead_time_days}d`} en="Lead Time" bn="সরবরাহ সময়" on={bangladeshMode} />
        <ScoreCell value={comparison.scorecard.moq.toLocaleString()} en="MOQ" bn="ন্যূনতম অর্ডার" on={bangladeshMode} />
        <ScoreCell value={`${comparison.scorecard.on_time_rate}%`} en="On-time" bn="সময়মতো" on={bangladeshMode} />
        <ScoreCell value={`${comparison.scorecard.quality_rating}/5`} en="Quality" bn="গুণমান" on={bangladeshMode} />
      </div>

      {/* Certifications row — small muted pills. */}
      {supplier.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-5 py-3">
          {supplier.certifications.slice(0, 8).map((c) => (
            <span key={c} className="rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Explainability — one accordion combining Discovery + Risk for compactness. */}
      <div className="space-y-3 border-t border-border/60 bg-background px-5 py-4">
        <WhyAccordion
          label="Why this rank"
          explanation={discovery.explanation}
          key_factors={discovery.key_factors}
          confidence={discovery.confidence}
          confidence_reason={discovery.confidence_reason}
        />
        <WhyAccordion
          label="Risk view"
          explanation={risk.explanation}
          key_factors={risk.key_factors}
          confidence={risk.confidence}
          confidence_reason={risk.confidence_reason}
          risk_flags={risk.risk_flags}
        />
      </div>
    </article>
  )
}

// Internal — single KPI cell used inside the scorecard grid.
function ScoreCell({ value, en, bn, on }: { value: string; en: string; bn: string; on: boolean }) {
  return (
    <div className={cn("bg-card px-4 py-3")}>
      <BilingualLabel en={en} bn={bn} on={on} />
      <div className="mt-1 font-serif text-lg text-foreground">{value}</div>
    </div>
  )
}
