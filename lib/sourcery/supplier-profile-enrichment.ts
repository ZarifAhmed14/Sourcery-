import type { Supplier } from "@/lib/types"

type SupplierMetadata = {
  port?: string
  sample_days?: number
  incoterms?: string[]
}

export type SupplierLogisticsLane = {
  mode: "ship" | "air" | "road"
  modeLabel: string
  routeLabel: string
  originLabel: string
  destinationLabel: string
  destinationDetail: string
  etaLabel: string
  rationale: string
}

type SupplierProfileFields = {
  monthlyCapacity: number | null
  paymentTerms: string
  metadata: Required<SupplierMetadata>
}

const DEFAULT_PORT_BY_COUNTRY: Record<string, string> = {
  bangladesh: "Chattogram",
  china: "Shenzhen",
  india: "Nhava Sheva",
  vietnam: "Cat Lai",
  turkey: "Istanbul",
  morocco: "Casablanca",
  egypt: "Alexandria",
  brazil: "Santos",
  colombia: "Cartagena",
  mexico: "Laredo",
  "united states": "Los Angeles",
  portugal: "Leixoes",
  poland: "Gdansk",
  pakistan: "Karachi",
  indonesia: "Tanjung Priok",
}

const DEFAULT_AIRPORT_BY_COUNTRY: Record<string, string> = {
  bangladesh: "Dhaka Hazrat Shahjalal Airport",
  china: "Shenzhen Bao'an Airport",
  india: "Mumbai Airport",
  vietnam: "Tan Son Nhat Airport",
  turkey: "Istanbul Airport",
  morocco: "Mohammed V Airport",
  egypt: "Cairo International Airport",
  brazil: "Sao Paulo Guarulhos Airport",
  colombia: "Jose Maria Cordova Airport",
  mexico: "Monterrey Airport",
  "united states": "Los Angeles International Airport",
  portugal: "Porto Airport",
  poland: "Warsaw Chopin Airport",
  pakistan: "Jinnah International Airport",
  indonesia: "Soekarno-Hatta Airport",
}

const PORT_BY_CITY: Record<string, string> = {
  dhaka: "Chattogram",
  chattogram: "Chattogram",
  chittagong: "Chattogram",
  narayanganj: "Chattogram",
  ho: "Cat Lai",
  hanoi: "Hai Phong",
  guangzhou: "Nansha",
  shenzhen: "Yantian",
  foshan: "Nansha",
  mumbai: "Nhava Sheva",
  tiruppur: "Chennai",
  istanbul: "Istanbul",
  izmir: "Izmir",
  tangier: "Tangier Med",
  casablanca: "Casablanca",
  cairo: "Alexandria",
  sao: "Santos",
  medellin: "Cartagena",
  monterrey: "Laredo",
  los: "Long Beach",
}

const AIRPORT_BY_CITY: Record<string, string> = {
  dhaka: "Dhaka Hazrat Shahjalal Airport",
  chattogram: "Chattogram Shah Amanat Airport",
  chittagong: "Chattogram Shah Amanat Airport",
  narayanganj: "Dhaka Hazrat Shahjalal Airport",
  ho: "Tan Son Nhat Airport",
  hanoi: "Noi Bai Airport",
  guangzhou: "Guangzhou Baiyun Airport",
  shenzhen: "Shenzhen Bao'an Airport",
  foshan: "Guangzhou Baiyun Airport",
  mumbai: "Mumbai Airport",
  tiruppur: "Coimbatore Airport",
  istanbul: "Istanbul Airport",
  izmir: "Izmir Adnan Menderes Airport",
  tangier: "Tangier Ibn Battuta Airport",
  casablanca: "Mohammed V Airport",
  cairo: "Cairo International Airport",
  sao: "Sao Paulo Guarulhos Airport",
  medellin: "Jose Maria Cordova Airport",
  monterrey: "Monterrey Airport",
  los: "Los Angeles International Airport",
}

const SAMPLE_DAYS_BY_CATEGORY: Partial<Record<Supplier["category"], number>> = {
  apparel: 8,
  accessories: 10,
  beauty: 10,
  electronics: 12,
  food: 6,
  footwear: 10,
  home: 9,
  industrial: 10,
  packaging: 6,
  textiles: 8,
}

const INCOTERMS_BY_CATEGORY: Partial<Record<Supplier["category"], string[]>> = {
  apparel: ["FOB", "CFR"],
  accessories: ["FOB", "EXW"],
  beauty: ["FOB", "EXW"],
  electronics: ["FOB", "DAP"],
  food: ["FOB", "CIF"],
  footwear: ["FOB", "EXW"],
  home: ["FOB", "EXW"],
  industrial: ["EXW", "DAP"],
  packaging: ["FOB", "EXW"],
  textiles: ["FOB", "CIF"],
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function inferMonthlyCapacity(supplier: Supplier): number {
  const categoryMultiplier: Record<Supplier["category"], number> = {
    accessories: 18,
    apparel: 24,
    beauty: 20,
    electronics: 18,
    food: 20,
    footwear: 14,
    home: 16,
    industrial: 12,
    packaging: 32,
    textiles: 22,
  }

  const base = Math.max(supplier.moq * categoryMultiplier[supplier.category], supplier.moq * 10)
  const riskAdjustment = supplier.risk_score <= 30 ? 1.08 : supplier.risk_score >= 60 ? 0.9 : 1
  const leadAdjustment = supplier.lead_time_days <= 25 ? 1.06 : supplier.lead_time_days >= 45 ? 0.94 : 1

  return Math.round((base * riskAdjustment * leadAdjustment) / 500) * 500
}

function inferPaymentTerms(supplier: Supplier): string {
  if (supplier.risk_score <= 25) return "30% advance, 70% against shipping documents"
  if (supplier.risk_score <= 45 && supplier.unit_price_usd <= 3) return "30% deposit, 70% before shipment"
  if (supplier.risk_score <= 55) return "40% advance, 60% before dispatch"
  return "50% advance, 50% before shipment"
}

function inferPort(supplier: Supplier): string {
  const cityKey = normalizeKey(supplier.city).split(/[^a-z]+/)[0] ?? ""
  const countryKey = normalizeKey(supplier.country)
  return PORT_BY_CITY[cityKey] ?? DEFAULT_PORT_BY_COUNTRY[countryKey] ?? "Main export port"
}

function inferSampleDays(supplier: Supplier): number {
  const categoryBase = SAMPLE_DAYS_BY_CATEGORY[supplier.category] ?? 9
  const complexityBump = supplier.products && supplier.products.length >= 3 ? 2 : 0
  const leadAdjustment = supplier.lead_time_days >= 40 ? 2 : supplier.lead_time_days <= 20 ? -1 : 0
  return Math.max(5, categoryBase + complexityBump + leadAdjustment)
}

function inferIncoterms(supplier: Supplier): string[] {
  return INCOTERMS_BY_CATEGORY[supplier.category] ?? ["FOB", "EXW"]
}

function inferAirport(supplier: Supplier): string {
  const cityKey = normalizeKey(supplier.city).split(/[^a-z]+/)[0] ?? ""
  const countryKey = normalizeKey(supplier.country)
  return AIRPORT_BY_CITY[cityKey] ?? DEFAULT_AIRPORT_BY_COUNTRY[countryKey] ?? "Main cargo airport"
}

function inferSeaEta(supplier: Supplier): string {
  const totalDays = Math.max(18, Math.round(supplier.lead_time_days * 0.45))
  return `${totalDays}-${totalDays + 7} days`
}

function inferAirEta(supplier: Supplier): string {
  const totalDays = Math.max(3, Math.round(supplier.lead_time_days * 0.18))
  return `${totalDays}-${totalDays + 3} days`
}

function inferRoadEta(supplier: Supplier): string {
  if (normalizeKey(supplier.country) === "bangladesh") return "1-3 days"
  return "4-8 days"
}

export function inferSupplierLogisticsLane(args: {
  supplier: Supplier
  metadata?: SupplierMetadata | null
}): SupplierLogisticsLane {
  const { supplier } = args
  const metadata = args.metadata ?? {}
  const port = typeof metadata.port === "string" && metadata.port.trim() ? metadata.port.trim() : inferPort(supplier)
  const airport = inferAirport(supplier)
  const countryKey = normalizeKey(supplier.country)

  if (countryKey === "bangladesh") {
    return {
      mode: "road",
      modeLabel: "By road",
      routeLabel: "Domestic truck dispatch",
      originLabel: `${supplier.city} factory dispatch`,
      destinationLabel: "Dhaka buyer warehouse",
      destinationDetail: "Best for local Bangladesh fulfillment and short replenishment runs.",
      etaLabel: inferRoadEta(supplier),
      rationale: "This supplier is already inside Bangladesh, so direct trucking is the cleanest and most realistic route.",
    }
  }

  if (countryKey === "india") {
    return {
      mode: "road",
      modeLabel: "By road",
      routeLabel: "Cross-border land corridor",
      originLabel: `${supplier.city} consolidation hub`,
      destinationLabel: "Benapole land port to Dhaka",
      destinationDetail: "Works best for nearby India-to-Bangladesh replenishment when shipment size stays manageable.",
      etaLabel: inferRoadEta(supplier),
      rationale: "The supplier is close enough to Bangladesh for practical cross-border trucking on selected order sizes.",
    }
  }

  if (supplier.lead_time_days <= 18 || supplier.moq <= 400 || supplier.unit_price_usd >= 12) {
    return {
      mode: "air",
      modeLabel: "By plane",
      routeLabel: "Urgent air cargo lane",
      originLabel: airport,
      destinationLabel: "Dhaka Hazrat Shahjalal Airport",
      destinationDetail: "Best for urgent samples, tighter launch windows, or higher-value goods.",
      etaLabel: inferAirEta(supplier),
      rationale: "Air freight is the better fit here because speed or product value matters more than pure freight savings.",
    }
  }

  return {
    mode: "ship",
    modeLabel: "By ship",
    routeLabel: "Sea freight export lane",
    originLabel: `${port} Port`,
    destinationLabel: "Chattogram Port",
    destinationDetail: "Best for margin protection on repeat orders and heavier shipment volumes.",
    etaLabel: inferSeaEta(supplier),
    rationale: "Sea freight is the most realistic lane for this supplier once order volume and landed-cost discipline matter.",
  }
}

function sanitizeIncoterms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

export function enrichSupplierProfileFields(args: {
  supplier: Supplier
  monthlyCapacity?: number | null
  paymentTerms?: string | null
  metadata?: SupplierMetadata | null
}): SupplierProfileFields {
  const { supplier } = args
  const metadata = args.metadata ?? {}
  const sampleDays = typeof metadata.sample_days === "number" && metadata.sample_days > 0 ? metadata.sample_days : inferSampleDays(supplier)
  const port = typeof metadata.port === "string" && metadata.port.trim() ? metadata.port.trim() : inferPort(supplier)
  const incoterms = sanitizeIncoterms(metadata.incoterms)

  return {
    monthlyCapacity: typeof args.monthlyCapacity === "number" && args.monthlyCapacity > 0 ? args.monthlyCapacity : inferMonthlyCapacity(supplier),
    paymentTerms: args.paymentTerms?.trim() ? args.paymentTerms : inferPaymentTerms(supplier),
    metadata: {
      port,
      sample_days: sampleDays,
      incoterms: incoterms.length > 0 ? incoterms : inferIncoterms(supplier),
    },
  }
}
