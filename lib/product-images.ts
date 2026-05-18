import type { Supplier, SupplierCategory } from "@/lib/types"

type ProductImage = {
  src: string
  alt: string
  credit: string
}

const GENERIC_PRODUCT_IMAGE = "/placeholder.jpg"
const VARIANT_PLACEHOLDER_IMAGES = [
  "/placeholder.jpg",
  "/placeholder-user.jpg",
  "/placeholder.jpg",
  "/placeholder-user.jpg",
]

const CATEGORY_IMAGES: Record<SupplierCategory, string> = {
  accessories: GENERIC_PRODUCT_IMAGE,
  apparel: GENERIC_PRODUCT_IMAGE,
  beauty: GENERIC_PRODUCT_IMAGE,
  electronics: GENERIC_PRODUCT_IMAGE,
  food: GENERIC_PRODUCT_IMAGE,
  footwear: GENERIC_PRODUCT_IMAGE,
  home: GENERIC_PRODUCT_IMAGE,
  industrial: GENERIC_PRODUCT_IMAGE,
  packaging: GENERIC_PRODUCT_IMAGE,
  textiles: GENERIC_PRODUCT_IMAGE,
}

const PRODUCT_IMAGES: Record<string, string> = {
  backpacks: GENERIC_PRODUCT_IMAGE,
  bedding: GENERIC_PRODUCT_IMAGE,
  "canvas sneakers": CATEGORY_IMAGES.footwear,
  "cotton blankets": CATEGORY_IMAGES.home,
  "cosmetic boxes": "/placeholder.jpg",
  "cotton t-shirts": CATEGORY_IMAGES.apparel,
  "cotton-jute export totes": CATEGORY_IMAGES.accessories,
  "denim jeans": GENERIC_PRODUCT_IMAGE,
  "face serum": CATEGORY_IMAGES.beauty,
  "folding cartons": "/placeholder.jpg",
  "honey jars": GENERIC_PRODUCT_IMAGE,
  "jute pouches": CATEGORY_IMAGES.packaging,
  "jute tote bags": CATEGORY_IMAGES.accessories,
  "kids footwear": CATEGORY_IMAGES.footwear,
  "leather handbags": GENERIC_PRODUCT_IMAGE,
  "leather sandals": CATEGORY_IMAGES.footwear,
  "lip balm": CATEGORY_IMAGES.beauty,
  "organic cotton hoodies": GENERIC_PRODUCT_IMAGE,
  "paper bags": CATEGORY_IMAGES.packaging,
  "rice exporters": CATEGORY_IMAGES.food,
  rugs: GENERIC_PRODUCT_IMAGE,
  "snack pouches": CATEGORY_IMAGES.packaging,
  "soap bars": GENERIC_PRODUCT_IMAGE,
  "spice blends": GENERIC_PRODUCT_IMAGE,
  "sports shoes": CATEGORY_IMAGES.footwear,
  sunscreen: CATEGORY_IMAGES.beauty,
  "tea packs": GENERIC_PRODUCT_IMAGE,
  towels: CATEGORY_IMAGES.beauty,
}

export function getProductImage(input: {
  category?: SupplierCategory | null
  product?: string | null
  supplier?: Pick<Supplier, "category" | "products" | "subcategory"> | null
}): ProductImage {
  const product =
    input.product ??
    input.supplier?.products?.[0] ??
    input.supplier?.subcategory ??
    null
  const normalizedProduct = product?.trim().toLowerCase()
  const category = input.category ?? input.supplier?.category
  if (!category && !normalizedProduct) {
    return {
      src: GENERIC_PRODUCT_IMAGE,
      alt: "Supplier product preview",
      credit: "Choose a product",
    }
  }
  const src =
    (normalizedProduct && PRODUCT_IMAGES[normalizedProduct]) ||
    (category ? CATEGORY_IMAGES[category] : undefined) ||
    CATEGORY_IMAGES.accessories

  return {
    src,
    alt: product ? `Product preview for ${product}` : "Product category preview",
    credit: "Product category preview",
  }
}

export function getVariantPlaceholderImage(index: number): ProductImage {
  const src = VARIANT_PLACEHOLDER_IMAGES[index % VARIANT_PLACEHOLDER_IMAGES.length] ?? GENERIC_PRODUCT_IMAGE

  return {
    src,
    alt: "Product type preview",
    credit: "Product type preview",
  }
}
