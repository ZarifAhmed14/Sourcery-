import type { SupplierCategory } from "@/lib/types"

export type SupportedProductOption = {
  category: SupplierCategory
  label: string
  products: string[]
}

export const SUPPORTED_PRODUCT_CATALOG: SupportedProductOption[] = [
  { category: "accessories", label: "Bags & accessories", products: ["jute tote bags", "leather handbags", "backpacks", "leather wallets"] },
  { category: "apparel", label: "Apparel", products: ["cotton t-shirts", "organic cotton hoodies", "denim jeans", "activewear sets"] },
  { category: "food", label: "Food & beverage", products: ["tea packs", "spice blends", "rice exporters", "snack pouches"] },
  { category: "home", label: "Home goods", products: ["cotton blankets", "towels", "bedding", "rugs"] },
  { category: "footwear", label: "Footwear", products: ["canvas sneakers", "sports shoes", "leather sandals", "kids footwear"] },
]

export const SUPPORTED_CATEGORY_SET = new Set<SupplierCategory>(SUPPORTED_PRODUCT_CATALOG.map((item) => item.category))

export function productsForCategory(category: SupplierCategory): string[] {
  return SUPPORTED_PRODUCT_CATALOG.find((item) => item.category === category)?.products ?? []
}

export function isSupportedProduct(category: SupplierCategory, product?: string | null): boolean {
  if (!SUPPORTED_CATEGORY_SET.has(category)) return false
  if (!product) return true
  const normalized = product.trim().toLowerCase()
  return productsForCategory(category).some((item) => item.toLowerCase() === normalized)
}

export function inferSupportedProduct(category: SupplierCategory, query: string): string | null {
  const normalized = query.toLowerCase()
  const scored = productsForCategory(category).map((product) => {
    const words = product.toLowerCase().split(/\s+/).filter((word) => word.length >= 3)
    const exact = normalized.includes(product.toLowerCase()) ? 10 : 0
    const matches = words.filter((word) => normalized.includes(word)).length
    return { product, score: exact + matches }
  })
  return scored.sort((a, b) => b.score - a.score)[0]?.score > 0 ? scored[0].product : null
}

export function supportedProductHelpText(): string {
  return SUPPORTED_PRODUCT_CATALOG.map((item) => `${item.label}: ${item.products.join(", ")}`).join(" | ")
}
