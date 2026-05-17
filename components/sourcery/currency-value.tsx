"use client"

import { formatMoney } from "@/lib/currency"
import { usePreferences } from "@/lib/preferences-context"

export function CurrencyValue({ usd }: { usd?: number | null }) {
  const { bangladeshMode } = usePreferences()
  return <>{formatMoney(usd, bangladeshMode)}</>
}
