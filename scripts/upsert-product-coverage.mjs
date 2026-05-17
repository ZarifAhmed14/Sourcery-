import { createClient } from "@supabase/supabase-js"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const EMBEDDING_DIMENSIONS = 1536

const CATALOG = [
  { category: "accessories", products: ["jute tote bags", "leather handbags", "backpacks", "cotton-jute export totes"] },
  { category: "apparel", products: ["cotton t-shirts", "organic cotton hoodies", "denim jeans", "activewear sets"] },
  { category: "beauty", products: ["face serum", "lip balm", "sunscreen", "soap bars"] },
  { category: "food", products: ["tea packs", "spice blends", "rice exporters", "snack pouches", "honey jars"] },
  { category: "home", products: ["ceramic tableware", "towels", "bedding", "rugs"] },
  { category: "packaging", products: ["folding cartons", "paper bags", "cosmetic boxes", "jute pouches"] },
  { category: "footwear", products: ["canvas sneakers", "sports shoes", "leather sandals", "kids footwear"] },
]

const PRODUCT_CONFIG = {
  "jute tote bags": { countries: [["Bangladesh", "Dhaka", "South Asia"], ["Bangladesh", "Chattogram", "South Asia"], ["India", "Kolkata", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"]], basePrice: 1.25, moq: [250, 400, 600, 900], lead: [18, 22, 28, 34], certs: ["BGMEA", "BSCI", "OEKO-TEX"] },
  "leather handbags": { countries: [["Turkey", "Istanbul", "MENA"], ["India", "Jaipur", "South Asia"], ["Morocco", "Marrakesh", "MENA"], ["Vietnam", "Hanoi", "Southeast Asia"]], basePrice: 18.5, moq: [120, 250, 400, 600], lead: [28, 34, 42, 48], certs: ["LWG", "Sedex", "ISO 9001"] },
  backpacks: { countries: [["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["China", "Guangzhou", "East Asia"], ["Bangladesh", "Dhaka", "South Asia"], ["India", "Mumbai", "South Asia"]], basePrice: 5.2, moq: [300, 500, 750, 1000], lead: [24, 30, 36, 42], certs: ["BSCI", "GRS", "ISO 9001"] },
  "cotton-jute export totes": { countries: [["Bangladesh", "Narayanganj", "South Asia"], ["Bangladesh", "Khulna", "South Asia"], ["India", "Kolkata", "South Asia"], ["Pakistan", "Lahore", "South Asia"]], basePrice: 1.6, moq: [200, 350, 550, 800], lead: [18, 21, 27, 32], certs: ["BGMEA", "OEKO-TEX", "Sedex"] },
  "cotton t-shirts": { countries: [["Bangladesh", "Gazipur", "South Asia"], ["India", "Tiruppur", "South Asia"], ["Vietnam", "Hanoi", "Southeast Asia"], ["Turkey", "Bursa", "MENA"]], basePrice: 2.95, moq: [300, 500, 800, 1200], lead: [20, 26, 32, 38], certs: ["OEKO-TEX", "BSCI", "WRAP"] },
  "organic cotton hoodies": { countries: [["Bangladesh", "Savar", "South Asia"], ["India", "Tiruppur", "South Asia"], ["Turkey", "Istanbul", "MENA"], ["Vietnam", "Da Nang", "Southeast Asia"]], basePrice: 7.8, moq: [250, 400, 650, 900], lead: [24, 30, 38, 44], certs: ["GOTS", "OEKO-TEX", "BSCI"] },
  "denim jeans": { countries: [["Bangladesh", "Narayanganj", "South Asia"], ["Turkey", "Izmir", "MENA"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["India", "Bengaluru", "South Asia"]], basePrice: 8.4, moq: [400, 700, 900, 1200], lead: [30, 36, 42, 50], certs: ["BSCI", "Sedex", "OEKO-TEX"] },
  "activewear sets": { countries: [["Bangladesh", "Chattogram", "South Asia"], ["Vietnam", "Hanoi", "Southeast Asia"], ["China", "Ningbo", "East Asia"], ["Turkey", "Bursa", "MENA"]], basePrice: 6.4, moq: [350, 600, 850, 1100], lead: [26, 32, 39, 45], certs: ["GRS", "BSCI", "ISO 9001"] },
  "face serum": { countries: [["India", "Mumbai", "South Asia"], ["Morocco", "Casablanca", "MENA"], ["China", "Guangzhou", "East Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 1.3, moq: [500, 1000, 1500, 2500], lead: [28, 36, 42, 50], certs: ["ISO 22716", "GMP", "Cruelty Free"] },
  "lip balm": { countries: [["India", "Mumbai", "South Asia"], ["China", "Guangzhou", "East Asia"], ["Morocco", "Casablanca", "MENA"], ["Bangladesh", "Dhaka", "South Asia"]], basePrice: 0.48, moq: [1000, 1500, 2500, 4000], lead: [24, 32, 40, 45], certs: ["GMP", "ISO 22716", "FDA Registered"] },
  sunscreen: { countries: [["India", "Mumbai", "South Asia"], ["China", "Guangzhou", "East Asia"], ["Turkey", "Istanbul", "MENA"], ["Morocco", "Casablanca", "MENA"]], basePrice: 1.65, moq: [1000, 1800, 2500, 3500], lead: [34, 42, 48, 56], certs: ["ISO 22716", "GMP", "Dermatology Tested"] },
  "soap bars": { countries: [["Bangladesh", "Dhaka", "South Asia"], ["India", "Mumbai", "South Asia"], ["Morocco", "Marrakesh", "MENA"], ["Turkey", "Izmir", "MENA"]], basePrice: 0.36, moq: [600, 1000, 1800, 2500], lead: [18, 26, 34, 40], certs: ["GMP", "ISO 22716", "Ecocert"] },
  "tea packs": { countries: [["Bangladesh", "Sylhet", "South Asia"], ["India", "Kolkata", "South Asia"], ["Vietnam", "Hanoi", "Southeast Asia"], ["China", "Hangzhou", "East Asia"]], basePrice: 0.82, moq: [500, 1000, 2000, 3500], lead: [18, 24, 30, 38], certs: ["HACCP", "ISO 22000", "Organic"] },
  "spice blends": { countries: [["Bangladesh", "Chattogram", "South Asia"], ["India", "Mumbai", "South Asia"], ["Pakistan", "Karachi", "South Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 0.95, moq: [400, 750, 1200, 2000], lead: [16, 22, 30, 36], certs: ["HACCP", "ISO 22000", "Halal"] },
  "rice exporters": { countries: [["Bangladesh", "Dinajpur", "South Asia"], ["India", "Kolkata", "South Asia"], ["Pakistan", "Lahore", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"]], basePrice: 0.68, moq: [1000, 3000, 5000, 10000], lead: [14, 21, 28, 35], certs: ["HACCP", "ISO 22000", "Halal"] },
  "snack pouches": { countries: [["Bangladesh", "Dhaka", "South Asia"], ["India", "Mumbai", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 0.42, moq: [800, 1500, 2500, 4000], lead: [20, 26, 34, 42], certs: ["HACCP", "ISO 22000", "BRC"] },
  "honey jars": { countries: [["Bangladesh", "Sylhet", "South Asia"], ["India", "Jaipur", "South Asia"], ["Turkey", "Izmir", "MENA"], ["Morocco", "Casablanca", "MENA"]], basePrice: 1.15, moq: [300, 600, 1000, 1500], lead: [18, 24, 30, 38], certs: ["HACCP", "Organic", "ISO 22000"] },
  "ceramic tableware": { countries: [["Bangladesh", "Savar", "South Asia"], ["India", "Jaipur", "South Asia"], ["China", "Guangzhou", "East Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 2.4, moq: [300, 600, 1000, 1500], lead: [24, 32, 40, 48], certs: ["ISO 9001", "Lead Safe", "BSCI"] },
  towels: { countries: [["Bangladesh", "Dhaka", "South Asia"], ["India", "Tiruppur", "South Asia"], ["Turkey", "Bursa", "MENA"], ["Pakistan", "Lahore", "South Asia"]], basePrice: 2.15, moq: [400, 700, 1000, 1500], lead: [18, 24, 30, 38], certs: ["OEKO-TEX", "GOTS", "BSCI"] },
  bedding: { countries: [["Bangladesh", "Gazipur", "South Asia"], ["India", "Tiruppur", "South Asia"], ["Turkey", "Bursa", "MENA"], ["Pakistan", "Karachi", "South Asia"]], basePrice: 5.9, moq: [300, 600, 900, 1200], lead: [24, 30, 38, 45], certs: ["OEKO-TEX", "GOTS", "BSCI"] },
  rugs: { countries: [["India", "Jaipur", "South Asia"], ["Turkey", "Istanbul", "MENA"], ["Morocco", "Marrakesh", "MENA"], ["Bangladesh", "Dhaka", "South Asia"]], basePrice: 11.8, moq: [100, 250, 400, 700], lead: [28, 36, 45, 55], certs: ["GoodWeave", "OEKO-TEX", "BSCI"] },
  "folding cartons": { countries: [["Bangladesh", "Gazipur", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["China", "Ningbo", "East Asia"], ["India", "Mumbai", "South Asia"]], basePrice: 0.18, moq: [1000, 2500, 5000, 8000], lead: [14, 20, 26, 32], certs: ["FSC", "ISO 9001", "BSCI"] },
  "paper bags": { countries: [["Bangladesh", "Dhaka", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["India", "Kolkata", "South Asia"], ["China", "Guangzhou", "East Asia"]], basePrice: 0.16, moq: [800, 1500, 3000, 5000], lead: [12, 18, 24, 30], certs: ["FSC", "ISO 9001", "Sedex"] },
  "cosmetic boxes": { countries: [["China", "Guangzhou", "East Asia"], ["India", "Mumbai", "South Asia"], ["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 0.28, moq: [1000, 2500, 4000, 7000], lead: [18, 24, 30, 36], certs: ["FSC", "ISO 9001", "BSCI"] },
  "jute pouches": { countries: [["Bangladesh", "Narayanganj", "South Asia"], ["Bangladesh", "Khulna", "South Asia"], ["India", "Kolkata", "South Asia"], ["Vietnam", "Hanoi", "Southeast Asia"]], basePrice: 0.42, moq: [300, 600, 1000, 1500], lead: [15, 20, 27, 34], certs: ["BGMEA", "OEKO-TEX", "Sedex"] },
  "canvas sneakers": { countries: [["Vietnam", "Hanoi", "Southeast Asia"], ["Bangladesh", "Gazipur", "South Asia"], ["China", "Guangzhou", "East Asia"], ["India", "Mumbai", "South Asia"]], basePrice: 7.8, moq: [300, 600, 900, 1500], lead: [30, 38, 45, 55], certs: ["BSCI", "ISO 9001", "WRAP"] },
  "sports shoes": { countries: [["Vietnam", "Ho Chi Minh City", "Southeast Asia"], ["China", "Ningbo", "East Asia"], ["India", "Mumbai", "South Asia"], ["Turkey", "Istanbul", "MENA"]], basePrice: 11.5, moq: [500, 800, 1200, 2000], lead: [38, 45, 52, 60], certs: ["BSCI", "ISO 9001", "GRS"] },
  "leather sandals": { countries: [["India", "Jaipur", "South Asia"], ["Turkey", "Istanbul", "MENA"], ["Morocco", "Marrakesh", "MENA"], ["Bangladesh", "Dhaka", "South Asia"]], basePrice: 8.9, moq: [200, 400, 700, 1000], lead: [28, 34, 42, 50], certs: ["LWG", "BSCI", "ISO 9001"] },
  "kids footwear": { countries: [["Vietnam", "Hanoi", "Southeast Asia"], ["China", "Guangzhou", "East Asia"], ["India", "Mumbai", "South Asia"], ["Bangladesh", "Gazipur", "South Asia"]], basePrice: 5.7, moq: [300, 600, 1000, 1500], lead: [28, 36, 44, 52], certs: ["BSCI", "ISO 9001", "CPSIA"] },
}

const NAME_SUFFIX = ["Makers", "Export House", "Supply Co.", "Manufacturing", "Works"]

const PRODUCT_NAME_LABELS = {
  "rice exporters": "Rice",
}

function loadDotEnvLocal() {
  const envPath = join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const equals = trimmed.indexOf("=")
    if (equals === -1) continue
    const key = trimmed.slice(0, equals).trim().replace(/^\uFEFF/, "")
    let value = trimmed.slice(equals + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
}

function uuidFromSeed(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function localHashEmbedding(text) {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest()
    const dimension = hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS
    vector[dimension] += hash[4] % 2 === 0 ? 1 : -1
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / norm).toFixed(8)))
}

function makeSupplier(category, product, index) {
  const config = PRODUCT_CONFIG[product]
  const [country, city, region] = config.countries[index]
  const seed = `coverage-v2:${category}:${product}:${country}:${index}`
  const nameProduct = product
    .replace(/^.+$/, (value) => PRODUCT_NAME_LABELS[value] ?? value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  const name = `${city} ${nameProduct} ${NAME_SUFFIX[index % NAME_SUFFIX.length]}`
  const moq = config.moq[index]
  const lead = config.lead[index]
  const riskScore = Math.min(78, 16 + index * 8 + Math.round(lead / 8))
  const price = Number((config.basePrice * (1 + index * 0.16)).toFixed(2))
  const rating = Number((4.7 - index * 0.12).toFixed(2))
  const certifications = Array.from(new Set(config.certs.slice(0, 2 + (index % 2))))
  const description = `${city}, ${country} supplier focused on ${product} for SME buyers, with quote-ready pricing, export coordination, sample planning, and comparison-ready operational data.`
  const supplier = {
    id: uuidFromSeed(seed),
    name,
    country,
    city,
    region,
    category,
    subcategory: product,
    products: [product, `${product} packaging`, `${product} private-label runs`],
    description,
    moq,
    lead_time_days: lead,
    monthly_capacity: 25000 + index * 18000,
    unit_price_usd: price,
    rating,
    risk_level: riskScore <= 30 ? "low" : riskScore <= 60 ? "medium" : "high",
    risk_score: riskScore,
    risk_notes: `${riskScore}/100 demo risk score based on lead time, MOQ, compliance coverage, and export complexity.`,
    bgmea_certified: country === "Bangladesh" && ["accessories", "apparel", "home", "packaging"].includes(category),
    certifications,
    payment_terms: "30% advance, 70% before shipment",
    contact_name: "Export Desk",
    email: `sales+${product.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${index + 1}@sourcery-demo.example`,
    phone: "+000-0000-000000",
    website: `https://${city}-${product}`.replace(/[^a-z0-9:/.]+/gi, "-").toLowerCase() + ".example",
    notes: `Coverage supplier for ${product}. Ensures dropdown product can return at least four ranked options.`,
    metadata: {
      source_kind: "coverage_seed",
      coverage_product: product,
      sample_days: 5 + index * 2,
      incoterms: ["FOB", "EXW"],
    },
  }
  return {
    ...supplier,
    embedding: localHashEmbedding([supplier.name, supplier.category, supplier.subcategory, supplier.products.join(" "), supplier.description].join("\n")),
  }
}

loadDotEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRole) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const suppliers = CATALOG.flatMap(({ category, products }) =>
  products.flatMap((product) => [0, 1, 2, 3].map((index) => makeSupplier(category, product, index))),
)

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error } = await supabase.from("suppliers").upsert(suppliers, { onConflict: "id" })
if (error) throw new Error(error.message)

const { error: cacheError } = await supabase.from("ai_cache").delete().neq("cache_key", "")
if (cacheError) console.log(`Cache clear skipped: ${cacheError.message}`)

console.log(`Upserted ${suppliers.length} product coverage suppliers.`)
