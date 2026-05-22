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
  backpacks: "/products/canvas-backpacks/basic-daypack.png",
  "basic daypack": "/products/canvas-backpacks/basic-daypack.png",
  "laptop backpack": "/products/canvas-backpacks/laptop-backpack.png",
  "roll-top canvas": "/products/canvas-backpacks/roll-top-canvas.png",
  "water-resistant": "/products/canvas-backpacks/water-resistant.png",
  bedding: "/products/bedding/cotton-sheet-set.png",
  "cotton sheet set": "/products/bedding/cotton-sheet-set.png",
  "percale set": "/products/bedding/percale-set.png",
  "sateen set": "/products/bedding/sateen-set.png",
  "printed bedding": "/products/bedding/printed-bedding.png",
  "canvas sneakers": "/products/canvas-sneakers/low-top-sneaker.png",
  "low-top sneaker": "/products/canvas-sneakers/low-top-sneaker.png",
  "high-top sneaker": "/products/canvas-sneakers/high-top-sneaker.png",
  "slip-on canvas": "/products/canvas-sneakers/slip-on-canvas.png",
  "printed sneaker": "/products/canvas-sneakers/printed-sneaker.png",
  "cotton blankets": "/products/cotton-blankets/lightweight-throw.png",
  "lightweight throw": "/products/cotton-blankets/lightweight-throw.png",
  "waffle blanket": "/products/cotton-blankets/waffle-blanket.png",
  "baby blanket": "/products/cotton-blankets/baby-blanket.png",
  "hotel blanket": "/products/cotton-blankets/hotel-blanket.png",
  "cosmetic boxes": "/placeholder.jpg",
  "cotton t-shirts": "/products/cotton-t-shirts/crew-neck.png",
  "crew neck": "/products/cotton-t-shirts/crew-neck.png",
  "oversized fit": "/products/cotton-t-shirts/oversized-fit.png",
  "heavyweight gsm": "/products/cotton-t-shirts/heavyweight-gsm.png",
  "printed tee": "/products/cotton-t-shirts/printed-tee.png",
  "cotton-jute export totes": "/products/cotton-jute-export-totes/natural-cotton-jute.png",
  "natural cotton-jute": "/products/cotton-jute-export-totes/natural-cotton-jute.png",
  "screen printed": "/products/cotton-jute-export-totes/screen-printed.png",
  "heavy gsm tote": "/products/cotton-jute-export-totes/heavy-gsm-tote.png",
  "contrast handle": "/products/cotton-jute-export-totes/contrast-handle.png",
  "denim jeans": "/products/denim-jeans/slim-fit-denim.png",
  "slim fit denim": "/products/denim-jeans/slim-fit-denim.png",
  "regular fit denim": "/products/denim-jeans/regular-fit-denim.png",
  "ripped jeans": "/products/denim-jeans/ripped-jeans.png",
  "wide-leg denim": "/products/denim-jeans/wide-leg-denim.png",
  "activewear sets": "/products/activewear-sets/legging-set.png",
  "legging set": "/products/activewear-sets/legging-set.png",
  "sports bra set": "/products/activewear-sets/sports-bra-set.png",
  "training set": "/products/activewear-sets/training-set.png",
  "seamless set": "/products/activewear-sets/seamless-set.png",
  "face serum": CATEGORY_IMAGES.beauty,
  "folding cartons": "/placeholder.jpg",
  "honey jars": GENERIC_PRODUCT_IMAGE,
  "jute pouches": CATEGORY_IMAGES.packaging,
  "jute tote bags": "/products/jute-tote-bags/plain-jute-tote.png",
  "kids footwear": "/products/kids-footwear/school-shoe.png",
  "school shoe": "/products/kids-footwear/school-shoe.png",
  "kids sneaker": "/products/kids-footwear/kids-sneaker.png",
  "velcro shoe": "/products/kids-footwear/velcro-shoe.png",
  "sport kids shoe": "/products/kids-footwear/sport-kids-shoe.png",
  "leather handbags": "/products/leather-handbags/crossbody-bag.png",
  "leather wallets": "/products/leather-wallets/bifold-wallet.png",
  "bifold wallet": "/products/leather-wallets/bifold-wallet.png",
  "card holder": "/products/leather-wallets/card-holder.png",
  "zip wallet": "/products/leather-wallets/zip-wallet.png",
  "passport wallet": "/products/leather-wallets/passport-wallet.png",
  "crossbody bag": "/products/leather-handbags/crossbody-bag.png",
  "structured tote": "/products/leather-handbags/structured-tote.png",
  "mini shoulder bag": "/products/leather-handbags/mini-shoulder-bag.png",
  "premium full-grain": "/products/leather-handbags/premium-full-grain.png",
  "leather sandals": "/products/leather-sandals/slide-sandal.png",
  "slide sandal": "/products/leather-sandals/slide-sandal.png",
  "strap sandal": "/products/leather-sandals/strap-sandal.png",
  "premium leather": "/products/leather-sandals/premium-leather.png",
  "comfort footbed": "/products/leather-sandals/comfort-footbed.png",
  "lip balm": CATEGORY_IMAGES.beauty,
  "organic cotton hoodies": "/products/organic-cotton-hoodies/pullover-hoodie.png",
  "pullover hoodie": "/products/organic-cotton-hoodies/pullover-hoodie.png",
  "zip hoodie": "/products/organic-cotton-hoodies/zip-hoodie.png",
  "heavyweight hoodie": "/products/organic-cotton-hoodies/heavyweight-hoodie.png",
  "washed hoodie": "/products/organic-cotton-hoodies/washed-hoodie.png",
  "paper bags": CATEGORY_IMAGES.packaging,
  "plain jute tote": "/products/jute-tote-bags/plain-jute-tote.png",
  "printed jute tote": "/products/jute-tote-bags/printed-jute-tote.png",
  "laminated jute tote": "/products/jute-tote-bags/laminated-jute-tote.png",
  "cotton-jute blend": "/products/jute-tote-bags/cotton-jute-blend.png",
  "cotton-jute blend bag": "/products/jute-tote-bags/cotton-jute-blend.png",
  "rice exporters": "/products/rice-exporters/basmati-rice.png",
  "basmati rice": "/products/rice-exporters/basmati-rice.png",
  "parboiled rice": "/products/rice-exporters/parboiled-rice.png",
  "aromatic rice": "/products/rice-exporters/aromatic-rice.png",
  "private label rice": "/products/rice-exporters/private-label-rice.png",
  rugs: "/products/rugs/flatweave-rug.png",
  "flatweave rug": "/products/rugs/flatweave-rug.png",
  "jute rug": "/products/rugs/jute-rug.png",
  "wool rug": "/products/rugs/wool-rug.png",
  "runner rug": "/products/rugs/runner-rug.png",
  "snack pouches": "/products/snack-pouches/chips-pouch.png",
  "chips pouch": "/products/snack-pouches/chips-pouch.png",
  "nut pouch": "/products/snack-pouches/nut-pouch.png",
  "granola pouch": "/products/snack-pouches/granola-pouch.png",
  "single-serve pouch": "/products/snack-pouches/single-serve-pouch.png",
  "soap bars": GENERIC_PRODUCT_IMAGE,
  "spice blends": "/products/spice-blends/garam-masala.png",
  "garam masala": "/products/spice-blends/garam-masala.png",
  "curry powder": "/products/spice-blends/curry-powder.png",
  "chilli blend": "/products/spice-blends/chilli-blend.png",
  "bbq spice rub": "/products/spice-blends/bbq-spice-rub.png",
  "sports shoes": "/products/sports-shoes/road-running-shoe.png",
  "road running shoe": "/products/sports-shoes/road-running-shoe.png",
  "training shoe": "/products/sports-shoes/training-shoe.png",
  "trail shoe": "/products/sports-shoes/trail-shoe.png",
  "knitted upper": "/products/sports-shoes/knitted-upper.png",
  sunscreen: CATEGORY_IMAGES.beauty,
  "tea packs": "/products/tea-packs/black-tea-bags.png",
  "black tea bags": "/products/tea-packs/black-tea-bags.png",
  "green tea sachets": "/products/tea-packs/green-tea-sachets.png",
  "masala tea packs": "/products/tea-packs/masala-tea-packs.png",
  "loose leaf pouch": "/products/tea-packs/loose-leaf-pouch.png",
  towels: "/products/towels/bath-towel.png",
  "bath towel": "/products/towels/bath-towel.png",
  "hand towel": "/products/towels/hand-towel.png",
  "hotel towel": "/products/towels/hotel-towel.png",
  "organic towel": "/products/towels/organic-towel.png",
}

const PRODUCT_VARIANT_IMAGES: Record<string, Record<string, string>> = {
  "jute tote bags": {
    "plain jute tote": "/products/jute-tote-bags/plain-jute-tote.png",
    "printed jute tote": "/products/jute-tote-bags/printed-jute-tote.png",
    "laminated jute tote": "/products/jute-tote-bags/laminated-jute-tote.png",
    "cotton-jute blend": "/products/jute-tote-bags/cotton-jute-blend.png",
  },
  "leather handbags": {
    "crossbody bag": "/products/leather-handbags/crossbody-bag.png",
    "structured tote": "/products/leather-handbags/structured-tote.png",
    "mini shoulder bag": "/products/leather-handbags/mini-shoulder-bag.png",
    "premium full-grain": "/products/leather-handbags/premium-full-grain.png",
  },
  "leather wallets": {
    "bifold wallet": "/products/leather-wallets/bifold-wallet.png",
    "card holder": "/products/leather-wallets/card-holder.png",
    "zip wallet": "/products/leather-wallets/zip-wallet.png",
    "passport wallet": "/products/leather-wallets/passport-wallet.png",
  },
  backpacks: {
    "basic daypack": "/products/canvas-backpacks/basic-daypack.png",
    "laptop backpack": "/products/canvas-backpacks/laptop-backpack.png",
    "roll-top canvas": "/products/canvas-backpacks/roll-top-canvas.png",
    "water-resistant": "/products/canvas-backpacks/water-resistant.png",
  },
  "cotton-jute export totes": {
    "natural cotton-jute": "/products/cotton-jute-export-totes/natural-cotton-jute.png",
    "screen printed": "/products/cotton-jute-export-totes/screen-printed.png",
    "heavy gsm tote": "/products/cotton-jute-export-totes/heavy-gsm-tote.png",
    "contrast handle": "/products/cotton-jute-export-totes/contrast-handle.png",
  },
  "cotton t-shirts": {
    "crew neck": "/products/cotton-t-shirts/crew-neck.png",
    "oversized fit": "/products/cotton-t-shirts/oversized-fit.png",
    "heavyweight gsm": "/products/cotton-t-shirts/heavyweight-gsm.png",
    "printed tee": "/products/cotton-t-shirts/printed-tee.png",
  },
  "organic cotton hoodies": {
    "pullover hoodie": "/products/organic-cotton-hoodies/pullover-hoodie.png",
    "zip hoodie": "/products/organic-cotton-hoodies/zip-hoodie.png",
    "heavyweight hoodie": "/products/organic-cotton-hoodies/heavyweight-hoodie.png",
    "washed hoodie": "/products/organic-cotton-hoodies/washed-hoodie.png",
  },
  "denim jeans": {
    "slim fit denim": "/products/denim-jeans/slim-fit-denim.png",
    "regular fit denim": "/products/denim-jeans/regular-fit-denim.png",
    "ripped jeans": "/products/denim-jeans/ripped-jeans.png",
    "wide-leg denim": "/products/denim-jeans/wide-leg-denim.png",
  },
  "activewear sets": {
    "legging set": "/products/activewear-sets/legging-set.png",
    "sports bra set": "/products/activewear-sets/sports-bra-set.png",
    "training set": "/products/activewear-sets/training-set.png",
    "seamless set": "/products/activewear-sets/seamless-set.png",
  },
  "tea packs": {
    "black tea bags": "/products/tea-packs/black-tea-bags.png",
    "green tea sachets": "/products/tea-packs/green-tea-sachets.png",
    "masala tea packs": "/products/tea-packs/masala-tea-packs.png",
    "loose leaf pouch": "/products/tea-packs/loose-leaf-pouch.png",
  },
  "spice blends": {
    "garam masala": "/products/spice-blends/garam-masala.png",
    "curry powder": "/products/spice-blends/curry-powder.png",
    "chilli blend": "/products/spice-blends/chilli-blend.png",
    "bbq spice rub": "/products/spice-blends/bbq-spice-rub.png",
  },
  "rice exporters": {
    "basmati rice": "/products/rice-exporters/basmati-rice.png",
    "parboiled rice": "/products/rice-exporters/parboiled-rice.png",
    "aromatic rice": "/products/rice-exporters/aromatic-rice.png",
    "private label rice": "/products/rice-exporters/private-label-rice.png",
  },
  "snack pouches": {
    "chips pouch": "/products/snack-pouches/chips-pouch.png",
    "nut pouch": "/products/snack-pouches/nut-pouch.png",
    "granola pouch": "/products/snack-pouches/granola-pouch.png",
    "single-serve pouch": "/products/snack-pouches/single-serve-pouch.png",
  },
  "cotton blankets": {
    "lightweight throw": "/products/cotton-blankets/lightweight-throw.png",
    "waffle blanket": "/products/cotton-blankets/waffle-blanket.png",
    "baby blanket": "/products/cotton-blankets/baby-blanket.png",
    "hotel blanket": "/products/cotton-blankets/hotel-blanket.png",
  },
  towels: {
    "bath towel": "/products/towels/bath-towel.png",
    "hand towel": "/products/towels/hand-towel.png",
    "hotel towel": "/products/towels/hotel-towel.png",
    "organic towel": "/products/towels/organic-towel.png",
  },
  bedding: {
    "cotton sheet set": "/products/bedding/cotton-sheet-set.png",
    "percale set": "/products/bedding/percale-set.png",
    "sateen set": "/products/bedding/sateen-set.png",
    "printed bedding": "/products/bedding/printed-bedding.png",
  },
  rugs: {
    "flatweave rug": "/products/rugs/flatweave-rug.png",
    "jute rug": "/products/rugs/jute-rug.png",
    "wool rug": "/products/rugs/wool-rug.png",
    "runner rug": "/products/rugs/runner-rug.png",
  },
  "canvas sneakers": {
    "low-top sneaker": "/products/canvas-sneakers/low-top-sneaker.png",
    "high-top sneaker": "/products/canvas-sneakers/high-top-sneaker.png",
    "slip-on canvas": "/products/canvas-sneakers/slip-on-canvas.png",
    "printed sneaker": "/products/canvas-sneakers/printed-sneaker.png",
  },
  "sports shoes": {
    "road running shoe": "/products/sports-shoes/road-running-shoe.png",
    "training shoe": "/products/sports-shoes/training-shoe.png",
    "trail shoe": "/products/sports-shoes/trail-shoe.png",
    "knitted upper": "/products/sports-shoes/knitted-upper.png",
  },
  "leather sandals": {
    "slide sandal": "/products/leather-sandals/slide-sandal.png",
    "strap sandal": "/products/leather-sandals/strap-sandal.png",
    "premium leather": "/products/leather-sandals/premium-leather.png",
    "comfort footbed": "/products/leather-sandals/comfort-footbed.png",
  },
  "kids footwear": {
    "school shoe": "/products/kids-footwear/school-shoe.png",
    "kids sneaker": "/products/kids-footwear/kids-sneaker.png",
    "velcro shoe": "/products/kids-footwear/velcro-shoe.png",
    "sport kids shoe": "/products/kids-footwear/sport-kids-shoe.png",
  },
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

export function getProductVariantImage(product: string, variant: string, index: number): ProductImage {
  const productKey = product.trim().toLowerCase()
  const variantKey = variant.trim().toLowerCase()
  const src = PRODUCT_VARIANT_IMAGES[productKey]?.[variantKey]

  if (src) {
    return {
      src,
      alt: `${variant} product preview`,
      credit: "Generated product preview",
    }
  }

  return getVariantPlaceholderImage(index)
}

export function getVariantPlaceholderImage(index: number): ProductImage {
  const src = VARIANT_PLACEHOLDER_IMAGES[index % VARIANT_PLACEHOLDER_IMAGES.length] ?? GENERIC_PRODUCT_IMAGE

  return {
    src,
    alt: "Product type preview",
    credit: "Product type preview",
  }
}
