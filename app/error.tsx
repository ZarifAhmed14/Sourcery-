// Top-level error boundary for the marketing site. Catches anything thrown by landing-page
// segments (rare, since they're mostly static) and renders the same editorial fallback.

"use client"

// One-time effect to log the caught error.
// Reusable Button component.
import { Button } from "@/components/ui/button"

// Receives `error` and `reset` from Next.js App Router.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {

  return (
    // Centered editorial card — matches the landing-page palette.
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      {/* Subtle uppercase eyebrow for visual rhythm. */}
      <span className="mb-6 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Unexpected error
      </span>
      {/* Editorial-serif headline. */}
      <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">A page failed to load.</h1>
      {/* Helpful but vague body copy — no stack details surfaced to users. */}
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        We hit an unexpected issue rendering this page. Refresh to try again, or head back to the home page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {/* Reset button retries the segment render. */}
        <Button onClick={() => reset()} className="rounded-full px-5">Try again</Button>
        {/* Escape hatch home. */}
        <Button asChild variant="outline" className="rounded-full px-5 bg-transparent">
          <a href="/">Back home</a>
        </Button>
      </div>
    </main>
  )
}
