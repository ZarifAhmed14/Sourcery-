import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ComponentType, ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Plane,
  Route,
  ShieldAlert,
  ShipWheel,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrencyValue } from "@/components/sourcery/currency-value"
import { formatMoney } from "@/lib/currency"
import { getProductImage } from "@/lib/product-images"
import { findDemoSupplier } from "@/lib/sourcery/demo-suppliers"
import { buildNegotiationDraft, buildNegotiationChecklist } from "@/lib/sourcery/profile-copy"
import { enrichSupplierProfileFields, inferSupplierLogisticsLane } from "@/lib/sourcery/supplier-profile-enrichment"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"

function contactChannel(row: Record<string, unknown>) {
  const email = typeof row.email === "string" ? row.email : null
  const phone = typeof row.phone === "string" ? row.phone : null
  if (email) return { label: "Email first", value: email, href: `mailto:${email}`, icon: Mail }
  if (phone) return { label: "Phone / WhatsApp first", value: phone, href: `tel:${phone}`, icon: Phone }
  return { label: "Website contact first", value: "Use supplier website or sourcing desk", href: null, icon: Mail }
}

type ContactPageData = {
  supplier: ReturnType<typeof normalizeSupplier>
  metadata: { port?: string; sample_days?: number; incoterms?: string[] }
  paymentTerms: string
  email: string | null
  phone: string | null
  website: string | null
  contactRow: Record<string, unknown>
}

async function loadContactPageData(id: string): Promise<ContactPageData | null> {
  const demo = findDemoSupplier(id)

  if (demo) {
    const enriched = enrichSupplierProfileFields({ supplier: demo })
    return {
      supplier: demo,
      metadata: enriched.metadata,
      paymentTerms: enriched.paymentTerms,
      email: null,
      phone: null,
      website: demo.source_url ?? null,
      contactRow: {},
    }
  }

  if (!isAdminSupabaseConfigured()) return null

  const supabase = getAdminClient()
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const supplier = normalizeSupplier(data)
  const enriched = enrichSupplierProfileFields({
    supplier,
    metadata: (data.metadata ?? {}) as ContactPageData["metadata"],
    paymentTerms: typeof data.payment_terms === "string" ? data.payment_terms : null,
  })

  return {
    supplier,
    metadata: enriched.metadata,
    paymentTerms: enriched.paymentTerms,
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    website: typeof data.website === "string" && data.website.startsWith("http") ? data.website : supplier.source_url,
    contactRow: data as Record<string, unknown>,
  }
}

export default async function SupplierContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pageData = await loadContactPageData(id)
  if (!pageData) notFound()

  const { supplier, metadata, paymentTerms, email, website, contactRow } = pageData
  const product = supplier.products?.[0] ?? supplier.subcategory
  const image = getProductImage({ supplier })
  const incoterms = Array.isArray(metadata.incoterms) ? metadata.incoterms.map(String) : []
  const lane = inferSupplierLogisticsLane({ supplier, metadata })
  const channel = contactChannel(contactRow)
  const ChannelIcon = channel.icon
  const draft = buildNegotiationDraft({
    supplierName: supplier.name,
    product,
    unitPrice: supplier.unit_price_usd,
    moq: supplier.moq,
    leadTime: supplier.lead_time_days,
  })
  const estimatedSampleWindow = typeof metadata.sample_days === "number" ? `${metadata.sample_days} days` : "7 days"
  const trialUnits = Math.max(supplier.moq, Math.min(supplier.moq * 2, 1500))
  const supplierSpend = trialUnits * supplier.unit_price_usd

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/app/suppliers/${supplier.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[#5d6965] hover:text-[#16201d]">
          <ArrowLeft className="h-4 w-4" />
          Back to supplier profile
        </Link>
        <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
          <Link href={`/app/compare?supplier=${supplier.id}`}>
            Profit & simulation
            <BarChart3 className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-[#16201d] text-[#f7f4ec] shadow-sm">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[320px] bg-[#0d1714]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16201d]/90 via-[#16201d]/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d58d]">Supplier contact desk</p>
              <h1 className="mt-2 font-serif text-4xl leading-none md:text-5xl">Contact {supplier.name}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-[#dbe5df]">
                <MapPin className="h-4 w-4" />
                {supplier.city}, {supplier.country} - {supplier.region}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Move from analysis to outreach</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">Everything needed before the first supplier message.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#c9d7d2]">
              Use this page to confirm the contact path, sample ask, payment terms, logistics route, and negotiation draft before sending outreach.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMetric label="Unit price" value={<CurrencyValue usd={supplier.unit_price_usd} />} />
              <HeroMetric label="MOQ" value={supplier.moq.toLocaleString()} />
              <HeroMetric label="Lead" value={`${supplier.lead_time_days}d`} />
              <HeroMetric label="Sample" value={estimatedSampleWindow} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Panel title="Contact route" icon={Mail}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Preferred path" value={channel.label} note={channel.value} />
              <InfoTile label="Email" value={email ?? "Not listed"} note={email ? "Use for first supplier outreach." : "Use website or sourcing desk if no email is listed."} />
              <InfoTile label="Website" value={website ? "Available" : "Not listed"} note={website ?? "Use sourcing desk details."} />
              <InfoTile label="Payment terms" value={paymentTerms} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {channel.href ? (
                <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
                  <a href={channel.href}>
                    <ChannelIcon className="mr-1.5 h-4 w-4" />
                    Start contact
                  </a>
                </Button>
              ) : null}
              {website ? (
                <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
                  <a href={website} target="_blank" rel="noreferrer">
                    Open supplier website
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel title="First contact checklist" icon={ClipboardCheck}>
            <ul className="grid gap-3 text-sm leading-6 text-[#5d6965]">
              {buildNegotiationChecklist(supplier, paymentTerms, incoterms).map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-md border border-black/10 bg-[#f7f4ec] px-4 py-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#2e7d65]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Sample and order planning" icon={PackageCheck}>
            <PlanningSlider
              sampleWindow={estimatedSampleWindow}
              trialUnits={`${trialUnits.toLocaleString()} units`}
              supplierSpend={formatMoney(supplierSpend, false)}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Supplier negotiation draft" icon={Copy}>
            <p className="text-sm leading-6 text-[#5d6965]">
              Copy this into email, WhatsApp, or the supplier contact form, then adjust the tone before sending.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-black/10 bg-[#f7f4ec] p-4 font-sans text-sm leading-6 text-[#16201d]">
              {draft}
            </pre>
          </Panel>

          <Panel title="Logistics note" icon={Route}>
            <div className="rounded-xl border border-black/10 bg-[#f7f4ec] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#16201d] text-[#f7f4ec]">
                    <LogisticsIcon mode={lane.mode} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">{lane.modeLabel}</p>
                    <h3 className="text-lg font-semibold text-[#16201d]">{lane.routeLabel}</h3>
                  </div>
                </div>
                <div className="rounded-full bg-[#fff8df] px-3 py-1 text-xs font-semibold text-[#7a5b0f]">ETA {lane.etaLabel}</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <RouteStop label="Comes from" value={lane.originLabel} />
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-5 w-5 text-[#7a857f]" />
                </div>
                <RouteStop label="Ends up at" value={lane.destinationLabel} detail={lane.destinationDetail} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#5d6965]">{lane.rationale}</p>
            </div>
          </Panel>
        </div>
      </section>
    </div>
  )
}

function HeroMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0d1714] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#91a19a]">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede3] text-[#7a5b0f]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-xl font-semibold text-[#16201d]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function InfoTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f7f4ec] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#16201d] break-words">{value}</div>
      {note ? <div className="mt-1 text-xs leading-5 text-[#5d6965] break-words">{note}</div> : null}
    </div>
  )
}

function PlanningSlider({
  sampleWindow,
  trialUnits,
  supplierSpend,
}: {
  sampleWindow: string
  trialUnits: string
  supplierSpend: string
}) {
  const points = [
    { label: "Sample", value: sampleWindow, note: "Approve quality first." },
    { label: "Trial order", value: trialUnits, note: "Start near MOQ." },
    { label: "Supplier spend", value: supplierSpend, note: "Before freight." },
  ]

  return (
    <div className="rounded-xl border border-black/10 bg-[#f7f4ec] p-4">
      <div className="relative">
        <div className="absolute left-6 right-6 top-5 h-1 rounded-full bg-[#e5ddce]" />
        <div className="absolute left-6 top-5 h-1 w-[58%] rounded-full bg-[#7fb7a7]" />
        <div className="relative grid gap-4 sm:grid-cols-3">
          {points.map((point, index) => (
            <div key={point.label} className="text-center">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border-4 border-[#f7f4ec] bg-[#16201d] text-sm font-bold text-[#f7f4ec] shadow-sm">
                {index + 1}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">{point.label}</p>
              <p className="mt-1 text-lg font-semibold text-[#16201d]">{point.value}</p>
              <p className="mt-1 text-xs leading-5 text-[#5d6965]">{point.note}</p>
            </div>
          ))}
        </div>
      </div>
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
      {detail ? <div className="mt-1 text-xs leading-5 text-[#5d6965]">{detail}</div> : null}
    </div>
  )
}
