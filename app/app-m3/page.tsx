import { Suspense } from "react"
import { SourcingChat } from "@/components/sourcery/sourcing-chat"

export default function AppM3Page() {
  return (
    <Suspense fallback={null}>
      <SourcingChat />
    </Suspense>
  )
}
