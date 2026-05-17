import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, "generated", "seed_suppliers.sql")

function uuidFromSeed(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function pick(list, index) {
  return list[index % list.length]
}

function sql(value) {
  if (value === null || value === undefined) return "null"
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlArray(values) {
  return `array[${values.map(sql).join(", ")}]::text[]`
}

const countryPlan = [
  { country: "Bangladesh", count: 30, region: "South Asia", cities: ["Dhaka", "Chittagong", "Narayanganj", "Gazipur"], categories: ["apparel", "apparel", "apparel", "accessories"], certs: ["BGMEA", "BKMEA", "BSCI", "OEKO-TEX", "GOTS"] },
  { country: "India", count: 25, region: "South Asia", cities: ["Tiruppur", "Mumbai", "Delhi", "Bengaluru", "Jaipur"], categories: ["apparel", "beauty", "home", "accessories"], certs: ["GOTS", "BSCI", "ISO 9001", "ISO 22716"] },
  { country: "Pakistan", count: 15, region: "South Asia", cities: ["Karachi", "Lahore", "Faisalabad", "Sialkot"], categories: ["apparel", "home", "accessories"], certs: ["BSCI", "OEKO-TEX", "Leather Working Group"] },
  { country: "Vietnam", count: 20, region: "Southeast Asia", cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"], categories: ["apparel", "accessories", "electronics"], certs: ["BSCI", "ISO 9001", "WRAP"] },
  { country: "China", count: 45, region: "East Asia", cities: ["Shenzhen", "Guangzhou", "Ningbo", "Hangzhou", "Dongguan"], categories: ["accessories", "home", "beauty", "apparel"], certs: ["ISO 9001", "BSCI", "CE", "RoHS"] },
  { country: "Turkey", count: 20, region: "Europe", cities: ["Istanbul", "Izmir", "Bursa"], categories: ["apparel", "home", "beauty"], certs: ["OEKO-TEX", "GOTS", "ISO 9001"] },
  { country: "Portugal", count: 15, region: "Europe", cities: ["Porto", "Lisbon", "Braga"], categories: ["apparel", "home", "accessories"], certs: ["GOTS", "OEKO-TEX", "BSCI"] },
  { country: "Indonesia", count: 15, region: "Southeast Asia", cities: ["Jakarta", "Bandung", "Surabaya"], categories: ["apparel", "home", "food"], certs: ["BSCI", "Rainforest Alliance", "ISO 9001"] },
  { country: "Morocco", count: 15, region: "MENA", cities: ["Casablanca", "Tangier", "Marrakesh"], categories: ["apparel", "home", "beauty"], certs: ["ISO 9001", "BSCI", "Ecocert"] },
]

const subcategories = {
  apparel: ["organic cotton hoodies", "denim garments", "activewear", "woven shirts", "knitwear", "modest fashion"],
  beauty: ["vegan skincare", "haircare", "fragrance filling", "soap and body care", "cosmetic packaging"],
  home: ["handmade rugs", "bedding", "towels", "ceramic tableware", "home decor"],
  food: ["specialty coffee", "tea", "spices", "snacks", "honey"],
  accessories: ["leather bags", "backpacks", "wallets", "eyewear cases", "phone accessories", "jewelry"],
  electronics: ["phone accessories", "chargers", "earbud cases"],
}

const categoryPrice = {
  apparel: [4.2, 16.5],
  beauty: [1.1, 8.2],
  home: [3.5, 42],
  food: [2.4, 18],
  accessories: [1.8, 24],
  electronics: [1.2, 14],
}

function numeric(seed, min, max, decimals = 0) {
  const n = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16) / 0xffffffff
  const value = min + n * (max - min)
  return Number(value.toFixed(decimals))
}

function supplierName(country, category, index) {
  const stems = {
    Bangladesh: ["Padma", "Jamuna", "Meghna", "Dhaka", "Bengal"],
    India: ["Indus", "Jaipur", "Tiruppur", "Mumbai", "Deccan"],
    Pakistan: ["Karachi", "Lahore", "Indus", "Punjab", "Sialkot"],
    Vietnam: ["Saigon", "Mekong", "Hanoi", "Lotus", "Viet"],
    China: ["Shenzhen", "Pearl", "Ningbo", "Dragon", "Guangzhou"],
    Turkey: ["Anatolia", "Bursa", "Istanbul", "Izmir", "Aegean"],
    Portugal: ["Porto", "Lisbon", "Braga", "Atlantic", "Lusitania"],
    Indonesia: ["Java", "Bali", "Jakarta", "Bandung", "Nusantara"],
    Morocco: ["Atlas", "Casablanca", "Tangier", "Marrakesh", "Sahara"],
  }
  const suffix = category === "apparel" ? "Manufacturing" : category === "beauty" ? "Labs" : category === "home" ? "Craftworks" : category === "food" ? "Foods" : "Supply"
  return `${pick(stems[country], index)} ${suffix} ${String(index + 1).padStart(2, "0")}`
}

const suppliers = []
for (const plan of countryPlan) {
  for (let i = 0; i < plan.count; i += 1) {
    const category = pick(plan.categories, i)
    const normalizedCategory = category === "electronics" ? "accessories" : category
    const subcategory = pick(subcategories[category] ?? subcategories.accessories, i)
    const [minPrice, maxPrice] = categoryPrice[normalizedCategory]
    const seed = `${plan.country}-${i}-${subcategory}`
    const bd = plan.country === "Bangladesh"
    const price = numeric(`${seed}-price`, minPrice, maxPrice, 2)
    const moq = bd ? Math.round(numeric(`${seed}-moq`, 100, 500) / 25) * 25 : Math.round(numeric(`${seed}-moq`, 250, 2500) / 50) * 50
    const lead = Math.round(numeric(`${seed}-lead`, bd ? 18 : 24, bd ? 42 : 60))
    const onTime = Math.round(numeric(`${seed}-on-time`, 84, 98))
    const quality = numeric(`${seed}-quality`, 3.6, 4.9, 1)
    const risk = Math.round(numeric(`${seed}-risk`, bd ? 20 : 14, bd ? 42 : 55))
    const certifications = Array.from(new Set([pick(plan.certs, i), pick(plan.certs, i + 2), normalizedCategory === "food" ? "HACCP" : "BSCI"].filter(Boolean)))
    const description = `${supplierName(plan.country, normalizedCategory, i)} is a ${plan.city ? "regional" : "verified"} ${subcategory} supplier in ${pick(plan.cities, i)}, ${plan.country}. Capabilities include ${normalizedCategory} production, export documentation, sample coordination, compliance support, and SME-friendly sourcing workflows. ${bd ? "Bangladesh RMG context, BGMEA/BKMEA familiarity, smaller MOQ programs, and Dhaka/Chittagong logistics are available." : "The supplier supports cross-border buyers with structured quotations and quality-control checkpoints."}`

    suppliers.push({
      id: uuidFromSeed(seed),
      name: supplierName(plan.country, normalizedCategory, i),
      country: plan.country,
      city: pick(plan.cities, i),
      region: plan.region,
      category: normalizedCategory,
      subcategory,
      description,
      unit_price_usd: price,
      moq,
      lead_time_days: lead,
      on_time_rate: onTime,
      quality_rating: quality,
      risk_score: risk,
      certifications,
      bgmea_certified: bd && certifications.some((cert) => cert === "BGMEA" || cert === "BKMEA"),
      source_type: "synthetic",
      source_url: "https://cloudcampbd.com/the-infinity-ai-buildfest",
      verified_at: "2026-05-05T00:00:00Z",
    })
  }
}

const rows = suppliers.map((s) => `(${[
  sql(s.id),
  sql(s.name),
  sql(s.country),
  sql(s.city),
  sql(s.region),
  sql(s.category),
  sql(s.subcategory),
  sql(s.description),
  sql(s.unit_price_usd),
  sql(s.moq),
  sql(s.lead_time_days),
  sql(s.on_time_rate),
  sql(s.quality_rating),
  sql(s.risk_score),
  sqlArray(s.certifications),
  sql(s.bgmea_certified),
  sql(s.source_type),
  sql(s.source_url),
  sql(s.verified_at),
].join(", ")})`)

const relationshipRows = []
for (let i = 0; i < suppliers.length - 1; i += 1) {
  const a = suppliers[i]
  const b = suppliers.slice(i + 1).find((candidate) => candidate.category === a.category && candidate.country !== a.country)
  if (!b) continue
  relationshipRows.push(`(${sql(a.id)}, ${sql(b.id)}, 'category_peer', ${numeric(`${a.id}-${b.id}`, 0.55, 0.95, 3)}, '{"reason":"same category cross-region benchmark"}'::jsonb)`)
}

const output = `-- Generated by scripts/seed-suppliers.mjs
-- Supplier count: ${suppliers.length}

truncate table public.supplier_relationships restart identity cascade;
truncate table public.suppliers restart identity cascade;

insert into public.suppliers (
  id, name, country, city, region, category, subcategory, description,
  unit_price_usd, moq, lead_time_days, on_time_rate, quality_rating,
  risk_score, certifications, bgmea_certified, source_type, source_url, verified_at
) values
${rows.join(",\n")};

insert into public.supplier_relationships (
  source_supplier_id, target_supplier_id, relationship_type, weight, evidence
) values
${relationshipRows.join(",\n")}
on conflict do nothing;
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, output)
console.log(`Wrote ${suppliers.length} suppliers to ${outPath}`)
