import Image from "next/image"
import Link from "next/link"
import type { ComponentType, ReactNode } from "react"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Box,
  Clock,
  ExternalLink,
  Factory,
  Globe2,
  MapPin,
  Plane,
  ShipWheel,
  ShieldAlert,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyValue } from "@/components/sourcery/currency-value"
import { TermLabel } from "@/components/sourcery/term-help"
import { findDemoSupplier } from "@/lib/sourcery/demo-suppliers"
import { buildDemandGuidanceNote, buildOperationalFitNote, buildRiskNote } from "@/lib/sourcery/profile-copy"
import { enrichSupplierProfileFields, inferSupplierLogisticsLane } from "@/lib/sourcery/supplier-profile-enrichment"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"
import { getProductImage } from "@/lib/product-images"

type SupplierPageData = {
  supplier: ReturnType<typeof normalizeSupplier>
  metadata: { port?: string; sample_days?: number; incoterms?: string[] }
  paymentTerms: string
  website: string | null
  monthlyCapacity: number | null
}

async function loadSupplierPageData(id: string): Promise<SupplierPageData | null> {
  const demo = findDemoSupplier(id)

  if (demo) {
    const enriched = enrichSupplierProfileFields({ supplier: demo })
    return {
      supplier: demo,
      metadata: enriched.metadata,
      paymentTerms: enriched.paymentTerms,
      website: demo.source_url ?? null,
      monthlyCapacity: enriched.monthlyCapacity,
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
    metadata: (data.metadata ?? {}) as SupplierPageData["metadata"],
    paymentTerms: typeof data.payment_terms === "string" ? data.payment_terms : null,
    monthlyCapacity: typeof data.monthly_capacity === "number" ? data.monthly_capacity : null,
  })

  return {
    supplier,
    metadata: enriched.metadata,
    paymentTerms: enriched.paymentTerms,
    website: typeof data.website === "string" && data.website.startsWith("http") ? data.website : supplier.source_url,
    monthlyCapacity: enriched.monthlyCapacity,
  }
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ product?: string; type?: string; size?: string }>
}) {
  const { id } = await params
  const context = await searchParams

  const pageData = await loadSupplierPageData(id)
  if (!pageData) notFound()

  const { supplier, metadata, paymentTerms, website, monthlyCapacity } = pageData
  const image = getProductImage({ supplier, product: context?.product, variant: context?.type })
  const selectedProductLabel = [context?.type ?? context?.product ?? supplier.products?.[0] ?? supplier.subcategory, context?.size].filter(Boolean).join(" / ")
  const logisticsLane = inferSupplierLogisticsLane({ supplier, metadata })
  const riskTone =
    supplier.risk_score <= 30
      ? "border-emerald-500/25 bg-emerald-50 text-emerald-800"
      : supplier.risk_score <= 55
        ? "border-amber-500/25 bg-amber-50 text-amber-800"
        : "border-red-500/25 bg-red-50 text-red-800"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
          <Link href={`/app/suppliers/${supplier.id}/contact`}>
            Contact supplier
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
          <Link href={`/app/compare?supplier=${supplier.id}`}>
            Profit & simulation
            <BarChart3 className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-[#16201d] text-[#f7f4ec] shadow-sm">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative min-h-[340px] bg-[#0d1714]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16201d]/88 via-[#16201d]/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d58d]">Product capability</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#eef7f1]">{selectedProductLabel}</p>
            </div>
          </div>
          <div className="p-7 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-[#d9b44a] text-[#16201d] hover:bg-[#d9b44a]">{supplier.category}</Badge>
              <Badge variant="outline" className="rounded-md border-white/15 text-[#e8eee9]">
                {supplier.source_type === "public_web" ? "public source" : "demo profile"}
              </Badge>
              {supplier.bgmea_certified && <Badge className="rounded-md bg-[#2e7d65] text-white hover:bg-[#2e7d65]">BGMEA</Badge>}
            </div>
            <h1 className="mt-4 font-serif text-5xl leading-none md:text-6xl">{supplier.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#bdc8c2]">
              <MapPin className="h-4 w-4" />
              {supplier.city}, {supplier.country} - {supplier.region}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#dbe5df]">{supplier.description}</p>
            <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Decision scorecard</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroStat label="Unit price" value={<CurrencyValue usd={supplier.unit_price_usd} />} />
                <HeroStat label="MOQ" value={supplier.moq.toLocaleString()} />
                <HeroStat label="Lead" value={`${supplier.lead_time_days}d`} />
                <HeroStat label="Quality" value={`${supplier.quality_rating.toFixed(1)}/5`} />
              </div>
              <div className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold capitalize ${riskTone}`}>
                {supplier.risk_level ?? "medium"} risk supplier
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#16201d]">Supplier facts</h2>
          <div className="mt-5 grid gap-3">
            <Fact icon={Factory} label="Monthly capacity" value={monthlyCapacity ? monthlyCapacity.toLocaleString() : "Estimated during profile build"} />
            <Fact icon={Clock} label="On-time rate" value={`${supplier.on_time_rate}%`} />
            <Fact icon={ShieldCheck} label="Payment terms" value={paymentTerms} />
            <Fact icon={Globe2} label="Port" value={metadata.port ?? "Main export port"} />
            <Fact icon={Box} label="Sample time" value={`${metadata.sample_days ?? 7} days`} />
          </div>
          {website && (
            <Button asChild variant="outline" className="mt-5 w-full rounded-md bg-transparent">
              <Link href={website} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Open source website
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Best logistics lane</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              A practical route suggestion based on supplier location, shipment profile, and the export hub already attached to this supplier.
            </p>
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
                <RouteStop label="Origin" value={logisticsLane.originLabel} />
                <div className="hidden justify-center md:flex">
                  <ArrowRight className="h-5 w-5 text-[#7a857f]" />
                </div>
                <RouteStop label="Likely arrival" value={logisticsLane.destinationLabel} detail={logisticsLane.destinationDetail} />
              </div>

              <p className="mt-4 text-sm leading-6 text-[#5d6965]">{logisticsLane.rationale}</p>
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Operational fit</h2>
            <div className="mt-4 rounded-md border border-black/10 bg-[#f7f4ec] p-4 text-sm leading-6 text-[#5d6965]">
              <Factory className="mb-2 h-5 w-5 text-[#2e7d65]" />
              {buildOperationalFitNote(supplier)}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Risk explanation</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              What could go wrong and what the buyer should check before ordering.
            </p>
            <div className="mt-4 rounded-md border border-black/10 bg-[#fff8df] p-4 text-sm leading-6 text-[#5d6965]">
              <ShieldAlert className="mb-2 h-5 w-5 text-[#7a5b0f]" />
              {buildRiskNote(supplier)}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Certifications</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {supplier.certifications.length > 0 ? (
                supplier.certifications.map((cert) => (
                  <Badge key={cert} className="rounded-md bg-[#eaf3ef] text-[#1b6a54] hover:bg-[#eaf3ef]">
                    <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                    {cert}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-[#6d7a75]">No certifications listed.</span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Demand and reorder guidance</h2>
            <div className="mt-4 rounded-md border border-black/10 bg-[#f7f4ec] p-4 text-sm leading-6 text-[#5d6965]">
              <BarChart3 className="mb-2 h-5 w-5 text-[#2e7d65]" />
              {buildDemandGuidanceNote(supplier)}
            </div>
          </section>

        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-[#fff8df] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Next action</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">Move from analysis into supplier contact</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">Open the contact desk to review the contact route, sample ask, negotiation checklist, and buyer-ready outreach draft.</p>
          </div>
          <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
            <Link href={`/app/suppliers/${supplier.id}/contact`}>
              Contact supplier
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
            <Link href={`/app/compare?supplier=${supplier.id}`}>
              Profit & simulation
              <BarChart3 className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md border-black/10 bg-transparent text-[#16201d] hover:bg-[#f1ede3]">
            <Link href={`/app?prefill=${encodeURIComponent(`${supplier.subcategory} ${supplier.category}`)}`}>
              Source similar suppliers
              <Star className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0d1714] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#91a19a]">
        <TermLabel label={label} />
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-black/10 bg-[#f7f4ec] p-3">
      <Icon className="mt-0.5 h-4 w-4 text-[#2e7d65]" />
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
        <div className="mt-1 text-sm font-medium text-[#16201d]">{value}</div>
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
