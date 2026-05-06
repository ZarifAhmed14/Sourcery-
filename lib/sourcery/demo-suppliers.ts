import type { Supplier, SupplierCategory } from "@/lib/types"

const DEMO_SUPPLIERS = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Dhaka Jute Works",
    country: "Bangladesh",
    city: "Dhaka",
    region: "South Asia",
    category: "accessories",
    subcategory: "jute tote bags",
    description:
      "Export-ready jute and cotton tote bag producer with custom print, recycled handles, low MOQ pilots, and Bangladesh-focused logistics support.",
    unit_price_usd: 1.42,
    moq: 300,
    lead_time_days: 18,
    on_time_rate: 96,
    quality_rating: 4.7,
    risk_score: 18,
    certifications: ["Sedex", "BSCI", "OEKO-TEX"],
    bgmea_certified: true,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Chattogram Knit Collective",
    country: "Bangladesh",
    city: "Chattogram",
    region: "South Asia",
    category: "apparel",
    subcategory: "cotton knitwear",
    description:
      "Mid-sized knitwear exporter for tees, polos, hoodies, and cotton basics with transparent capacity planning and buyer inspection checkpoints.",
    unit_price_usd: 3.85,
    moq: 500,
    lead_time_days: 24,
    on_time_rate: 94,
    quality_rating: 4.5,
    risk_score: 22,
    certifications: ["WRAP", "BSCI", "GOTS"],
    bgmea_certified: true,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Narayanganj Home Textiles",
    country: "Bangladesh",
    city: "Narayanganj",
    region: "South Asia",
    category: "home",
    subcategory: "towels and bedding",
    description:
      "Home textile supplier for towels, sheets, pillow covers, and bath sets with compact shipment options for Bangladesh-based buyers.",
    unit_price_usd: 2.6,
    moq: 450,
    lead_time_days: 21,
    on_time_rate: 93,
    quality_rating: 4.4,
    risk_score: 26,
    certifications: ["OEKO-TEX", "ISO 9001"],
    bgmea_certified: true,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Kolkata Leather Studio",
    country: "India",
    city: "Kolkata",
    region: "South Asia",
    category: "accessories",
    subcategory: "wallets and leather bags",
    description:
      "Small-batch leather goods workshop for wallets, belts, and handbags with flexible sampling and regional freight lanes into Bangladesh.",
    unit_price_usd: 4.25,
    moq: 250,
    lead_time_days: 20,
    on_time_rate: 92,
    quality_rating: 4.3,
    risk_score: 29,
    certifications: ["Leather Working Group"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    name: "Da Nang Activewear Hub",
    country: "Vietnam",
    city: "Da Nang",
    region: "Southeast Asia",
    category: "apparel",
    subcategory: "activewear",
    description:
      "Performance apparel supplier for leggings, training tops, and lightweight jackets with strong QA documentation and fabric traceability.",
    unit_price_usd: 5.8,
    moq: 700,
    lead_time_days: 32,
    on_time_rate: 95,
    quality_rating: 4.8,
    risk_score: 20,
    certifications: ["WRAP", "GRS"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    name: "Shenzhen Accessory Grid",
    country: "China",
    city: "Shenzhen",
    region: "East Asia",
    category: "accessories",
    subcategory: "phone cases and chargers",
    description:
      "Consumer accessory supplier for phone cases, compact chargers, and earbuds with broad catalog coverage and faster sample turnaround.",
    unit_price_usd: 2.1,
    moq: 1000,
    lead_time_days: 28,
    on_time_rate: 91,
    quality_rating: 4.2,
    risk_score: 34,
    certifications: ["ISO 9001", "CE"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000107",
    name: "Bursa Loom House",
    country: "Turkey",
    city: "Bursa",
    region: "Europe",
    category: "home",
    subcategory: "rugs and throws",
    description:
      "Premium home goods manufacturer for woven rugs, throws, and decorative textiles with strong European compliance readiness.",
    unit_price_usd: 8.4,
    moq: 350,
    lead_time_days: 35,
    on_time_rate: 94,
    quality_rating: 4.6,
    risk_score: 24,
    certifications: ["OEKO-TEX", "ISO 14001"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000108",
    name: "Casablanca Botanics",
    country: "Morocco",
    city: "Casablanca",
    region: "MENA",
    category: "beauty",
    subcategory: "argan skincare",
    description:
      "Beauty supplier focused on argan oil, soap, lotion, and clean-label skincare batches with ingredient documentation.",
    unit_price_usd: 3.2,
    moq: 400,
    lead_time_days: 30,
    on_time_rate: 90,
    quality_rating: 4.4,
    risk_score: 31,
    certifications: ["ISO 22716", "Ecocert"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000109",
    name: "Sylhet Tea & Spice Export",
    country: "Bangladesh",
    city: "Sylhet",
    region: "South Asia",
    category: "food",
    subcategory: "tea and spice packs",
    description:
      "Packaged tea, spice, and pantry supplier with export labeling, small test batches, and Bangladesh-origin sourcing documentation.",
    unit_price_usd: 1.18,
    moq: 600,
    lead_time_days: 16,
    on_time_rate: 95,
    quality_rating: 4.5,
    risk_score: 21,
    certifications: ["HACCP", "ISO 22000"],
    bgmea_certified: false,
    source_type: "synthetic",
    source_url: null,
    verified_at: "2026-05-01T00:00:00.000Z",
  },
] satisfies Supplier[]

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .slice(0, 12)
}

function scoreSupplier(supplier: Supplier, tokens: string[], bangladeshHint: boolean): number {
  const haystack = `${supplier.name} ${supplier.country} ${supplier.city} ${supplier.category} ${supplier.subcategory} ${supplier.description} ${supplier.certifications.join(" ")}`.toLowerCase()
  const matches = tokens.filter((token) => haystack.includes(token)).length
  const matchScore = tokens.length ? (matches / tokens.length) * 45 : 10
  const qualityScore = supplier.quality_rating * 7
  const deliveryScore = supplier.on_time_rate * 0.12
  const riskPenalty = supplier.risk_score * 0.12
  const bdBonus = bangladeshHint && ["Bangladesh", "India", "Pakistan", "Vietnam"].includes(supplier.country) ? 14 : 0

  return Math.round((matchScore + qualityScore + deliveryScore + bdBonus - riskPenalty) * 100) / 100
}

export function getDemoSuppliers(query: string, topK: number, category: SupplierCategory | null): Supplier[] {
  const tokens = tokenize(query)
  const bangladeshHint = /\b(bangladesh|bd|dhaka|chattogram|local|nearby|jute)\b/i.test(query)
  const categoryPool = category ? DEMO_SUPPLIERS.filter((supplier) => supplier.category === category) : DEMO_SUPPLIERS
  const pool = categoryPool.length > 0 ? categoryPool : DEMO_SUPPLIERS

  return pool
    .map((supplier) => ({ supplier, score: scoreSupplier(supplier, tokens, bangladeshHint) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK))
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))
}

export function listDemoSuppliers(args: {
  q?: string
  category?: SupplierCategory
  country?: string
  region?: Supplier["region"]
  limit: number
  offset: number
}): { suppliers: Supplier[]; count: number } {
  const tokens = tokenize(args.q ?? "")
  const country = args.country?.toLowerCase()
  const filtered = DEMO_SUPPLIERS.filter((supplier) => {
    if (args.category && supplier.category !== args.category) return false
    if (args.region && supplier.region !== args.region) return false
    if (country && !supplier.country.toLowerCase().includes(country)) return false

    if (tokens.length > 0) {
      const haystack = `${supplier.name} ${supplier.country} ${supplier.city} ${supplier.category} ${supplier.subcategory} ${supplier.description} ${supplier.certifications.join(" ")}`.toLowerCase()
      if (!tokens.some((token) => haystack.includes(token))) return false
    }

    return true
  })

  const ranked = filtered
    .map((supplier) => ({ supplier, score: scoreSupplier(supplier, tokens, false) }))
    .sort((a, b) => b.score - a.score)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))

  return {
    suppliers: ranked.slice(args.offset, args.offset + args.limit),
    count: ranked.length,
  }
}

export function findDemoSupplier(id: string): Supplier | null {
  return DEMO_SUPPLIERS.find((supplier) => supplier.id === id) ?? null
}
