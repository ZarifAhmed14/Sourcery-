// Pricing tiers section.
// Three clean editorial cards — Starter, Growth, Enterprise.
// The middle tier is highlighted as recommended.

// Link for tier CTAs.
import Link from "next/link"
// Shared button.
import { Button } from "@/components/ui/button"
// Lucide check icon for feature lists.
import { Check } from "lucide-react"

// Server Component.
export function Pricing() {
  // Static tier definitions to keep markup simple.
  const tiers = [
    {
      name: "Starter",
      price: "$0",
      cadence: "Forever free",
      blurb: "For founders sourcing their first SKU.",
      features: [
        "5 sourcing runs per month",
        "Up to 10 suppliers per shortlist",
        "Comparison scorecards",
        "Saved searches",
      ],
      cta: "Start free",
      featured: false,
    },
    {
      name: "Growth",
      price: "$49",
      cadence: "per seat / month",
      blurb: "For brands scaling SKU count and reorder velocity.",
      features: [
        "Unlimited sourcing runs",
        "Up to 50 suppliers per shortlist",
        "Bargain Copilot · Bangladesh Mode",
        "What-if simulation engine",
        "Profit Intelligence Engine",
      ],
      cta: "Start a 14-day trial",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      cadence: "Annual",
      blurb: "For sourcing teams and private-label retailers.",
      features: [
        "Everything in Growth",
        "Custom supplier index integrations",
        "API access · SOC 2 controls",
        "Dedicated solutions engineer",
      ],
      cta: "Talk to sales",
      featured: false,
    },
  ]

  // Wrapper section anchored from nav.
  return (
    <section id="pricing" className="border-t border-border/70">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Eyebrow + headline grid. */}
        <div className="mb-16 grid gap-6 md:grid-cols-12">
          {/* Eyebrow on the left. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pricing</p>
          </div>
          {/* Headline on the right. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Pay for outcomes, <em className="italic">not seats.</em>
            </h2>
          </div>
        </div>

        {/* Three-tier grid. */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Render each tier card. */}
          {tiers.map((t) => (
            <div
              key={t.name}
              // Featured tier gets the dark treatment to stand out.
              className={`flex flex-col rounded-2xl border p-8 ${
                t.featured
                  ? "border-foreground bg-foreground text-primary-foreground"
                  : "border-border/70 bg-card text-foreground"
              }`}
            >
              {/* Top — name and "Recommended" badge for featured tier. */}
              <div className="flex items-center justify-between">
                {/* Tier name. */}
                <p className="text-xs uppercase tracking-[0.22em]">{t.name}</p>
                {/* Featured badge — lime accent on dark. */}
                {t.featured ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
                    Recommended
                  </span>
                ) : null}
              </div>

              {/* Big price line. */}
              <p className="mt-8 font-serif text-6xl leading-none tracking-tight">{t.price}</p>
              {/* Cadence label below price. */}
              <p
                className={`mt-2 text-sm ${
                  t.featured ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {t.cadence}
              </p>

              {/* Tier blurb. */}
              <p
                className={`mt-6 text-sm leading-relaxed ${
                  t.featured ? "text-primary-foreground/85" : "text-muted-foreground"
                }`}
              >
                {t.blurb}
              </p>

              {/* Hairline separating blurb from features. */}
              <div
                className={`my-6 h-px w-full ${
                  t.featured ? "bg-primary-foreground/15" : "bg-border/70"
                }`}
              />

              {/* Feature list. */}
              <ul className="mb-8 flex-1 space-y-3">
                {/* Map each feature to a row with a check icon. */}
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    {/* Lime check on dark, foreground check on light. */}
                    <Check
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        t.featured ? "text-accent" : "text-foreground"
                      }`}
                      aria-hidden="true"
                    />
                    {/* Feature text. */}
                    <span
                      className={
                        t.featured ? "text-primary-foreground/85" : "text-muted-foreground"
                      }
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Tier CTA — invert variant for featured. */}
              <Button
                asChild
                size="lg"
                variant={t.featured ? "secondary" : "default"}
                className="rounded-full"
              >
                <Link href="/app">{t.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
