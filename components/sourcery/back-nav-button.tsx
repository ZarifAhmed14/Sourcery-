"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackNavButton({
  fallbackHref = "/app",
  label = "Back",
}: {
  fallbackHref?: string
  label?: string
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back()
          return
        }
        router.push(fallbackHref)
      }}
      className="inline-flex items-center gap-2 text-sm font-medium text-[#5d6965] hover:text-[#16201d]"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  )
}
