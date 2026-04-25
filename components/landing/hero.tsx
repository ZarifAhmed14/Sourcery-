// Hero section for the Sourcery landing page.
// Editorial layout — oversized italic serif headline, single tight subhead, two CTAs,
// and a thin live-status row to convey activity without clutter.

// Link for primary and secondary CTAs.
import Link from "next/link"
// Shared button.
import { Button } from "@/components/ui/button"
// Lucide icons for arrow affordance and the status pulse.
import { ArrowUpRight } from "lucide-react"

// Server Component — purely presentational hero.
export function Hero() {
  return (
    // Outer section wraps the hero with vertical breathing room.
    <section className="relative overflow-hidden">
      {/* Centered max-width container with editorial side gutters. */}
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pb-32 md:pt-24">
        {/* Eyebrow row — small caps label and animated live dot. */}
        <div className="mb-10 flex items-center gap-3">
          {/* Lime pulse dot to suggest active sourcing happening right now. */}
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          {/* Eyebrow text — uppercase tracking for a masthead feel. */}
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            BuildFest 2026 · Track 4 · AI sourcing agent
          </span>
        </div>

        {/* Display headline — Instrument Serif italic for the verb, regular for the period. */}
        <h1 className="font-serif text-[clamp(3rem,9vw,8.5rem)] leading-[0.95] tracking-tight text-foreground text-balance">
          {/* First word of the headline. */}
          Source{" "}
          {/* Italic accent word — gives the editorial twist. */}
          <em className="italic">smarter.</em>
          {/* Line break for visual rhythm on larger screens. */}
          <br />
          {/* Second clause continues the thought. */}
          Ship <em className="italic">sooner.</em>
        </h1>

        {/* Subhead — a single line that explains what Sourcery does. */}
        <p className="mt-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          {/* Body copy describing the product without jargon. */}
          Sourcery is the AI agent that discovers verified global suppliers, compares them across
          price, lead time, quality and delivery — and negotiates in your voice. Built for consumer
          brands.
        </p>

        {/* CTA row — primary lime-accented button plus a subtle secondary link. */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          {/* Primary CTA — sends users to the demo anchor. */}
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/app" className="flex items-center gap-2">
              {/* Button label. */}
              Run a sourcing demo
              {/* Affordance icon. */}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          {/* Secondary CTA — outline style for visual hierarchy. */}
          <Button asChild size="lg" variant="outline" className="rounded-full px-7 bg-transparent">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>

        {/* Live-status strip — communicates that the system is active. */}
        <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border/70 pt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {/* Single status item with its own pulse dot. */}
          <span className="flex items-center gap-2">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {/* Status copy — fictional but credible. */}
            Currently sourcing for 47 brands
          </span>
          {/* Static stat — count of vetted suppliers in the index. */}
          <span>2,840 suppliers indexed</span>
          {/* Static stat — countries covered. */}
          <span>9 countries · 5 categories</span>
          {/* Static stat — average reduction in sourcing time. */}
          <span>47 days saved on average</span>
        </div>
      </div>
    </section>
  )
}
