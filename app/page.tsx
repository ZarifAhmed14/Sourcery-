// Public landing page for Sourcery.
// Composes the editorial sections in narrative order:
// nav → hero → contrast → comparison demo → capabilities → trust → categories → stats → pricing → CTA → footer.

// Pull in each landing section as its own focused component for maintainability.
import { SiteNav } from "@/components/landing/site-nav"
import { Hero } from "@/components/landing/hero"
import { OldVsNew } from "@/components/landing/old-vs-new"
import { ComparisonDemo } from "@/components/landing/comparison-demo"
import { Capabilities } from "@/components/landing/capabilities"
import { TrustSection } from "@/components/landing/trust-section"
import { Categories } from "@/components/landing/categories"
import { Stats } from "@/components/landing/stats"
import { Pricing } from "@/components/landing/pricing"
import { ClosingCta } from "@/components/landing/closing-cta"
import { SiteFooter } from "@/components/landing/site-footer"

// Server Component — no client-side state needed for the landing page itself.
export default function HomePage() {
  // Render the page as <main> so screen readers identify the primary content.
  return (
    // The grain utility is defined in globals.css and adds a subtle paper texture overlay.
    <div className="grain min-h-screen bg-background text-foreground">
      {/* Sticky top navigation. */}
      <SiteNav />
      {/* Wrap the marketing sections in a single semantic main element. */}
      <main>
        {/* Hero — the editorial opener. */}
        <Hero />
        {/* Old way vs Sourcery — emotional contrast. */}
        <OldVsNew />
        {/* Static visual mock of the supplier comparison output. */}
        <ComparisonDemo />
        {/* Four capabilities (Discover, Compare, Negotiate, Monitor). */}
        <Capabilities />
        {/* Trust & verification pillars — explainability story. */}
        <TrustSection />
        {/* Consumer product categories Sourcery supports. */}
        <Categories />
        {/* Big number stats strip. */}
        <Stats />
        {/* Pricing tiers. */}
        <Pricing />
        {/* Final closing CTA before the footer. */}
        <ClosingCta />
      </main>
      {/* Editorial footer with link columns and copyright. */}
      <SiteFooter />
    </div>
  )
}
