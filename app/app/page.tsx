// /app - the main sourcing workspace.
import { Suspense } from "react"
import { SourcingChat } from "@/components/sourcery/sourcing-chat"

export default function AppHomePage() {
  return (
    <Suspense fallback={null}>
      <SourcingChat />
    </Suspense>
  )
}
