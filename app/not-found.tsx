// 404 page — used both for unknown routes AND for unknown supplier IDs (notFound()).
// Editorial styling matches the rest of Sourcery.

// Next.js Link for client-side navigation.
import Link from "next/link"
// Reusable Button component.
import { Button } from "@/components/ui/button"

// Default export is what Next.js renders for any 404.
export default function NotFound() {
  return (
    // Centered card layout with generous vertical breathing room.
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      {/* Eyebrow with the actual status code — useful signal for users. */}
      <span className="mb-6 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        404 — Not found
      </span>
      {/* Big editorial-serif headline. */}
      <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">This page took a longer lead time.</h1>
      {/* Body copy ties to the sourcing metaphor. */}
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        The page you&apos;re looking for didn&apos;t arrive. It might have been moved, renamed, or never existed in the first place.
      </p>
      {/* CTA back to safe ground. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="rounded-full px-5">
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-5 bg-transparent">
          <Link href="/app">Open the agent</Link>
        </Button>
      </div>
    </main>
  )
}
