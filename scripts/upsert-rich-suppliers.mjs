import { createClient } from "@supabase/supabase-js"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const EMBEDDING_DIMENSIONS = 1536

function loadDotEnvLocal() {
  const envPath = join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim().replace(/^\uFEFF/, "")
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

function uuidFromSeed(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function hashToken(token) {
  return createHash("sha256").update(token).digest()
}

function tokenizeEmbeddingText(text) {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 450)

  const features = [...tokens]
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`${tokens[index]}_${tokens[index + 1]}`)
  }
  return features
}

function localHashEmbedding(text) {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  for (const feature of tokenizeEmbeddingText(text)) {
    const hash = hashToken(feature)
    const dimension = hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS
    const sign = hash[4] % 2 === 0 ? 1 : -1
    vector[dimension] += sign
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / norm).toFixed(8)))
}

function pick(list, index) {
  return list[index % list.length]
}

function supplierText(supplier) {
  return [
    supplier.name,
    supplier.country,
    supplier.city,
    supplier.region,
    supplier.category,
    supplier.products.join(", "),
    supplier.description,
    supplier.certifications.join(", "),
    supplier.risk_notes,
    supplier.notes,
  ].join("\n")
}

function makeSupplier(seed, input) {
  const supplier = {
    id: uuidFromSeed(`rich-supplier:${seed}`),
    bgmea_certified: false,
    certifications: [],
    contact_name: "Sourcing Desk",
    email: `sales+${seed.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}@sourcery-demo.example`,
    lead_time_days: 30,
    metadata: {},
    monthly_capacity: 25000,
    moq: 500,
    notes: "Synthetic but realistic BuildFest seed profile for sourcing workflow validation.",
    payment_terms: "30% advance, 70% before shipment",
    phone: "+880-0000-000000",
    rating: 4.1,
    risk_level: "medium",
    risk_notes: "Synthetic profile; validate before production sourcing.",
    risk_score: 35,
    unit_price_usd: 3.5,
    website: `https://${seed.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.example`,
    ...input,
  }

  return {
    ...supplier,
    embedding: localHashEmbedding(supplierText(supplier)),
  }
}

const prioritySuppliers = [
  makeSupplier("bd-jute-tote-dhaka", {
    name: "Dhaka Jute Tote Collective",
    country: "Bangladesh",
    city: "Dhaka",
    region: "South Asia",
    category: "Accessories",
    products: ["jute tote bags", "jute shopping bags", "cotton-jute blended bags", "custom printed export totes"],
    description:
      "Bangladesh jute bag supplier for export buyers needing jute tote bags, reusable shopping bags, low-MOQ custom print runs, and Chittagong port shipment support.",
    moq: 250,
    lead_time_days: 18,
    monthly_capacity: 65000,
    unit_price_usd: 1.35,
    rating: 4.82,
    risk_level: "low",
    risk_score: 16,
    bgmea_certified: true,
    certifications: ["BGMEA", "Sedex", "BSCI", "OEKO-TEX"],
    contact_name: "Farhana Islam",
    notes: "Best first result for Bangladesh jute bag sourcing and export tote programs.",
    metadata: { port: "Chittagong", sample_days: 5, incoterms: ["FOB", "CFR"], bangladesh_mode_priority: true },
  }),
  makeSupplier("bd-jute-packaging-narayanganj", {
    name: "Narayanganj Jute Packaging Works",
    country: "Bangladesh",
    city: "Narayanganj",
    region: "South Asia",
    category: "Packaging",
    products: ["laminated jute sacks", "jute gift bags", "drawstring jute pouches", "export packaging bags"],
    description:
      "Specialist Bangladesh jute packaging maker for branded jute sacks, export gift bags, pouches, and low-waste retail packaging.",
    moq: 300,
    lead_time_days: 20,
    monthly_capacity: 90000,
    unit_price_usd: 0.92,
    rating: 4.68,
    risk_level: "low",
    risk_score: 19,
    bgmea_certified: true,
    certifications: ["BGMEA", "ISO 9001", "BSCI"],
    contact_name: "Mahmud Karim",
    notes: "Strong option when buyer mentions jute packaging, sacks, or pouches.",
    metadata: { port: "Chittagong", sample_days: 6, incoterms: ["FOB"], bangladesh_mode_priority: true },
  }),
  makeSupplier("bd-eco-jute-chattogram", {
    name: "Chattogram Eco Jute Exporters",
    country: "Bangladesh",
    city: "Chattogram",
    region: "South Asia",
    category: "Accessories",
    products: ["eco jute tote bags", "beach bags", "wine bags", "screen printed jute bags"],
    description:
      "Export-focused jute bag and tote supplier near Chittagong port with short sampling windows, Bangladesh buyer familiarity, and private-label bag finishing.",
    moq: 200,
    lead_time_days: 16,
    monthly_capacity: 48000,
    unit_price_usd: 1.55,
    rating: 4.58,
    risk_level: "low",
    risk_score: 21,
    bgmea_certified: false,
    certifications: ["Sedex", "OEKO-TEX", "ISO 14001"],
    contact_name: "Rashed Chowdhury",
    notes: "Close to port; useful for fast Bangladesh Mode recommendations.",
    metadata: { port: "Chittagong", sample_days: 4, incoterms: ["FOB", "EXW"], bangladesh_mode_priority: true },
  }),
  makeSupplier("bd-jute-fabric-khulna", {
    name: "Khulna Jute Fabric Mills",
    country: "Bangladesh",
    city: "Khulna",
    region: "South Asia",
    category: "Textiles",
    products: ["jute fabric rolls", "hessian cloth", "jute canvas", "dyed jute textile"],
    description:
      "Bangladesh jute textile mill supplying hessian, canvas, and dyed jute fabric for bag manufacturers and home-goods exporters.",
    moq: 800,
    lead_time_days: 24,
    monthly_capacity: 130000,
    unit_price_usd: 0.78,
    rating: 4.36,
    risk_level: "medium",
    risk_score: 27,
    certifications: ["ISO 9001", "OEKO-TEX"],
    contact_name: "Shaila Akter",
    notes: "Useful upstream source for jute bag material and textile queries.",
    metadata: { port: "Mongla", sample_days: 8, incoterms: ["FOB", "CFR"] },
  }),
]

const countryPlans = [
  {
    country: "Bangladesh",
    region: "South Asia",
    cities: ["Dhaka", "Gazipur", "Narayanganj", "Chattogram", "Savar", "Cumilla"],
    categories: ["Apparel", "Accessories", "Packaging", "Textiles", "Food"],
    stems: ["Padma", "Jamuna", "Meghna", "Bengal", "Dhaka", "Sundarban"],
    certs: ["BGMEA", "BKMEA", "BSCI", "WRAP", "OEKO-TEX"],
    count: 24,
  },
  {
    country: "India",
    region: "South Asia",
    cities: ["Tiruppur", "Kolkata", "Mumbai", "Jaipur", "Bengaluru"],
    categories: ["Apparel", "Beauty", "Accessories", "Home", "Food"],
    stems: ["Tiruppur", "Kolkata", "Deccan", "Jaipur", "Mumbai"],
    certs: ["GOTS", "BSCI", "ISO 9001", "ISO 22716"],
    count: 14,
  },
  {
    country: "Vietnam",
    region: "Southeast Asia",
    cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
    categories: ["Apparel", "Footwear", "Packaging", "Electronics"],
    stems: ["Saigon", "Hanoi", "Mekong", "Da Nang"],
    certs: ["WRAP", "BSCI", "ISO 9001", "GRS"],
    count: 10,
  },
  {
    country: "China",
    region: "East Asia",
    cities: ["Shenzhen", "Guangzhou", "Ningbo", "Hangzhou"],
    categories: ["Electronics", "Packaging", "Accessories", "Beauty", "Home"],
    stems: ["Shenzhen", "Guangzhou", "Ningbo", "Pearl"],
    certs: ["ISO 9001", "CE", "RoHS", "BSCI"],
    count: 10,
  },
  {
    country: "Turkey",
    region: "MENA",
    cities: ["Istanbul", "Bursa", "Izmir"],
    categories: ["Accessories", "Home", "Apparel"],
    stems: ["Istanbul", "Bursa", "Anatolia"],
    certs: ["OEKO-TEX", "Leather Working Group", "ISO 14001"],
    count: 6,
  },
  {
    country: "Morocco",
    region: "MENA",
    cities: ["Casablanca", "Tangier", "Marrakesh"],
    categories: ["Beauty", "Home", "Apparel"],
    stems: ["Casablanca", "Atlas", "Tangier"],
    certs: ["Ecocert", "ISO 22716", "BSCI"],
    count: 6,
  },
]

const categoryProducts = {
  Apparel: ["organic cotton t-shirts", "hoodies", "denim garments", "activewear", "woven shirts"],
  Accessories: ["canvas tote bags", "backpacks", "leather wallets", "jute tote bags", "phone cases"],
  Packaging: ["paper bags", "jute pouches", "cosmetic boxes", "shipping cartons", "retail labels"],
  Textiles: ["cotton fabric", "jute fabric rolls", "home textile fabric", "linen blends"],
  Food: ["tea packs", "spice blends", "snack pouches", "honey jars"],
  Beauty: ["skincare serum", "argan oil", "soap bars", "cosmetic filling"],
  Home: ["towels", "bedding", "rugs", "ceramic tableware"],
  Footwear: ["canvas sneakers", "sports shoes", "leather sandals"],
  Electronics: ["chargers", "phone accessories", "bluetooth modules", "sensor boards"],
}

const generatedSuppliers = []
for (const plan of countryPlans) {
  for (let index = 0; index < plan.count; index += 1) {
    const category = pick(plan.categories, index)
    const city = pick(plan.cities, index)
    const products = [
      pick(categoryProducts[category], index),
      pick(categoryProducts[category], index + 1),
      pick(categoryProducts[category], index + 2),
    ]
    const isBangladesh = plan.country === "Bangladesh"
    const seed = `${plan.country}-${category}-${index}`
    const stem = pick(plan.stems, index)
    const moq = isBangladesh ? 250 + (index % 7) * 100 : 500 + (index % 8) * 250
    const leadTime = isBangladesh ? 16 + (index % 7) * 3 : 22 + (index % 8) * 4
    const riskScore = isBangladesh ? 18 + (index % 8) * 4 : 22 + (index % 9) * 5
    const priceBase = {
      Apparel: 3.4,
      Accessories: 1.2,
      Packaging: 0.22,
      Textiles: 0.85,
      Food: 1.1,
      Beauty: 1.6,
      Home: 2.8,
      Footwear: 6.5,
      Electronics: 1.4,
    }[category]

    generatedSuppliers.push(
      makeSupplier(seed, {
        name: `${stem} ${category} Works ${String(index + 1).padStart(2, "0")}`,
        country: plan.country,
        city,
        region: plan.region,
        category,
        products,
        description: `${city}, ${plan.country} supplier for ${products.join(", ")} with export documentation, sample coordination, and buyer-ready quote data. ${
          isBangladesh
            ? "Bangladesh Mode signals include regional sourcing familiarity, local freight paths, BGMEA/BKMEA context where relevant, and smaller pilot order support."
            : "The profile supports cross-border comparison, risk review, and landed-cost planning."
        }`,
        moq,
        lead_time_days: leadTime,
        monthly_capacity: 20000 + index * 3500,
        unit_price_usd: Number((priceBase + index * 0.23).toFixed(2)),
        rating: Number((4.05 + (index % 7) * 0.1).toFixed(2)),
        risk_level: riskScore < 28 ? "low" : riskScore < 48 ? "medium" : "high",
        risk_score: riskScore,
        bgmea_certified: isBangladesh && ["Apparel", "Accessories", "Textiles"].includes(category),
        certifications: Array.from(new Set([pick(plan.certs, index), pick(plan.certs, index + 2), category === "Food" ? "HACCP" : "ISO 9001"])),
        contact_name: `${pick(["Amina", "Rafiq", "Nadia", "Imran", "Sara", "Tariq"], index)} ${pick(["Rahman", "Karim", "Islam", "Hossain", "Ahmed"], index)}`,
        notes: `${category} benchmark supplier for BuildFest sourcing, RAG retrieval, comparison, and simulation flows.`,
        risk_notes: `${riskScore}/100 synthetic risk score based on lead time, MOQ, compliance coverage, and regional logistics profile.`,
        metadata: {
          sample_days: isBangladesh ? 5 + (index % 5) : 7 + (index % 6),
          incoterms: isBangladesh ? ["FOB", "CFR"] : ["FOB", "EXW"],
          port: isBangladesh ? pick(["Chittagong", "Mongla"], index) : "Regional export hub",
        },
      }),
    )
  }
}

const suppliers = [...prioritySuppliers, ...generatedSuppliers]

loadDotEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRole) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const { error } = await supabase.from("suppliers").upsert(suppliers, { onConflict: "id" })
if (error) throw new Error(error.message)

const { error: cacheError } = await supabase.from("ai_cache").delete().neq("cache_key", "")
if (cacheError) console.log(`Cache clear skipped: ${cacheError.message}`)

const { count, error: countError } = await supabase
  .from("suppliers")
  .select("id", { count: "exact", head: true })
if (countError) throw new Error(countError.message)

console.log(`Upserted ${suppliers.length} rich supplier profiles.`)
console.log(`Live supplier count is now ${count ?? "unknown"}.`)
