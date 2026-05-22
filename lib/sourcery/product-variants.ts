import type { SupplierCategory } from "@/lib/types"

export type ProductVariant = {
  name: string
  detail: string
}

export type ProductVisualConfig = {
  displayName: string
  variants: ProductVariant[]
  sizes: string[]
}

export type ProductPriceBand = {
  value: "low" | "standard" | "premium"
  label: string
  min?: number
  max?: number
}

const PRODUCT_PRICE_RANGES: Record<string, [number, number]> = {
  "jute tote bags": [1, 3],
  "leather handbags": [15, 35],
  backpacks: [4, 14],
  "leather wallets": [2, 9],
  "cotton t-shirts": [2.5, 6],
  "organic cotton hoodies": [7, 16],
  "denim jeans": [8, 18],
  "activewear sets": [6, 16],
  "face serum": [1, 4],
  "lip balm": [0.35, 1.2],
  sunscreen: [1.5, 5],
  "soap bars": [0.3, 1],
  "tea packs": [0.6, 2],
  "spice blends": [0.7, 2.5],
  "rice exporters": [0.55, 1.4],
  "snack pouches": [0.25, 1],
  "honey jars": [1, 3],
  "cotton blankets": [4, 12],
  towels: [1.8, 6],
  bedding: [5, 16],
  rugs: [10, 35],
  "folding cartons": [0.12, 0.6],
  "paper bags": [0.1, 0.5],
  "cosmetic boxes": [0.2, 1.2],
  "jute pouches": [0.35, 1.3],
  "canvas sneakers": [7, 18],
  "sports shoes": [10, 28],
  "leather sandals": [8, 22],
  "kids footwear": [5, 14],
}

const DEFAULT_VARIANTS: ProductVariant[] = [
  { name: "Standard", detail: "Everyday retail-ready version" },
  { name: "Premium", detail: "Higher finish and packaging" },
  { name: "Budget", detail: "Lower cost entry version" },
  { name: "Custom", detail: "Buyer-specific specs" },
]

const DEFAULT_SIZES = ["Small batch", "Standard MOQ", "Bulk order"]

export const PRODUCT_VISUAL_CATALOG: Record<string, ProductVisualConfig> = {
  "jute tote bags": {
    displayName: "Jute tote bags",
    variants: [
      { name: "Plain jute tote", detail: "Unprinted natural-fiber bag" },
      { name: "Printed jute tote", detail: "Logo or campaign artwork" },
      { name: "Laminated jute tote", detail: "Stronger finish for retail use" },
      { name: "Cotton-jute blend", detail: "Softer premium handle" },
    ],
    sizes: ["Small", "Medium", "Large", "Custom size"],
  },
  "leather handbags": {
    displayName: "Leather handbags",
    variants: [
      { name: "Crossbody bag", detail: "Compact daily-use silhouette" },
      { name: "Structured tote", detail: "Roomier office or travel bag" },
      { name: "Mini shoulder bag", detail: "Fashion-led smaller format" },
      { name: "Premium full-grain", detail: "Higher finish leather option" },
    ],
    sizes: ["Mini", "Medium", "Large", "Custom hardware"],
  },
  backpacks: {
    displayName: "Canvas backpacks",
    variants: [
      { name: "Basic daypack", detail: "School and daily carry" },
      { name: "Laptop backpack", detail: "Padded compartment build" },
      { name: "Roll-top canvas", detail: "Outdoor-inspired format" },
      { name: "Water-resistant", detail: "Coated fabric version" },
    ],
    sizes: ["12L", "18L", "24L", "Custom pocketing"],
  },
  "leather wallets": {
    displayName: "Leather wallets",
    variants: [
      { name: "Bifold wallet", detail: "Classic everyday carry" },
      { name: "Card holder", detail: "Slim minimalist profile" },
      { name: "Zip wallet", detail: "Secure coin and cash storage" },
      { name: "Passport wallet", detail: "Travel document organizer" },
    ],
    sizes: ["Slim", "Standard", "Travel", "Custom leather"],
  },
  "cotton t-shirts": {
    displayName: "Cotton t-shirt",
    variants: [
      { name: "Crew neck", detail: "Classic everyday t-shirt" },
      { name: "Oversized fit", detail: "Streetwear silhouette" },
      { name: "Heavyweight GSM", detail: "Premium fabric feel" },
      { name: "Printed tee", detail: "Screen or DTG artwork" },
    ],
    sizes: ["S", "M", "L", "XL"],
  },
  "organic cotton hoodies": {
    displayName: "Organic cotton hoodies",
    variants: [
      { name: "Pullover hoodie", detail: "Classic fleece style" },
      { name: "Zip hoodie", detail: "Full zip construction" },
      { name: "Washed hoodie", detail: "Soft vintage finish" },
    ],
    sizes: ["S", "M", "L", "XL"],
  },
  "denim jeans": {
    displayName: "Denim jeans",
    variants: [
      { name: "Slim fit denim", detail: "Tapered everyday fit" },
      { name: "Regular fit denim", detail: "Classic straight-leg fit" },
      { name: "Ripped jeans", detail: "Distressed fashion finish" },
      { name: "Wide-leg denim", detail: "Relaxed trend silhouette" },
    ],
    sizes: ["28-30", "32-34", "36-38", "Custom wash"],
  },
  "activewear sets": {
    displayName: "Activewear sets",
    variants: [
      { name: "Legging set", detail: "Leggings with matching top" },
      { name: "Sports bra set", detail: "Performance two-piece" },
      { name: "Training set", detail: "Gym and running use" },
      { name: "Seamless set", detail: "Premium knitted construction" },
    ],
    sizes: ["XS-S", "M-L", "XL", "Custom color"],
  },
  "face serum": {
    displayName: "Vitamin C face serum",
    variants: [
      { name: "Vitamin C serum", detail: "Brightening skincare formula" },
      { name: "Hyaluronic serum", detail: "Hydration-focused formula" },
      { name: "Niacinamide serum", detail: "Oil-control positioning" },
      { name: "Retinol serum", detail: "Night repair product" },
    ],
    sizes: ["30ml", "50ml", "100ml", "Custom bottle"],
  },
  "lip balm": {
    displayName: "Lip balm tubes",
    variants: [
      { name: "Clear balm", detail: "Daily moisturising SKU" },
      { name: "Tinted balm", detail: "Light color cosmetic" },
      { name: "SPF balm", detail: "Sun-care lip product" },
      { name: "Flavoured balm", detail: "Fruit or mint option" },
    ],
    sizes: ["4g stick", "8g tube", "Tin", "Custom flavour"],
  },
  sunscreen: {
    displayName: "Sunscreen lotion",
    variants: [
      { name: "SPF 30 lotion", detail: "Daily-use sunscreen" },
      { name: "SPF 50 lotion", detail: "Higher protection SKU" },
      { name: "Mineral sunscreen", detail: "Zinc-based formula" },
      { name: "Kids sunscreen", detail: "Gentler family positioning" },
    ],
    sizes: ["30ml", "50ml", "100ml", "Travel tube"],
  },
  "soap bars": {
    displayName: "Soap bars",
    variants: [
      { name: "Shea butter soap", detail: "Moisturising bar" },
      { name: "Charcoal soap", detail: "Deep-clean positioning" },
      { name: "Herbal soap", detail: "Natural ingredient story" },
      { name: "Hotel soap", detail: "Small-format hospitality SKU" },
    ],
    sizes: ["50g", "75g", "100g", "Gift pack"],
  },
  "tea packs": {
    displayName: "Tea packs",
    variants: [
      { name: "Black tea bags", detail: "Mass-market tea box" },
      { name: "Green tea sachets", detail: "Wellness positioning" },
      { name: "Masala tea packs", detail: "Spiced flavor blend" },
      { name: "Loose leaf pouch", detail: "Premium refill format" },
    ],
    sizes: ["25 bags", "50 bags", "100 bags", "Bulk pouch"],
  },
  "spice blends": {
    displayName: "Spice blend pouches",
    variants: [
      { name: "Garam masala", detail: "Core pantry blend" },
      { name: "Curry powder", detail: "Export-friendly spice mix" },
      { name: "Chilli blend", detail: "Heat-focused seasoning" },
      { name: "BBQ spice rub", detail: "DTC food brand SKU" },
    ],
    sizes: ["50g", "100g", "250g", "Custom blend"],
  },
  "rice exporters": {
    displayName: "Rice sacks",
    variants: [
      { name: "Basmati rice", detail: "Long-grain premium rice" },
      { name: "Parboiled rice", detail: "Everyday bulk format" },
      { name: "Aromatic rice", detail: "Regional specialty SKU" },
      { name: "Private label rice", detail: "Buyer-branded packaging" },
    ],
    sizes: ["1kg", "5kg", "25kg", "50kg sack"],
  },
  "snack pouches": {
    displayName: "Snack pouches",
    variants: [
      { name: "Chips pouch", detail: "Lightweight snack pack" },
      { name: "Nut pouch", detail: "Resealable dry food pouch" },
      { name: "Granola pouch", detail: "Health snack format" },
      { name: "Single-serve pouch", detail: "Checkout counter SKU" },
    ],
    sizes: ["30g", "80g", "150g", "Family pack"],
  },
  "honey jars": {
    displayName: "Honey jars",
    variants: [
      { name: "Glass jar honey", detail: "Premium shelf presentation" },
      { name: "Squeeze bottle", detail: "Convenient retail pack" },
      { name: "Raw honey", detail: "Natural product positioning" },
      { name: "Gift jar", detail: "Premium gifting format" },
    ],
    sizes: ["125g", "250g", "500g", "1kg"],
  },
  "cotton blankets": {
    displayName: "Cotton blankets",
    variants: [
      { name: "Lightweight throw", detail: "Soft everyday home textile" },
      { name: "Waffle blanket", detail: "Textured premium weave" },
      { name: "Baby blanket", detail: "Small gentle cotton format" },
      { name: "Hotel blanket", detail: "Bulk hospitality option" },
    ],
    sizes: ["Single", "Double", "Queen", "Custom GSM"],
  },
  towels: {
    displayName: "Cotton bath towels",
    variants: [
      { name: "Bath towel", detail: "Standard bathroom towel" },
      { name: "Hand towel", detail: "Smaller matching SKU" },
      { name: "Hotel towel", detail: "White bulk hospitality towel" },
      { name: "Organic towel", detail: "Premium cotton positioning" },
    ],
    sizes: ["400 GSM", "500 GSM", "600 GSM", "Custom color"],
  },
  bedding: {
    displayName: "Bedding sheet sets",
    variants: [
      { name: "Cotton sheet set", detail: "Everyday bedding SKU" },
      { name: "Percale set", detail: "Crisp premium weave" },
      { name: "Sateen set", detail: "Soft premium finish" },
      { name: "Printed bedding", detail: "Patterned retail style" },
    ],
    sizes: ["Single", "Queen", "King", "Custom print"],
  },
  rugs: {
    displayName: "Handwoven rugs",
    variants: [
      { name: "Flatweave rug", detail: "Lightweight woven style" },
      { name: "Jute rug", detail: "Natural fiber home SKU" },
      { name: "Wool rug", detail: "Premium material option" },
      { name: "Runner rug", detail: "Long hallway format" },
    ],
    sizes: ["2x3 ft", "4x6 ft", "6x9 ft", "Runner"],
  },
  "folding cartons": {
    displayName: "Folding cartons",
    variants: [
      { name: "Retail carton", detail: "Shelf-ready paper box" },
      { name: "Mailer carton", detail: "DTC shipping format" },
      { name: "Window carton", detail: "Product-visible packaging" },
      { name: "Luxury carton", detail: "Premium board and finish" },
    ],
    sizes: ["Small", "Medium", "Large", "Custom dieline"],
  },
  "paper bags": {
    displayName: "Kraft paper bags",
    variants: [
      { name: "Flat handle bag", detail: "Retail checkout format" },
      { name: "Twisted handle bag", detail: "Premium carry bag" },
      { name: "Printed paper bag", detail: "Brand-ready format" },
      { name: "Food paper bag", detail: "Takeaway-friendly SKU" },
    ],
    sizes: ["Small", "Medium", "Large", "Custom print"],
  },
  "cosmetic boxes": {
    displayName: "Cosmetic gift boxes",
    variants: [
      { name: "Lipstick box", detail: "Slim beauty carton" },
      { name: "Serum box", detail: "Bottle carton format" },
      { name: "Skincare set box", detail: "Gift set packaging" },
      { name: "Rigid gift box", detail: "Premium unboxing format" },
    ],
    sizes: ["Small", "Medium", "Large", "Custom insert"],
  },
  "jute pouches": {
    displayName: "Jute pouches",
    variants: [
      { name: "Drawstring pouch", detail: "Simple reusable pouch" },
      { name: "Bottle pouch", detail: "Wine or gift packaging" },
      { name: "Cosmetic pouch", detail: "Small beauty accessory" },
      { name: "Printed pouch", detail: "Logo-ready format" },
    ],
    sizes: ["Small", "Medium", "Large", "Custom print"],
  },
  "canvas sneakers": {
    displayName: "Canvas sneakers",
    variants: [
      { name: "Low-top sneaker", detail: "Classic casual silhouette" },
      { name: "High-top sneaker", detail: "Streetwear style" },
      { name: "Slip-on canvas", detail: "Easy-wear footwear" },
      { name: "Printed sneaker", detail: "Custom upper artwork" },
    ],
    sizes: ["EU 36-40", "EU 41-45", "Kids", "Custom sole"],
  },
  "sports shoes": {
    displayName: "Running shoes",
    variants: [
      { name: "Road running shoe", detail: "Light daily runner" },
      { name: "Training shoe", detail: "Gym and cross-training" },
      { name: "Trail shoe", detail: "Outdoor tread option" },
      { name: "Knitted upper", detail: "Modern breathable build" },
    ],
    sizes: ["EU 36-40", "EU 41-45", "Wide fit", "Custom outsole"],
  },
  "leather sandals": {
    displayName: "Leather sandals",
    variants: [
      { name: "Slide sandal", detail: "Simple summer style" },
      { name: "Strap sandal", detail: "Adjustable fit option" },
      { name: "Premium leather", detail: "Higher finish upper" },
      { name: "Comfort footbed", detail: "Cushioned daily use" },
    ],
    sizes: ["EU 36-40", "EU 41-45", "Wide fit", "Custom color"],
  },
  "kids footwear": {
    displayName: "Kids school shoes",
    variants: [
      { name: "School shoe", detail: "Uniform-friendly style" },
      { name: "Kids sneaker", detail: "Daily casual shoe" },
      { name: "Velcro shoe", detail: "Easy fasten option" },
      { name: "Sport kids shoe", detail: "Active-use design" },
    ],
    sizes: ["Toddler", "Kids", "Youth", "Custom sole"],
  },
}

export function getProductVisualConfig(product?: string | null): ProductVisualConfig | null {
  if (!product) return null
  const normalized = product.trim().toLowerCase()
  return PRODUCT_VISUAL_CATALOG[normalized] ?? {
    displayName: product,
    variants: DEFAULT_VARIANTS,
    sizes: DEFAULT_SIZES,
  }
}

export function productDisplayName(product?: string | null) {
  return getProductVisualConfig(product)?.displayName ?? product ?? ""
}

function quoteStepForRange(low: number, high: number) {
  if (high <= 2) return 0.25
  if (high <= 20) return 0.5
  return 1
}

function roundToQuoteStep(value: number, step: number) {
  return Number((Math.round(value / step) * step).toFixed(2))
}

function money(value: number) {
  const formatted = value.toFixed(value % 1 === 0 ? 0 : 2)
  return `$${formatted.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`
}

export function getProductPriceBands(product?: string | null): ProductPriceBand[] {
  const [low, high] = product ? PRODUCT_PRICE_RANGES[product.trim().toLowerCase()] ?? [1, 10] : [1, 10]
  const step = quoteStepForRange(low, high)
  const roundedLow = roundToQuoteStep(low, step)
  const roundedHigh = roundToQuoteStep(high, step)
  const lowMax = roundToQuoteStep(low + (high - low) * 0.34, step)
  const standardMax = roundToQuoteStep(low + (high - low) * 0.68, step)

  return [
    { value: "low", label: `Low: ${money(roundedLow)}-${money(lowMax)}`, min: roundedLow, max: lowMax },
    { value: "standard", label: `Standard: ${money(lowMax)}-${money(standardMax)}`, min: lowMax, max: standardMax },
    { value: "premium", label: `Premium: ${money(standardMax)}-${money(roundedHigh)}`, min: standardMax, max: roundedHigh },
  ]
}

export function categoryDisplayLabel(category: SupplierCategory) {
  const label = {
    accessories: "Bags & accessories",
    apparel: "Apparel",
    beauty: "Skincare & beauty",
    food: "Food & beverage",
    footwear: "Footwear",
    home: "Home goods",
    packaging: "Packaging",
    electronics: "Electronics",
    industrial: "Industrial",
    textiles: "Textiles",
  } satisfies Record<SupplierCategory, string>
  return label[category]
}
