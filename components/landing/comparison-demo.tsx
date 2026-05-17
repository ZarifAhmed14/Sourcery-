// Static visual mock of the supplier comparison table.
// Used on the landing page to show prospects what Sourcery's output looks like.
// No real data fetching here — this is a pure presentational preview.

// Lucide icons for the rank arrow and the lime "winner" mark.
import { ArrowRight, Sparkles } from "lucide-react"

// Server Component — static.
export function ComparisonDemo() {
  // Hard-coded supplier rows to mimic a real shortlist.
  // These mirror the schema we'll seed in Phase 3 (suppliers table).
  const rows = [
    {
      // Ordinal rank in the demo result.
      rank: 1,
      // Supplier name and country.
      name: "Padma Knit Composite",
      country: "Bangladesh",
      // Pricing per unit in USD.
      price: 6.4,
      // Production lead time in days.
      lead: 22,
      // Minimum order quantity.
      moq: 300,
      // On-time delivery rate as a percentage.
      otr: 97,
      // Quality rating on a 0–5 scale.
      quality: 4.6,
      // Confidence label coming from the Discovery Agent.
      confidence: "high",
      // Whether this row is highlighted as the recommendation.
      winner: true,
    },
    {
      rank: 2,
      name: "Tiruppur Cotton Co.",
      country: "India",
      price: 6.1,
      lead: 28,
      moq: 500,
      otr: 92,
      quality: 4.4,
      confidence: "high",
      winner: false,
    },
    {
      rank: 3,
      name: "Hangzhou Apparel Group",
      country: "China",
      price: 5.8,
      lead: 35,
      moq: 1000,
      otr: 88,
      quality: 4.2,
      confidence: "medium",
      winner: false,
    },
    {
      rank: 4,
      name: "Porto Têxteis SA",
      country: "Portugal",
      price: 9.2,
      lead: 18,
      moq: 200,
      otr: 95,
      quality: 4.7,
      confidence: "medium",
      winner: false,
    },
  ]

  // Map confidence labels to dot colors.
  const dotByConfidence: Record<string, string> = {
    high: "bg-accent",
    medium: "bg-foreground/40",
    low: "bg-destructive/70",
  }

  // Section wrapper with anchor for the demo CTA on the hero.
  return (
    <section id="demo" className="border-t border-border/70">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Eyebrow + headline. */}
        <div className="mb-12 grid gap-6 md:grid-cols-12">
          {/* Eyebrow on the left. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Comparison engine</p>
          </div>
          {/* Headline on the right. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Apples to apples. <em className="italic">Finally.</em>
            </h2>
          </div>
        </div>

        {/* Brief brief that the agent received — sets context. */}
        <div className="mb-6 rounded-xl border border-border/70 bg-secondary/40 p-5">
          {/* Tiny label above the brief. */}
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Your brief</p>
          {/* The brief itself styled like a quote. */}
          <p className="font-serif text-xl italic leading-snug text-foreground md:text-2xl">
            “Organic cotton oversized hoodie, 280 GSM, GOTS certified, MOQ under 500, lead time
            under 30 days, target landed cost under $8.”
          </p>
        </div>

        {/* Comparison card container — bordered, rounded, slight shadow for depth. */}
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          {/* Header row of the table. */}
          <div className="hidden border-b border-border/70 bg-secondary/40 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:grid md:grid-cols-[40px_1.6fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr]">
            {/* Empty rank column header. */}
            <span>#</span>
            {/* Supplier column. */}
            <span>Supplier</span>
            {/* Country. */}
            <span>Country</span>
            {/* Price. */}
            <span>Price</span>
            {/* Lead. */}
            <span>Lead</span>
            {/* MOQ. */}
            <span>MOQ</span>
            {/* On-time rate. */}
            <span>OTR</span>
            {/* Quality. */}
            <span>Quality</span>
          </div>

          {/* Body rows. */}
          <ul className="divide-y divide-border/70">
            {/* Render one row per supplier. */}
            {rows.map((r) => (
              <li
                key={r.name}
                // Highlight the winner with a subtle lime left border.
                className={`grid grid-cols-2 gap-y-2 px-6 py-5 md:grid-cols-[40px_1.6fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] md:items-center md:gap-y-0 ${
                  r.winner ? "bg-accent/10" : ""
                }`}
              >
                {/* Rank cell. */}
                <span className="font-serif text-xl text-foreground md:text-base">{r.rank}</span>

                {/* Supplier name + confidence dot stacked. */}
                <span className="col-span-1 flex items-center gap-2 md:col-span-1">
                  {/* Confidence dot. */}
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${dotByConfidence[r.confidence]}`}
                    aria-label={`Confidence: ${r.confidence}`}
                  />
                  {/* Name. */}
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  {/* "Recommended" badge for the winner only. */}
                  {r.winner ? (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary-foreground">
                      <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
                      Recommended
                    </span>
                  ) : null}
                </span>

                {/* Country cell. */}
                <span className="text-sm text-muted-foreground">{r.country}</span>
                {/* Price cell. */}
                <span className="text-sm tabular-nums text-foreground">${r.price.toFixed(2)}</span>
                {/* Lead cell. */}
                <span className="text-sm tabular-nums text-foreground">{r.lead}d</span>
                {/* MOQ cell. */}
                <span className="text-sm tabular-nums text-foreground">{r.moq}</span>
                {/* OTR cell. */}
                <span className="text-sm tabular-nums text-foreground">{r.otr}%</span>
                {/* Quality cell. */}
                <span className="text-sm tabular-nums text-foreground">{r.quality.toFixed(1)}</span>
              </li>
            ))}
          </ul>

          {/* Bottom summary strip — explains the recommendation. */}
          <div className="flex flex-col items-start gap-3 border-t border-border/70 bg-secondary/40 px-6 py-5 md:flex-row md:items-center md:justify-between">
            {/* Rationale block — referencing real fields. */}
            <p className="max-w-2xl text-sm text-muted-foreground">
              {/* Bold prefix to signal who is talking. */}
              <span className="font-medium text-foreground">Why Padma Knit Composite:</span>{" "}
              {/* Reasoning text mimicking the real Discovery Agent output. */}
              97% on-time rate, GOTS + BSCI certified, $6.40/unit lands under target, and the 22-day lead
              fits the launch window. The workspace can show supplier prices in USD or BDT.
            </p>
            {/* Action chip — opens deeper view in the app. */}
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground">
              Open in app
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
