// Final closing CTA section before the footer.
// Big serif statement plus a single primary action.

// Link for the CTA button.
import Link from "next/link"
// Shared button.
import { Button } from "@/components/ui/button"
// Arrow affordance.
import { ArrowUpRight } from "lucide-react"

// Server Component.
export function ClosingCta() {
  // Section wrapper.
  return (
    <section className="border-t border-border/70 bg-secondary/30">
      {/* Centered container with extra vertical padding for emphasis. */}
      <div className="mx-auto max-w-5xl px-6 py-28 text-center md:py-40">
        {/* Eyebrow above headline. */}
        <p className="mb-8 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          The next step
        </p>
        {/* Massive serif closing line — italic on the verb. */}
        <h2 className="font-serif text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-tight text-balance">
          Stop spreadsheeting. <em className="italic">Start sourcing.</em>
        </h2>
        {/* Subhead under the closing line. */}
        <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Run your first sourcing brief in under a minute. No credit card. No suppliers cold-called
          on your behalf — until you say so.
        </p>
        {/* Single primary CTA. */}
        <div className="mt-10">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/app" className="flex items-center gap-2">
              Open Sourcery
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
