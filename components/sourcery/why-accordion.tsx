"use client"

// Reusable explainability accordion — used wherever an AI agent surfaces a recommendation.
// Collapsed: short prose explanation + confidence dot.
// Expanded: key factors as pills + confidence reason + risk flags.

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Explainability } from "@/lib/types"

// Confidence → dot color mapping. Drives the small status dot the user sees first.
const CONFIDENCE_COLOR: Record<Explainability["confidence"], string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-rose-500",
}

// Confidence → human-readable label.
const CONFIDENCE_LABEL: Record<Explainability["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
}

// Optional risk-flag list rendered alongside the explanation when provided.
type Props = Explainability & {
  // Extra label rendered above the explanation, e.g. "Why this rank" or "Risk view".
  label?: string
  // Optional risk flags surfaced from the Risk Agent.
  risk_flags?: string[]
  // Whether the accordion starts open. Detail pages set this to true.
  defaultOpen?: boolean
}

export function WhyAccordion({ label = "Why this", explanation, key_factors, confidence, confidence_reason, risk_flags, defaultOpen = false }: Props) {
  // Local open state — expand/collapse without a router round-trip.
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border/70 bg-card">
      {/* Header row — clickable to toggle. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {/* Confidence dot + tooltip-like label. */}
          <span className={cn("mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full", CONFIDENCE_COLOR[confidence])} aria-label={CONFIDENCE_LABEL[confidence]} />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
            <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{explanation}</p>
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {/* Expanded content. */}
      {open && (
        <div className="space-y-3 border-t border-border/60 px-4 py-4">
          <div>
            <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
          </div>

          {/* Key factor pills — each one references a concrete data point. */}
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Key factors</div>
            <div className="flex flex-wrap gap-2">
              {key_factors.map((f, i) => (
                <span key={`${f}-${i}`} className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs text-foreground">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Risk flags (optional). */}
          {risk_flags && risk_flags.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Risk flags</div>
              <ul className="space-y-1">
                {risk_flags.map((rf, i) => (
                  <li key={`${rf}-${i}`} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence summary footer. */}
          <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <span className={cn("inline-block h-2 w-2 rounded-full", CONFIDENCE_COLOR[confidence])} />
            <span>
              {CONFIDENCE_LABEL[confidence]} — {confidence_reason}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
