import Image from "next/image"
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
  Mail,
  MapPin,
  PackageCheck,
  Plane,
  ShipWheel,
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
import { findDemoSupplier } from "@/lib/sourcery/demo-suppliers"
import {
  buildDecisionReasoning,
  buildDecisionRecommendation,
  buildNegotiationChecklist,
  buildOutreachDraft,
  buildRiskMitigationPlan,
} from "@/lib/sourcery/profile-copy"
import { enrichSupplierProfileFields, inferSupplierLogisticsLane } from "@/lib/sourcery/supplier-profile-enrichment"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"

function preferredChannel(row: Record<string, unknown>) {
  const email = typeof row.email === "string" ? row.email : null
  const phone = typeof row.phone === "string" ? row.phone : null
  if (email) return { label: "Email first", detail: email }
  if (phone) return { label: "Phone / WhatsApp first", detail: phone }
  return { label: "Website contact first", detail: "Use the public supplier website form or sourcing desk." }
}

type SupplierDecisionData = {
  supplier: ReturnType<typeof normalizeSupplier>
  metadata: { port?: string; sample_days?: number; incoterms?: string[] }
  paymentTerms: string
  contactName: string
  email: string | null
  phone: string | null
  contactRow: Record<string, unknown>
}

async function loadSupplierDecisionData(id: string): Promise<SupplierDecisionData | null> {
  const demo = findDemoSupplier(id)

  if (demo) {
    const enriched = enrichSupplierProfileFields({ supplier: demo })
    return {
      supplier: demo,
      metadata: enriched.metadata,
      paymentTerms: enriched.paymentTerms,
      contactName: "Sourcing desk",
      email: null,
      phone: null,
      contactRow: {},
    }
  }

  if (!isAdminSupabaseConfigured()) {
    return null
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) return null

  const supplier = normalizeSupplier(data)
  const enriched = enrichSupplierProfileFields({
    supplier,
    metadata: (data.metadata ?? {}) as SupplierDecisionData["metadata"],
    paymentTerms: typeof data.payment_terms === "string" ? data.payment_terms : null,
  })

  return {
    supplier,
    metadata: enriched.metadata,
    paymentTerms: enriched.paymentTerms,
    contactName: typeof data.contact_name === "string" ? data.contact_name : "Sourcing desk",
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    contactRow: data as Record<string, unknown>,
  }
}

export default async function SupplierDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const decisionData = await loadSupplierDecisionData(id)
  if (!decisionData) notFound()

  const { supplier, metadata, paymentTerms, contactName, email, phone, contactRow } = decisionData
  const image = getProductImage({ supplier })
  const incoterms = Array.isArray(metadata.incoterms) ? metadata.incoterms.map(String) : []
  const product = supplier.products?.[0] ?? supplier.subcategory
  const recommendation = buildDecisionRecommendation(supplier)
  const initialOrderUnits = Math.max(supplier.moq, Math.min(supplier.moq * 2, 1500))
  const initialSpend = supplier.unit_price_usd * initialOrderUnits
  const reorderWindow = supplier.lead_time_days + 14
  const channel = preferredChannel(contactRow)
  const logisticsLane = inferSupplierLogisticsLane({ supplier, metadata })

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
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="object-cover"
            />
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
                {buildDecisionReasoning(supplier).map((line) => (
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
              <InfoTile label="Port" value={metadata.port ?? "Main export port"} />
              <InfoTile label="Sample time" value={typeof metadata.sample_days === "number" ? `${metadata.sample_days} days` : "7 days"} />
            </div>

            <div className="mt-4 rounded-xl border border-black/10 bg-[#f7f4ec] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#16201d] text-[#f7f4ec]">
                    <LogisticsIcon mode={logisticsLane.mode} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">{logisticsLane.modeLabel}</p>
                    <h3 className="text-lg font-semibold text-[#16201d]">{logisticsLane.routeLabel}</h3>
                  </div>
                </div>
                <div className="rounded-full bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b0f]">
                  ETA {logisticsLane.etaLabel}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <RouteStop label="Comes from" value={logisticsLane.originLabel} />
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-5 w-5 text-[#7a857f]" />
                </div>
                <RouteStop label="Ends up at" value={logisticsLane.destinationLabel} detail={logisticsLane.destinationDetail} />
              </div>

              <p className="mt-4 text-sm leading-6 text-[#5d6965]">{logisticsLane.rationale}</p>
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
              <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
                <Link href={`/app/compare?supplier=${supplier.id}`}>
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  Profit & simulation
                </Link>
              </Button>
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
              {buildRiskMitigationPlan(supplier).map((step) => (
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
              {buildNegotiationChecklist(supplier, paymentTerms, incoterms).map((step) => (
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
              {buildOutreachDraft({
                supplierName: supplier.name,
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

function LogisticsIcon({ mode }: { mode: "ship" | "air" | "road" }) {
  if (mode === "air") return <Plane className="h-5 w-5" />
  if (mode === "road") return <Truck className="h-5 w-5" />
  return <ShipWheel className="h-5 w-5" />
}

function RouteStop({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#16201d]">{value}</div>
      {detail ? <p className="mt-1 text-xs leading-5 text-[#5d6965]">{detail}</p> : null}
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
