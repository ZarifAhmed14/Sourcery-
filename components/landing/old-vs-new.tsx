// Side-by-side "the old way vs Sourcery" section.
// Communicates the time and cost contrast in a single editorial spread.

// X icon for old-way bullets, Check for Sourcery bullets.
import { Check, X } from "lucide-react"

// Server Component — static content.
export function OldVsNew() {
  // Bullet list for the painful old way.
  const oldWay = [
    "47 browser tabs across Alibaba, Global Sources, IndiaMART",
    "Cold emails to 30+ suppliers, half never reply",
    "Spreadsheets that fall apart at 12 columns",
    "Sample chasing for 6 weeks",
    "No clear way to compare apples to apples",
    "Hidden country risk you only learn about at customs",
  ]
  // Bullet list for the Sourcery way.
  const sourceryWay = [
    "One natural-language brief: '280 GSM hoodie, GOTS, MOQ 300'",
    "Verified shortlist in under a minute",
    "Side-by-side scorecards across price, lead time, quality, risk",
    "Supplier notes, risk signals, and price context stay in one place",
    "Confidence and reasoning attached to every recommendation",
    "USD or BDT price view for local buyer presentations",
  ]

  // Section element with anchor target for nav.
  return (
    <section id="old-vs-new" className="border-t border-border/70">
      {/* Centered container with generous vertical padding for breathing room. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Section eyebrow + display headline pair, top-aligned in editorial style. */}
        <div className="mb-16 grid gap-6 md:mb-20 md:grid-cols-12">
          {/* Eyebrow column — small caps label spans 4 cols on md. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">The contrast</p>
          </div>
          {/* Headline column — large serif spread spans 8 cols on md. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Ninety days of sourcing, <em className="italic">compressed into one chat.</em>
            </h2>
          </div>
        </div>

        {/* Two-column comparison — old vs new. */}
        <div className="grid gap-12 md:grid-cols-2">
          {/* Old-way column — muted, slightly desaturated to feel "yesterday". */}
          <div className="rounded-2xl border border-border/70 bg-secondary/40 p-8 md:p-10">
            {/* Column eyebrow. */}
            <p className="mb-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">The old way</p>
            {/* Big number for emotional weight. */}
            <p className="font-serif text-6xl leading-none tracking-tight md:text-7xl">90 days</p>
            {/* Caption beneath the big number. */}
            <p className="mt-3 text-sm text-muted-foreground">
              Average time to shortlist a single SKU at an SME consumer brand.
            </p>

            {/* Hairline divider between the headline number and the bullet list. */}
            <div className="my-8 h-px w-full bg-border/70" />

            {/* Bullet list of pains. */}
            <ul className="space-y-3">
              {/* Map each pain item to a row with an X icon. */}
              {oldWay.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  {/* X icon to indicate a negative. */}
                  <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  {/* The pain text itself. */}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sourcery column — accented to feel modern and alive. */}
          <div className="rounded-2xl border border-foreground bg-foreground p-8 text-primary-foreground md:p-10">
            {/* Column eyebrow on dark background — accent color for contrast. */}
            <p className="mb-6 text-xs uppercase tracking-[0.22em] text-accent">With Sourcery</p>
            {/* Big number — three minutes. */}
            <p className="font-serif text-6xl leading-none tracking-tight md:text-7xl">3 minutes</p>
            {/* Caption explaining the metric. */}
            <p className="mt-3 text-sm text-primary-foreground/70">
              Median time from brief to ranked supplier shortlist with reasoning.
            </p>

            {/* Hairline on the dark column. */}
            <div className="my-8 h-px w-full bg-primary-foreground/15" />

            {/* Sourcery bullets. */}
            <ul className="space-y-3">
              {/* Map each value-prop to a check-marked row. */}
              {sourceryWay.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/85">
                  {/* Lime check icon for affirmations. */}
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden="true" />
                  {/* The value-prop text. */}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
