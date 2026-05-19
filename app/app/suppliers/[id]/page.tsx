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
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyValue } from "@/components/sourcery/currency-value"
import { TermLabel } from "@/components/sourcery/term-help"
import { findDemoSupplier } from "@/lib/sourcery/demo-suppliers"
import { enrichSupplierProfileFields } from "@/lib/sourcery/supplier-profile-enrichment"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"
import { getProductImage } from "@/lib/product-images"

function buyerRiskNote(supplier: ReturnType<typeof normalizeSupplier>) {
  const product = supplier.products?.[0] ?? supplier.subcategory
  const distance =
    supplier.country === "Bangladesh"
      ? "The supplier is closer to the Bangladesh sourcing base, so communication and checks are easier, but samples still need approval before bulk production."
      : "The goods need cross-border shipping, so customs delay, packaging damage, or freight changes can affect the final delivery date."
  const quality =
    "Material quality, color, finish, stitching, labels, and packaging can differ from the sample if the buyer does not confirm specs clearly."
  const order =
    supplier.moq >= 1200
      ? "The minimum order is high, so a bad batch would lock more cash into slow-moving stock."
      : "The minimum order is workable for a test run, but inspection is still important before scaling."

  return `${product} needs careful quality control. ${quality} ${distance} ${order}`
}

function operationalFitNote(supplier: ReturnType<typeof normalizeSupplier>) {
  const rating = supplier.quality_rating.toFixed(1)
  const lead =
    supplier.lead_time_days <= 25
      ? "The lead time is short, so this supplier is better for fast testing or urgent restocks."
      : supplier.lead_time_days <= 45
        ? "The lead time is normal for export buying, so the buyer should plan production and shipping dates early."
        : "The lead time is long, so this supplier is better for planned seasonal orders than urgent restocks."
  const moq =
    supplier.moq <= 500
      ? "The MOQ is low, which makes it easier to test demand without buying too much stock."
      : supplier.moq <= 1200
        ? "The MOQ is moderate, so the buyer should be confident about demand before placing the order."
        : "The MOQ is high, so the buyer needs enough cash and storage before committing."

  return `${moq} ${lead} The ${rating}/5 quality rating suggests the supplier is worth considering, but samples should still be checked before bulk production.`
}

function demandGuidanceNote(supplier: ReturnType<typeof normalizeSupplier>) {
  const product = supplier.products?.[0] ?? supplier.subcategory
  const reorderBuffer = supplier.lead_time_days + 14
  const testOrder =
    supplier.moq <= 500
      ? `A first order near the ${supplier.moq.toLocaleString()} unit MOQ is reasonable for testing demand.`
      : `Because the MOQ is ${supplier.moq.toLocaleString()} units, the buyer should only order after checking expected sales and storage space.`
  const reorder =
    supplier.lead_time_days <= 30
      ? `Plan reorder decisions about ${reorderBuffer} days before stock runs out so production and shipping do not interrupt sales.`
      : `This is a slower supplier, so reorder planning should start about ${reorderBuffer} days before stock runs out.`

  return `${product} should be treated as a margin-and-inventory decision, not just a cheap quote. ${testOrder} ${reorder}`
}

function negotiationDraft(supplier: ReturnType<typeof normalizeSupplier>) {
  const product = supplier.products?.[0] ?? supplier.subcategory
  return [
    `Hello ${supplier.name} team,`,
    `We are reviewing suppliers for ${product}. Your quote profile shows ${supplier.moq.toLocaleString()} MOQ, ${supplier.lead_time_days} day lead time, and a unit price around $${supplier.unit_price_usd.toFixed(2)}.`,
    "Before moving forward, can you confirm sample availability, packaging options, final inspection process, and whether there is room to improve the unit price for a repeat order?",
    "If the sample quality is strong, we would like to discuss a first test order and a scaling plan.",
  ].join("\n\n")
}

type SupplierPageData = {
  supplier: ReturnType<typeof normalizeSupplier>
  metadata: { port?: string; sample_days?: number; incoterms?: string[] }
  paymentTerms: string
  website: string | null
  monthlyCapacity: number | null
}

async function loadSupplierPageData(id: string): Promise<SupplierPageData | null> {
  const demo = findDemoSupplier(id)

  if (!isAdminSupabaseConfigured()) {
    if (!demo) return null
    const enriched = enrichSupplierProfileFields({ supplier: demo })
    return {
      supplier: demo,
      metadata: enriched.metadata,
      paymentTerms: enriched.paymentTerms,
      website: demo.source_url ?? null,
      monthlyCapacity: enriched.monthlyCapacity,
    }
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) {
    if (!demo) return null
    const enriched = enrichSupplierProfileFields({ supplier: demo })
    return {
      supplier: demo,
      metadata: enriched.metadata,
      paymentTerms: enriched.paymentTerms,
      website: demo.source_url ?? null,
      monthlyCapacity: enriched.monthlyCapacity,
    }
  }

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

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const pageData = await loadSupplierPageData(id)
  if (!pageData) notFound()

  const { supplier, metadata, paymentTerms, website, monthlyCapacity } = pageData
  const image = getProductImage({ supplier })
  const riskTone =
    supplier.risk_score <= 30
      ? "border-emerald-500/25 bg-emerald-50 text-emerald-800"
      : supplier.risk_score <= 55
        ? "border-amber-500/25 bg-amber-50 text-amber-800"
        : "border-red-500/25 bg-red-50 text-red-800"

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
            <img src={image.src} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16201d]/88 via-[#16201d]/25 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d58d]">Product capability</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#eef7f1]">{(supplier.products ?? [supplier.subcategory]).slice(0, 3).join(", ")}</p>
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
              {supplier.city}, {supplier.country} · {supplier.region}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#dbe5df]">{supplier.description}</p>
            <div className="mt-7 rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Decision scorecard</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroStat label="Unit" value={<CurrencyValue usd={supplier.unit_price_usd} />} />
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
            <h2 className="text-xl font-semibold text-[#16201d]">Operational fit</h2>
            <div className="mt-4 rounded-md border border-black/10 bg-[#f7f4ec] p-4 text-sm leading-6 text-[#5d6965]">
              <Factory className="mb-2 h-5 w-5 text-[#2e7d65]" />
              {operationalFitNote(supplier)}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Risk explanation</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              What could go wrong and what the buyer should check before ordering.
            </p>
            <div className="mt-4 rounded-md border border-black/10 bg-[#fff8df] p-4 text-sm leading-6 text-[#5d6965]">
              <ShieldAlert className="mb-2 h-5 w-5 text-[#7a5b0f]" />
              {buyerRiskNote(supplier)}
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
              {demandGuidanceNote(supplier)}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Supplier negotiation draft</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">A simple first message the buyer can customize before contacting the supplier.</p>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-black/10 bg-[#f7f4ec] p-4 font-sans text-sm leading-6 text-[#16201d]">
              {negotiationDraft(supplier)}
            </pre>
          </section>
        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-[#fff8df] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Next action</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">Move from analysis into supplier decision</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">Open the decision page to see contact route, first-order plan, negotiation checklist, and buyer-ready next steps.</p>
          </div>
          <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
            <Link href={`/app/decision/${supplier.id}`}>
              Open supplier decision
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
