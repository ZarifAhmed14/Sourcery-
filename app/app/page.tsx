// /app — the main sourcing chat experience.
// Server component shell — renders the client SourcingChat which talks to /api/source.
// Wrapped in Suspense because SourcingChat reads ?prefill=… via useSearchParams.

import { Suspense } from "react"
import { SourcingChat } from "@/components/sourcery/sourcing-chat"

export default function AppHomePage() {
  return (
    <Suspense fallback={<div className="h-32" aria-hidden />}>
      <SourcingChat />
    </Suspense>
  )
}
