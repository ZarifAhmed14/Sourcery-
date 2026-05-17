import { createClient } from "@supabase/supabase-js"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

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

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadDotEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small"
const BATCH_LIMIT = Number.parseInt(process.env.EMBED_SUPPLIERS_LIMIT ?? "500", 10)
const FORCE_REEMBED = process.env.EMBED_SUPPLIERS_FORCE === "1"
const EMBEDDING_DIMENSIONS = 1536

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    [
      "Missing required environment variable.",
      "Need NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      "Never expose SUPABASE_SERVICE_ROLE_KEY in frontend/client code.",
    ].join("\n"),
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

function hashToken(token) {
  return createHash("sha256").update(token).digest()
}

function tokenizeEmbeddingText(text) {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 400)

  const features = [...tokens]
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`${tokens[index]}_${tokens[index + 1]}`)
  }
  return features
}

function localHashEmbedding(text) {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  const features = tokenizeEmbeddingText(text)

  for (const feature of features) {
    const hash = hashToken(feature)
    const dimension = hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS
    const sign = hash[4] % 2 === 0 ? 1 : -1
    vector[dimension] += sign
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => Number((value / norm).toFixed(8)))
}

async function createEmbedding(input) {
  if (!OPENAI_API_KEY) {
    return localHashEmbedding(input)
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.error?.message ?? `OpenAI embeddings failed with status ${response.status}`)
  }

  const embedding = body.data?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error("OpenAI embeddings response did not include an embedding array")
  }

  return embedding
}

function supplierEmbeddingText(supplier) {
  return [
    `Supplier: ${supplier.name}`,
    `Location: ${[supplier.city, supplier.country, supplier.region].filter(Boolean).join(", ")}`,
    `Category: ${supplier.category}`,
    `Products: ${(supplier.products ?? []).join(", ")}`,
    `Description: ${supplier.description ?? ""}`,
    `MOQ: ${supplier.moq ?? "unknown"}`,
    `Lead time days: ${supplier.lead_time_days ?? "unknown"}`,
    `Monthly capacity: ${supplier.monthly_capacity ?? "unknown"}`,
    `Unit price USD: ${supplier.unit_price_usd ?? "unknown"}`,
    `Rating: ${supplier.rating ?? "unknown"}`,
    `Risk level: ${supplier.risk_level}`,
    `Risk score: ${supplier.risk_score}`,
    `Risk notes: ${supplier.risk_notes ?? ""}`,
    `BGMEA certified: ${supplier.bgmea_certified ? "yes" : "no"}`,
    `Certifications: ${(supplier.certifications ?? []).join(", ")}`,
    `Payment terms: ${supplier.payment_terms ?? ""}`,
    `Notes: ${supplier.notes ?? ""}`,
  ]
    .filter((line) => line.trim().length > 0)
    .join("\n")
}

const query = supabase
  .from("suppliers")
  .select(
    [
      "id",
      "name",
      "country",
      "city",
      "region",
      "category",
      "products",
      "description",
      "moq",
      "lead_time_days",
      "monthly_capacity",
      "unit_price_usd",
      "rating",
      "risk_level",
      "risk_score",
      "risk_notes",
      "bgmea_certified",
      "certifications",
      "payment_terms",
      "notes",
    ].join(","),
  )
  .order("created_at", { ascending: true })
  .limit(BATCH_LIMIT)

if (!FORCE_REEMBED) {
  query.is("embedding", null)
}

const { data: suppliers, error } = await query

if (error) {
  throw new Error(error.message)
}

console.log(
  `Embedding ${suppliers.length} supplier(s) with ${
    OPENAI_API_KEY ? EMBEDDING_MODEL : "local-hash-embedding"
  }${FORCE_REEMBED ? " (force mode)" : ""}`,
)

for (const [index, supplier] of suppliers.entries()) {
  const input = supplierEmbeddingText(supplier)
  const embedding = await createEmbedding(input)

  const { error: updateError } = await supabase
    .from("suppliers")
    .update({ embedding })
    .eq("id", supplier.id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  console.log(`${index + 1}/${suppliers.length} embedded ${supplier.name}`)
}

console.log("Supplier embeddings complete")
