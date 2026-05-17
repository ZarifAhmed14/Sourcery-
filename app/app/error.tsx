// Error boundary for everything under /app — catches runtime errors from the orchestrator,
// the comparison view, and the dashboard. Renders an editorial-style error card with a
// "try again" reset button. Required by Next.js App Router.

"use client"

// useEffect lets us log the error once when the boundary first catches it.
import { useEffect } from "react"
// Reusable Button component from the design system.
import { Button } from "@/components/ui/button"
// Lucide icons for the error state.
import { AlertTriangle, RotateCcw } from "lucide-react"

// Props are provided by Next.js automatically — `error` is the thrown error,
// and `reset` re-renders the segment to attempt recovery.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Log the error once for observability (server logs pick this up in production).
  useEffect(() => {
    console.log("[v0] /app error boundary caught:", error.message, error.digest)
  }, [error])

  return (
    // Center the card vertically inside the agent layout.
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      {/* Soft accent badge to signal a non-fatal error. */}
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <AlertTriangle className="size-3.5" aria-hidden />
        Sourcing run interrupted
      </span>
      {/* Editorial-serif heading consistent with the rest of the app. */}
      <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">Something broke mid-thought.</h1>
      {/* Plain message — never expose stack traces to the user. */}
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        The agent could not complete this run. This is usually a transient network issue with the model gateway. Try again, or rephrase your brief.
      </p>
      {/* Reset button — calls the framework-provided reset() to re-render the segment. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="rounded-full px-5">
          <RotateCcw className="mr-2 size-4" aria-hidden />
          Try again
        </Button>
        {/* Always offer an escape hatch back to the agent home. */}
        <Button asChild variant="outline" className="rounded-full px-5 bg-transparent">
          <a href="/app">Back to agent</a>
        </Button>
      </div>
    </main>
  )
}
