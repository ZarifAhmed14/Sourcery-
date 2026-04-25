// Top navigation for the public landing page.
// Editorial aesthetic — small caps wordmark, minimal links, single primary CTA.
// Bangladesh Mode toggle slot is reserved here but wired up in a later phase.

// Next.js Link for client-side navigation between routes.
import Link from "next/link"
// Shared button component from shadcn/ui — used for the primary CTA.
import { Button } from "@/components/ui/button"

// Default export — Server Component (no client interactivity needed yet).
export function SiteNav() {
  // Render the nav as a semantic <header> for accessibility and SEO.
  return (
    // Sticky-ish container with cream background and a hairline bottom border for an editorial feel.
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      {/* Centered nav row with horizontal padding that grows on larger screens. */}
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        {/* Wordmark on the left — links back to landing root. */}
        <Link href="/" className="flex items-center gap-2">
          {/* Decorative dot in the lime accent color to anchor the wordmark. */}
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          {/* Brand name in display serif for editorial signature. */}
          <span className="font-serif text-2xl tracking-tight text-foreground">Sourcery</span>
        </Link>

        {/* Center nav links — hidden on mobile, shown from md upward. */}
        <ul className="hidden items-center gap-8 md:flex">
          {/* Each link uses small uppercase tracking for a magazine-masthead vibe. */}
          <li>
            <Link
              href="#how-it-works"
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {/* Section anchor for the four-capabilities section. */}
              How it works
            </Link>
          </li>
          <li>
            <Link
              href="#categories"
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {/* Section anchor for product categories. */}
              Categories
            </Link>
          </li>
          <li>
            <Link
              href="#pricing"
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {/* Section anchor for pricing tiers. */}
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="/app"
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {/* Direct link to the app — wired up in later phases. */}
              App
            </Link>
          </li>
        </ul>

        {/* Right-side action cluster — sign-in link plus a primary CTA. */}
        <div className="flex items-center gap-3">
          {/* Subtle secondary action — sign in. */}
          <Link
            href="/app"
            className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Sign in
          </Link>
          {/* Primary CTA — short, action-oriented copy. */}
          <Button asChild size="sm" className="rounded-full px-5">
            <Link href="/app">Run a sourcing run</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
