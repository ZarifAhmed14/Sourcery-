import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  Globe2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldAlert,
  Truck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyValue } from "@/components/sourcery/currency-value"
import { TermLabel } from "@/components/sourcery/term-help"
import { formatMoney } from "@/lib/currency"
import { getProductImage } from "@/lib/product-images"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"

function supplierRecommendation(supplier: ReturnType<typeof normalizeSupplier>) {
  if (supplier.risk_score <= 25 && supplier.lead_time_days <= 30) {
    return {
      label: "Ready for sample",
      tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
      summary:
        "This supplier is strong enough for a sample-first conversation. The risk is manageable, the lead time is practical, and the MOQ is not unusually heavy.",
    }
  }

  if (supplier.risk_score <= 50) {
    return {
      label: "Proceed with caution",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
      summary:
        "This supplier can still work, but the buyer should verify samples, delivery timing, and packaging before moving into a paid order.",
    }
  }

  return {
    label: "Keep as backup option",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    summary:
      "This supplier is better treated as a backup until more proof is collected. The buyer should compare it against safer options before committing.",
  }
}

function decisionReasoning(supplier: ReturnType<typeof normalizeSupplier>) {
  const qualityLine =
    supplier.quality_rating >= 4.4
      ? "The quality signal is strong enough to justify a sample request."
      : "The quality signal is decent, but a sample is important before any real order."
  const moqLine =
    supplier.moq <= 500
      ? "The MOQ is low enough for a practical test order."
      : supplier.moq <= 1200
        ? "The MOQ is moderate, so demand should be validated before scaling."
        : "The MOQ is high, so the buyer needs confidence in sales before locking cash into stock."
  const leadLine =
    supplier.lead_time_days <= 25
      ? "Lead time is relatively fast, which helps restocking."
      : supplier.lead_time_days <= 45
        ? "Lead time is normal for sourcing and should be planned in advance."
        : "Lead time is slow, so this supplier fits planned buying more than urgent restocking."

  return [qualityLine, moqLine, leadLine]
}

function riskMitigationPlan(supplier: ReturnType<typeof normalizeSupplier>) {
  const crossBorder =
    supplier.country === "Bangladesh"
      ? "Even with local sourcing, confirm final inspection and packaging quality before shipment."
      : "Because the goods travel across borders, ask for stronger packaging photos, shipping timeline confirmation, and final inspection proof."

  return [
    "Request fresh product photos or a sample before paying for bulk production.",
    "Confirm unit price, MOQ, and lead time in writing so the quote cannot drift later.",
    crossBorder,
    "Ask how defects, delays, or damaged cartons are handled before the first order is placed.",
  ]
}

function negotiationChecklist(supplier: ReturnType<typeof normalizeSupplier>, paymentTerms: string, incoterms: string[]) {
  const targetAsk =
    supplier.moq >= 1000
      ? "Ask whether the first order can start closer to the MOQ instead of a higher factory preference."
      : "Ask whether the supplier can hold this MOQ for repeat orders after the first sample approval."

  return [
    `Confirm whether the unit price can improve if order volume grows after the first run.`,
    targetAsk,
    `Clarify payment terms now. Current profile suggests: ${paymentTerms}.`,
    `Lock shipping terms before payment. Current profile signals: ${incoterms.length > 0 ? incoterms.join(", ") : "to be confirmed"}.`,
  ]
}

function outreachDraft(args: {
  name: string
  product: string
  unitPrice: number
  moq: number
  leadTime: number
}) {
  return [
    `Hello ${args.name} team,`,
    `We are reviewing suppliers for ${args.product} and your profile stands out for fit, price, and lead time.`,
    `Before we move further, could you confirm sample availability, packaging options, final inspection process, and whether the quoted price near $${args.unitPrice.toFixed(2)} can improve around the ${args.moq.toLocaleString()} MOQ level?`,
    `If the sample looks right, we would like to discuss a first order with a lead time target near ${args.leadTime} days and a path for repeat buying.`,
    `Best regards,`,
    `Sourcery buyer team`,
  ].join("\n\n")
}

function preferredChannel(row: Record<string, unknown>) {
  const email = typeof row.email === "string" ? row.email : null
  const phone = typeof row.phone === "string" ? row.phone : null
  if (email) return { label: "Email first", detail: email }
  if (phone) return { label: "Phone / WhatsApp first", detail: phone }
  return { label: "Website contact first", detail: "Use the public supplier website form or sourcing desk." }
}

export default async function SupplierDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isAdminSupabaseConfigured()) notFound()

  const supabase = getAdminClient()
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
  if (error || !data) notFound()

  const supplier = normalizeSupplier(data)
  const image = getProductImage({ supplier })
  const metadata = (data.metadata ?? {}) as { port?: string; sample_days?: number; incoterms?: string[] }
  const paymentTerms = typeof data.payment_terms === "string" ? data.payment_terms : "Quoted during outreach"
  const website = typeof data.website === "string" && data.website.startsWith("http") ? data.website : supplier.source_url
  const contactName = typeof data.contact_name === "string" ? data.contact_name : "Sourcing desk"
  const email = typeof data.email === "string" ? data.email : null
  const phone = typeof data.phone === "string" ? data.phone : null
  const incoterms = Array.isArray(metadata.incoterms) ? metadata.incoterms.map(String) : []
  const product = supplier.products?.[0] ?? supplier.subcategory
  const recommendation = supplierRecommendation(supplier)
  const initialOrderUnits = Math.max(supplier.moq, Math.min(supplier.moq * 2, 1500))
  const initialSpend = supplier.unit_price_usd * initialOrderUnits
  const reorderWindow = supplier.lead_time_days + 14
  const channel = preferredChannel(data as Record<string, unknown>)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/suppliers/${supplier.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#5d6965] hover:text-[#16201d]">
          <ArrowLeft className="h-4 w-4" />
          Back to supplier profile
        </Link>
        <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
          <Link href="/app/compare">
            Profit & simulation
            <BarChart3 className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[320px] bg-[#ece7dc]">
            <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16201d]/80 via-[#16201d]/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 space-y-2 text-[#f7f4ec]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d58d]">Supplier decision</p>
              <h1 className="font-serif text-4xl leading-none md:text-5xl">{supplier.name}</h1>
              <p className="flex items-center gap-2 text-sm text-[#dbe5df]">
                <MapPin className="h-4 w-4" />
                {supplier.city}, {supplier.country} · {supplier.region}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6 md:p-7">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${recommendation.tone}`}>
              {recommendation.label}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#16201d]">What we should do with this supplier</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d6965]">{recommendation.summary}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DecisionMetric label="Unit price" value={<CurrencyValue usd={supplier.unit_price_usd} />} />
              <DecisionMetric label="MOQ" value={supplier.moq.toLocaleString()} />
              <DecisionMetric label="Lead time" value={`${supplier.lead_time_days} days`} />
              <DecisionMetric label="Quality" value={`${supplier.quality_rating.toFixed(1)}/5`} />
            </div>

            <div className="rounded-lg border border-black/10 bg-[#f7f4ec] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Decision summary</p>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-[#16201d]">
                {decisionReasoning(supplier).map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#2e7d65]" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Panel title="Contact route" icon={Mail}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Preferred path" value={`${channel.label} · ${channel.detail}`} />
              <InfoTile label="Contact owner" value={contactName} />
              <InfoTile label="Payment terms" value={paymentTerms} />
              <InfoTile label="Shipping terms" value={incoterms.length > 0 ? incoterms.join(", ") : "To be confirmed"} />
              <InfoTile label="Port" value={metadata.port ?? "Not listed"} />
              <InfoTile label="Sample time" value={typeof metadata.sample_days === "number" ? `${metadata.sample_days} days` : "Not listed"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {email && (
                <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
                  <a href={`mailto:${email}`}>
                    <Mail className="mr-1.5 h-4 w-4" />
                    Email supplier
                  </a>
                </Button>
              )}
              {phone && (
                <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
                  <a href={`tel:${phone}`}>
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call supplier
                  </a>
                </Button>
              )}
              {website && (
                <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
                  <Link href={website} target="_blank" rel="noreferrer">
                    <Globe2 className="mr-1.5 h-4 w-4" />
                    Visit website
                  </Link>
                </Button>
              )}
            </div>
          </Panel>

          <Panel title="First-order plan" icon={PackageCheck}>
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoTile
                label="Suggested trial order"
                value={`${initialOrderUnits.toLocaleString()} units`}
                note="Starts near a realistic first run instead of jumping straight into a large order."
              />
              <InfoTile
                label="Estimated supplier spend"
                value={formatMoney(initialSpend, false)}
                note="Supplier price only. Shipping, customs, and packaging still need to be added."
              />
              <InfoTile
                label="Reorder trigger"
                value={`${reorderWindow} days before stockout`}
                note="This gives time for production, packing, and freight without leaving shelves empty."
              />
            </div>
          </Panel>

          <Panel title="Risk mitigation before payment" icon={ShieldAlert}>
            <ul className="grid gap-3 text-sm leading-6 text-[#5d6965]">
              {riskMitigationPlan(supplier).map((step) => (
                <li key={step} className="flex items-start gap-2 rounded-md border border-black/10 bg-[#fff8df] px-4 py-3">
                  <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-[#7a5b0f]" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Negotiation checklist" icon={CircleDollarSign}>
            <ul className="grid gap-3 text-sm leading-6 text-[#5d6965]">
              {negotiationChecklist(supplier, paymentTerms, incoterms).map((step) => (
                <li key={step} className="flex items-start gap-2 rounded-md border border-black/10 bg-[#f7f4ec] px-4 py-3">
                  <ClipboardCheck className="mt-1 h-4 w-4 shrink-0 text-[#2e7d65]" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Buyer-ready outreach draft" icon={Truck}>
            <p className="text-sm leading-6 text-[#5d6965]">
              This gives the team a clean first message so the sourcing flow ends in action, not just analysis.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-black/10 bg-[#f7f4ec] p-4 font-sans text-sm leading-6 text-[#16201d]">
              {outreachDraft({
                name: supplier.name,
                product,
                unitPrice: supplier.unit_price_usd,
                moq: supplier.moq,
                leadTime: supplier.lead_time_days,
              })}
            </pre>
          </Panel>

          <section className="rounded-lg border border-[#d9b44a]/30 bg-[#fff8df] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Next move</p>
            <h3 className="mt-2 text-xl font-semibold text-[#16201d]">Keep the journey moving</h3>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              We now have the supplier, the reasoning, the risk checks, and a contact path. The next step is to compare this supplier against alternatives or move into a sample-first conversation.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
                <Link href={`/app?prefill=${encodeURIComponent(`${supplier.subcategory} ${supplier.category}`)}`}>
                  Source similar suppliers
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
                <Link href="/app/compare">
                  Compare with simulation
                  <BarChart3 className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Mail
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede3] text-[#7a5b0f]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-xl font-semibold text-[#16201d]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function DecisionMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">
        <TermLabel label={label} />
      </div>
      <div className="mt-2 text-lg font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function InfoTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f7f4ec] p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[#16201d]">{value}</div>
      {note ? <p className="mt-2 text-xs leading-5 text-[#5d6965]">{note}</p> : null}
    </div>
  )
}
