"use client"

import { CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const TERM_DEFINITIONS: Record<string, string> = {
  Unit: "Estimated supplier price for one item before shipping, duty, and packaging.",
  "Unit price": "Estimated supplier price for one item before shipping, duty, and packaging.",
  MOQ: "Minimum order quantity: the smallest order a supplier will usually accept.",
  Lead: "Estimated days before the supplier can get the goods ready to ship.",
  Risk: "Lower is safer; this estimates quality, delivery, MOQ, and shipping risk.",
  Fit: "How closely this supplier matches the selected product, price, region, and order needs.",
  Rating: "Quality signal from supplier profile data and operational indicators.",
  Quality: "Quality signal from supplier profile data and operational indicators.",
  Confidence: "How confident Sourcery is in this ranking based on available signals.",
  Landed: "Estimated total cost per unit after supplier price, shipping, customs, and packaging.",
  Margin: "Expected profit percentage after landed cost is removed from selling price.",
  "Risk-adj": "Profit adjusted downward when supplier risk is higher.",
  "Total profit": "Estimated profit for the full order quantity.",
  "Order qty": "How many units you plan to buy for this order.",
  "Selling price": "The price you expect to sell one unit for.",
  "Shipping / unit": "Estimated shipping cost added to each unit.",
  "Customs %": "Import duty or customs percentage applied to the supplier price.",
  "Packaging / unit": "Extra packaging cost added to each unit.",
  "Shipping cost": "A what-if change to shipping cost for stress testing margin.",
  "Supplier unit price": "A what-if change to the supplier's unit price.",
  "Lead time": "A what-if change to how long the supplier needs before shipping.",
  "Base rank": "The supplier's rank before simulation changes.",
  "New rank": "The supplier's rank after simulation changes.",
  "Sim total profit": "Estimated total profit after the simulation changes are applied.",
}

export function TermHelp({
  term,
  description,
  className,
}: {
  term: string
  description?: string
  className?: string
}) {
  const text = description ?? TERM_DEFINITIONS[term]
  if (!text) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${term} explanation`}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#8a948f] transition hover:text-[#16201d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9b44a]",
            className,
          )}
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[260px] text-pretty leading-5">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export function TermLabel({
  label,
  description,
  className,
}: {
  label: string
  description?: string
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>{label}</span>
      <TermHelp term={label} description={description} />
    </span>
  )
}
