import type { Supplier } from "@/lib/types"

const SCAFFOLD_DESCRIPTION_PATTERN =
  /is positioned for|supplier focused on|supplier for .* with export documentation|quote-ready|SME-friendly|comparison-ready|BuildFest sourcing metadata/i

function primaryProduct(supplier: Pick<Supplier, "products" | "subcategory">) {
  return supplier.products?.[0] ?? supplier.subcategory
}

function leadTimeLabel(days: number) {
  if (days <= 25) return "a quicker production window"
  if (days <= 45) return "a standard production window"
  return "a longer production window"
}

function qualityLabel(qualityRating: number) {
  if (qualityRating >= 4.7) return "strong quality signals"
  if (qualityRating >= 4.4) return "steady quality signals"
  return "decent quality signals"
}

function certificationsSnippet(supplier: Pick<Supplier, "bgmea_certified" | "certifications">) {
  if (supplier.bgmea_certified) return "BGMEA-backed compliance"
  if (supplier.certifications.length > 0) return supplier.certifications.slice(0, 2).join(" and ")
  return null
}

export function buildSupplierDescription(
  supplier: Pick<
    Supplier,
    "name" | "city" | "country" | "products" | "subcategory" | "moq" | "lead_time_days" | "quality_rating" | "on_time_rate" | "bgmea_certified" | "certifications"
  >,
  rawDescription?: string | null,
) {
  const cleaned = rawDescription?.trim() ?? ""
  if (cleaned && !SCAFFOLD_DESCRIPTION_PATTERN.test(cleaned)) return cleaned

  const product = primaryProduct(supplier)
  const certifications = certificationsSnippet(supplier)
  const complianceLine = certifications ? ` ${certifications} helps if documentation or buyer approval is part of the brief.` : ""

  return `${supplier.name} is a ${supplier.city}, ${supplier.country} supplier for ${product}. Best fit when you can work with ${supplier.moq.toLocaleString()} units and ${leadTimeLabel(
    supplier.lead_time_days,
  )}; ${qualityLabel(supplier.quality_rating)} and ${supplier.on_time_rate}% on-time delivery make it a reasonable supplier to review early.${complianceLine}`
}

export function buildOperationalFitNote(supplier: Pick<Supplier, "products" | "subcategory" | "moq" | "lead_time_days" | "quality_rating">) {
  const product = primaryProduct(supplier)
  const scaleLine =
    supplier.moq <= 500
      ? `The MOQ is light enough for a first test on ${product}.`
      : supplier.moq <= 1200
        ? `The MOQ is manageable if demand is reasonably clear before you commit to ${product}.`
        : `The MOQ is heavy, so ${product} makes more sense once demand is already proven.`
  const leadLine =
    supplier.lead_time_days <= 25
      ? "The lead time is short enough for faster restocks or a quick launch."
      : supplier.lead_time_days <= 45
        ? "The lead time is standard, so this works well for planned buying."
        : "The lead time is on the slower side, so this is better for planned inventory than urgent replenishment."

  return `${scaleLine} ${leadLine} The ${supplier.quality_rating.toFixed(1)}/5 quality rating is encouraging, but sample approval should still come before bulk production.`
}

export function buildRiskNote(supplier: Pick<Supplier, "country" | "products" | "subcategory" | "moq" | "lead_time_days">) {
  const product = primaryProduct(supplier)
  const shippingLine =
    supplier.country === "Bangladesh"
      ? "Coordination is easier locally, but sample approval, final inspection, and carton quality still need to be confirmed."
      : "Cross-border shipping adds more room for delay, freight swings, and packaging damage if the handoff is not managed tightly."
  const orderLine =
    supplier.moq >= 1200
      ? "Because the order size is meaningful, a weak sample or late shipment would tie up more cash than a small test run."
      : "The order size is manageable, but the buyer should still lock the spec sheet before paying."
  const timingLine =
    supplier.lead_time_days > 45
      ? "The longer lead time also means less room to recover if the first sample needs changes."
      : "Lead time is workable, but dates should still be confirmed in writing."

  return `${product} can go wrong on material, finish, labeling, or packaging if the brief is loose. ${shippingLine} ${orderLine} ${timingLine}`
}

export function buildDemandGuidanceNote(supplier: Pick<Supplier, "products" | "subcategory" | "moq" | "lead_time_days">) {
  const product = primaryProduct(supplier)
  const reorderBuffer = supplier.lead_time_days + 14
  const testOrderLine =
    supplier.moq <= 500
      ? `A first run around ${supplier.moq.toLocaleString()} units is a practical way to test demand for ${product}.`
      : `With a ${supplier.moq.toLocaleString()} unit MOQ, ${product} should only move forward once demand and storage are clear.`
  return `${product} should be treated as an inventory decision, not just a quote comparison. ${testOrderLine} Plan reorder decisions roughly ${reorderBuffer} days before stockout so production and freight do not create a gap.`
}

export function buildDecisionRecommendation(supplier: Pick<Supplier, "risk_score" | "lead_time_days" | "moq">) {
  if (supplier.risk_score <= 25 && supplier.lead_time_days <= 30) {
    return {
      label: "Ready for sample",
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
      summary: "This is a credible sample-first supplier. The risk is controlled, the timeline is workable, and the MOQ is not unusually punishing for a first run.",
    }
  }

  if (supplier.risk_score <= 50) {
    return {
      label: "Proceed with caution",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
      summary: "This supplier is still usable, but the buyer should validate sample quality, shipment timing, and packing details before treating it as a front-runner.",
    }
  }

  return {
    label: "Keep as backup option",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    summary: "Keep this profile in reserve until stronger proof comes in. It is better used as comparison pressure than as the first supplier to commit to.",
  }
}

export function buildDecisionReasoning(supplier: Pick<Supplier, "quality_rating" | "moq" | "lead_time_days">) {
  const qualityLine =
    supplier.quality_rating >= 4.4
      ? "Quality looks strong enough to justify a sample request."
      : "Quality looks serviceable, but the sample matters before any real commitment."
  const moqLine =
    supplier.moq <= 500
      ? "MOQ is friendly for a test order."
      : supplier.moq <= 1200
        ? "MOQ is manageable if the first order is tied to real demand."
        : "MOQ is heavy enough that demand should be proven before cash is locked in."
  const leadLine =
    supplier.lead_time_days <= 25
      ? "Lead time supports a quicker launch or restock."
      : supplier.lead_time_days <= 45
        ? "Lead time is normal for planned sourcing."
        : "Lead time is slow, so this supplier fits planned buying better than urgent replenishment."

  return [qualityLine, moqLine, leadLine]
}

export function buildRiskMitigationPlan(supplier: Pick<Supplier, "country">) {
  const shippingStep =
    supplier.country === "Bangladesh"
      ? "Confirm final inspection, carton quality, and sample approval before shipment even if the factory is local."
      : "Ask for packing proof, final inspection evidence, and a firmer shipping timeline before any deposit is paid."

  return [
    "Request fresh product photos or a physical sample before approving bulk production.",
    "Lock the unit price, MOQ, and lead time in writing so the quote cannot drift after the first conversation.",
    shippingStep,
    "Agree in advance on how defects, delays, or damaged cartons will be handled.",
  ]
}

export function buildNegotiationChecklist(
  supplier: Pick<Supplier, "moq">,
  paymentTerms: string,
  incoterms: string[],
) {
  const moqStep =
    supplier.moq >= 1000
      ? "Ask whether the first order can stay close to MOQ instead of moving straight into a larger factory-preferred volume."
      : "Ask whether this MOQ can be held for repeat orders after the first sample is approved."

  return [
    "Ask whether the unit price improves once repeat volume is proven.",
    moqStep,
    `Confirm payment terms now. Current profile suggests: ${paymentTerms}.`,
    `Lock shipping terms before money moves. Current profile signals: ${incoterms.length > 0 ? incoterms.join(", ") : "to be confirmed"}.`,
  ]
}

export function buildOutreachDraft(args: {
  supplierName: string
  product: string
  unitPrice: number
  moq: number
  leadTime: number
}) {
  return [
    `Hello ${args.supplierName} team,`,
    `We are reviewing suppliers for ${args.product} and would like to understand whether your factory is a fit for a first order.`,
    `Our current view is roughly $${args.unitPrice.toFixed(2)} per unit, ${args.moq.toLocaleString()} MOQ, and about ${args.leadTime} days of production time. Please confirm sample availability, packaging options, final inspection steps, and whether pricing can improve on repeat volume.`,
    "If the sample and commercial terms look right, we would like to discuss a first order and a path for repeat buying.",
    "Best regards,",
    "Sourcery team",
  ].join("\n\n")
}

export function buildNegotiationDraft(args: {
  supplierName: string
  product: string
  unitPrice: number
  moq: number
  leadTime: number
}) {
  return [
    `Hello ${args.supplierName} team,`,
    `We are reviewing suppliers for ${args.product}. At the moment we have your profile around $${args.unitPrice.toFixed(2)} per unit, ${args.moq.toLocaleString()} MOQ, and ${args.leadTime} days of lead time.`,
    "Before moving forward, please confirm sample availability, packaging options, final inspection steps, and whether pricing can improve on a repeat order.",
    "If the sample quality is right, we would like to discuss a first test order and a realistic scale-up plan.",
    "Best regards,",
    "Sourcery team",
  ].join("\n\n")
}
