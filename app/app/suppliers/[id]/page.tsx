// Supplier detail page — server-rendered profile for a single supplier.
// Reads the supplier row from Supabase and renders certifications, scorecard,
// risk indicators, and a contact CTA. No AI calls happen here (cost = $0).
import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MapPin, Package, Clock, ShieldCheck, Star, AlertTriangle } from "lucide-react"

// Next.js 16 dynamic params are async — we await them per the App Router contract.
export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Pull the route param out of the awaited promise.
  const { id } = await params

  // Server-side Supabase client; uses the request cookies for any future RLS-aware queries.
  const supabase = await createClient()

  // Fetch the single supplier row by primary key. Because RLS allows public read on suppliers, no auth needed.
  const { data: supplier, error } = await supabase.from("suppliers").select("*").eq("id", id).single()

  // If the row doesn't exist (or an error fired) show the framework's 404 page.
  if (error || !supplier) {
    notFound()
  }

  // Pre-compute display strings so the JSX stays readable.
  const certs: string[] = supplier.certifications ?? []
  const riskLabel = supplier.risk_score < 25 ? "Low risk" : supplier.risk_score < 40 ? "Moderate risk" : "Elevated risk"
  const riskTone =
    supplier.risk_score < 25
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
      : supplier.risk_score < 40
        ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
        : "bg-red-500/10 text-red-700 border-red-500/30"

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8 md:py-16">
      {/* Back link to the chat — keeps users in the agent flow rather than the landing page. */}
      <Link
        href="/app"
        className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sourcing
      </Link>

      {/* Hero block — name, location, headline scorecard. */}
      <header className="border-b border-border/60 pb-10">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span>{supplier.category}</span>
          <span aria-hidden>·</span>
          <span>{supplier.subcategory}</span>
          {/* BGMEA badge surfaced when applicable — relevant for Bangladesh apparel buyers. */}
          {supplier.bgmea_certified && (
            <>
              <span aria-hidden>·</span>
              <span className="text-foreground">BGMEA member</span>
            </>
          )}
        </div>
        <h1 className="mt-3 font-serif text-4xl italic leading-[1.05] tracking-tight md:text-5xl">{supplier.name}</h1>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            {supplier.city}, {supplier.country} · {supplier.region}
          </span>
        </div>
        <p className="mt-6 max-w-3xl text-pretty text-base leading-relaxed text-foreground/80">{supplier.description}</p>
      </header>

      {/* Scorecard grid — six stat tiles in a single flex/grid row. */}
      <section aria-label="Supplier scorecard" className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile icon={<Package className="h-4 w-4" />} label="Unit price" value={`$${supplier.unit_price_usd}`} />
        <StatTile icon={<Package className="h-4 w-4" />} label="MOQ" value={`${supplier.moq.toLocaleString()} units`} />
        <StatTile icon={<Clock className="h-4 w-4" />} label="Lead time" value={`${supplier.lead_time_days} days`} />
        <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="On-time rate" value={`${supplier.on_time_rate}%`} />
        <StatTile icon={<Star className="h-4 w-4" />} label="Quality rating" value={`${supplier.quality_rating} / 5`} />
        <StatTile
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Country risk"
          value={`${supplier.risk_score} / 100`}
          accent={riskTone}
          accentLabel={riskLabel}
        />
      </section>

      {/* Certifications — chips of all certs listed on the supplier row. */}
      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Certifications</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {certs.length === 0 ? (
            <span className="text-sm text-muted-foreground">No certifications listed.</span>
          ) : (
            certs.map((c) => (
              <Badge key={c} variant="outline" className="rounded-full border-border/70 px-3 py-1 text-xs font-normal">
                {c}
              </Badge>
            ))
          )}
        </div>
      </section>

      {/* Why-this-supplier card — placeholder copy until we wire saved-search drilldown. */}
      <Card className="mt-10 border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">How Sourcery scored this supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/80">
          <p>
            Run a sourcing query that returns this supplier and Sourcery&apos;s Discovery, Risk, and Comparison agents
            will produce a tailored explanation referencing this supplier&apos;s exact data — unit price, on-time rate,
            certifications, and risk profile.
          </p>
          <p>
            With Bangladesh Mode enabled, the agent additionally reduces the country-risk penalty by 20% for South
            Asian suppliers and produces a Bangla outreach message ready to send.
          </p>
          <Button asChild className="rounded-full">
            <Link href={`/app?prefill=${encodeURIComponent(supplier.subcategory + " " + supplier.category)}`}>
              Run a sourcing query for {supplier.subcategory}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

// Small presentational tile used in the scorecard grid — keeps the page JSX tidy.
function StatTile({
  icon,
  label,
  value,
  accent,
  accentLabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
  accentLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 font-serif text-2xl tracking-tight">{value}</div>
      {/* Optional accent pill — currently used for the country-risk tier label. */}
      {accentLabel && accent && (
        <span className={`mt-3 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${accent}`}>
          {accentLabel}
        </span>
      )}
    </div>
  )
}
