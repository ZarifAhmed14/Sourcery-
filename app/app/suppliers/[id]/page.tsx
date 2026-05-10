import Link from "next/link"
import type { ComponentType } from "react"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Clock,
  ExternalLink,
  Factory,
  Globe2,
  MapPin,
  Package,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"
import { normalizeSupplier } from "@/lib/sourcery/supplier-normalizer"

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isAdminSupabaseConfigured()) notFound()

  const supabase = getAdminClient()
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle()
  if (error || !data) notFound()

  const supplier = normalizeSupplier(data)
  const metadata = (data.metadata ?? {}) as { port?: string; sample_days?: number; incoterms?: string[] }
  const products: string[] = Array.isArray(data.products) ? data.products.map((product: unknown) => String(product)) : []
  const paymentTerms = typeof data.payment_terms === "string" ? data.payment_terms : "Quoted during outreach"
  const website = typeof data.website === "string" && data.website.startsWith("http") ? data.website : supplier.source_url
  const riskTone =
    supplier.risk_score <= 30
      ? "border-emerald-500/25 bg-emerald-50 text-emerald-800"
      : supplier.risk_score <= 55
        ? "border-amber-500/25 bg-amber-50 text-amber-800"
        : "border-red-500/25 bg-red-50 text-red-800"

  return (
    <div className="space-y-6">
      <Link href="/app" className="inline-flex items-center gap-2 text-sm font-medium text-[#5d6965] hover:text-[#16201d]">
        <ArrowLeft className="h-4 w-4" />
        Back to sourcing
      </Link>

      <section className="rounded-lg border border-black/10 bg-[#16201d] p-7 text-[#f7f4ec] shadow-sm md:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-md bg-[#d9b44a] text-[#16201d] hover:bg-[#d9b44a]">{supplier.category}</Badge>
              <Badge variant="outline" className="rounded-md border-white/15 text-[#e8eee9]">
                {supplier.source_type === "public_web" ? "public source" : "synthetic profile"}
              </Badge>
              {supplier.bgmea_certified && <Badge className="rounded-md bg-[#2e7d65] text-white hover:bg-[#2e7d65]">BGMEA</Badge>}
            </div>
            <h1 className="mt-4 font-serif text-5xl leading-none md:text-6xl">{supplier.name}</h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#bdc8c2]">
              <MapPin className="h-4 w-4" />
              {supplier.city}, {supplier.country} · {supplier.region}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#dbe5df]">{supplier.description}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Decision scorecard</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <HeroStat label="Unit" value={`$${supplier.unit_price_usd.toFixed(2)}`} />
              <HeroStat label="MOQ" value={supplier.moq.toLocaleString()} />
              <HeroStat label="Lead" value={`${supplier.lead_time_days}d`} />
              <HeroStat label="Quality" value={`${supplier.quality_rating.toFixed(1)}/5`} />
            </div>
            <div className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${riskTone}`}>
              Risk score {supplier.risk_score}/100 · {supplier.risk_level ?? "medium"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#16201d]">Supplier facts</h2>
          <div className="mt-5 grid gap-3">
            <Fact icon={Factory} label="Monthly capacity" value={typeof data.monthly_capacity === "number" ? data.monthly_capacity.toLocaleString() : "Not listed"} />
            <Fact icon={Clock} label="On-time rate" value={`${supplier.on_time_rate}%`} />
            <Fact icon={ShieldCheck} label="Payment terms" value={paymentTerms} />
            <Fact icon={Globe2} label="Port" value={metadata.port ?? "Not listed"} />
            <Fact icon={Box} label="Sample time" value={typeof metadata.sample_days === "number" ? `${metadata.sample_days} days` : "Not listed"} />
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
            <h2 className="text-xl font-semibold text-[#16201d]">Products this profile can support</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {products.map((product) => (
                <Badge key={product} variant="outline" className="rounded-md border-black/10 bg-[#f7f4ec] text-[#16201d]">
                  <Package className="mr-1.5 h-3.5 w-3.5" />
                  {product}
                </Badge>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#16201d]">Certifications and risk notes</h2>
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
            <div className="mt-5 rounded-md border border-black/10 bg-[#f7f4ec] p-4 text-sm leading-6 text-[#5d6965]">
              <ShieldAlert className="mb-2 h-5 w-5 text-[#7a5b0f]" />
              {supplier.risk_notes ?? "Risk note unavailable. Use a sample order before committing to bulk production."}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-[#fff8df] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Next action</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">Run this supplier through the full agent flow</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">Prefill Sourcery with this supplier category, then compare, bargain, and simulate from one run.</p>
          </div>
          <Button asChild className="rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0d1714] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#91a19a]">{label}</div>
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
