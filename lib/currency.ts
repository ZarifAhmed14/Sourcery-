export const USD_TO_BDT = 120

export function formatMoney(usd?: number | null, bangladeshMode = false): string {
  if (typeof usd !== "number" || Number.isNaN(usd)) return "TBD"

  if (bangladeshMode) {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: usd * USD_TO_BDT >= 100 ? 0 : 2,
    }).format(usd * USD_TO_BDT)
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd)
}
