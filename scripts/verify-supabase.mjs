import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadDotEnvLocal() {
  const envPath = join(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
  console.error(
    [
      "Missing env values.",
      "Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
      "SUPABASE_SERVICE_ROLE_KEY must stay server-side only.",
    ].join("\n"),
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const requiredColumns = [
  "unit_price_usd",
  "risk_score",
  "bgmea_certified",
  "region",
  "embedding",
]

function statusLine(ok, label, details) {
  const marker = ok ? "PASS" : "FAIL"
  console.log(`${marker} ${label}${details ? `: ${details}` : ""}`)
}

async function getSupplierCount() {
  const { count, error } = await admin
    .from("suppliers")
    .select("id", { count: "exact", head: true })

  if (error) throw error
  return count ?? 0
}

async function checkColumns() {
  const { error } = await admin
    .from("suppliers")
    .select(requiredColumns.join(","))
    .limit(1)

  if (error) {
    throw error
  }
}

async function checkAnonBlocked() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?select=id&limit=1`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  })

  if (response.status === 401 || response.status === 403) {
    return { blocked: true, status: response.status }
  }

  const body = await response.text()
  return {
    blocked: false,
    status: response.status,
    body: body.slice(0, 300),
  }
}

async function callMatchSuppliers(queryEmbedding) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_suppliers`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      match_count: 1,
      filter_category: null,
      filter_country: null,
      filter_region: null,
      max_risk_score: null,
      require_bgmea: null,
    }),
  })

  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  return { response, body }
}

async function checkMatchSuppliers() {
  const zeroVector = Array.from({ length: 1536 }, () => 0)
  let result = await callMatchSuppliers(zeroVector)

  if (!result.response.ok) {
    const vectorLiteral = `[${zeroVector.join(",")}]`
    result = await callMatchSuppliers(vectorLiteral)
  }

  if (!result.response.ok) {
    const detail =
      typeof result.body === "string"
        ? result.body
        : result.body?.message ?? JSON.stringify(result.body)
    throw new Error(`RPC failed with ${result.response.status}: ${detail}`)
  }

  return Array.isArray(result.body) ? result.body.length : 0
}

async function getEmbeddingCounts() {
  const { count: totalCount, error: totalError } = await admin
    .from("suppliers")
    .select("id", { count: "exact", head: true })

  if (totalError) throw totalError

  const { count: embeddedCount, error: embeddedError } = await admin
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .not("embedding", "is", null)

  if (embeddedError) throw embeddedError

  return {
    total: totalCount ?? 0,
    embedded: embeddedCount ?? 0,
    missing: (totalCount ?? 0) - (embeddedCount ?? 0),
  }
}

async function checkSourceEventsTable() {
  const { error } = await admin
    .from("source_events")
    .select("id,ai_provider", { count: "exact", head: true })

  if (error) throw error
}

async function checkSavedSearchesCanonicalColumns() {
  const { error } = await admin
    .from("saved_searches")
    .select("id,user_id,query,bangladesh_mode,results,metadata,created_at", { count: "exact", head: true })

  if (error) throw error
}

async function checkAiCacheTable() {
  const { error } = await admin
    .from("ai_cache")
    .select("cache_key,response,created_at,expires_at", { count: "exact", head: true })

  if (error) throw error
}

let failed = false

try {
  const supplierCount = await getSupplierCount()
  statusLine(supplierCount > 0, "supplier count", String(supplierCount))
  if (supplierCount <= 0) failed = true
} catch (error) {
  failed = true
  statusLine(false, "supplier count", error.message)
}

try {
  await checkColumns()
  statusLine(true, "required columns exist", requiredColumns.join(", "))
} catch (error) {
  failed = true
  statusLine(false, "required columns exist", error.message)
}

try {
  const anon = await checkAnonBlocked()
  statusLine(
    anon.blocked,
    "RLS/direct anon supplier read blocked",
    anon.blocked ? `HTTP ${anon.status}` : `HTTP ${anon.status} ${anon.body ?? ""}`,
  )
  if (!anon.blocked) failed = true
} catch (error) {
  failed = true
  statusLine(false, "RLS/direct anon supplier read blocked", error.message)
}

try {
  const rowCount = await checkMatchSuppliers()
  statusLine(true, "match_suppliers exists", `RPC returned ${rowCount} row(s) with zero vector`)
} catch (error) {
  failed = true
  statusLine(false, "match_suppliers exists", error.message)
}

try {
  const counts = await getEmbeddingCounts()
  statusLine(
    counts.embedded > 0,
    "supplier embeddings populated",
    `${counts.embedded}/${counts.total} embedded, ${counts.missing} missing`,
  )
  if (counts.embedded <= 0) failed = true
} catch (error) {
  failed = true
  statusLine(false, "supplier embeddings populated", error.message)
}

try {
  await checkSourceEventsTable()
  statusLine(true, "source_events telemetry table exists", "id, ai_provider")
} catch (error) {
  failed = true
  statusLine(false, "source_events telemetry table exists", error.message)
}

try {
  await checkAiCacheTable()
  statusLine(true, "ai_cache table exists", "cache_key, response, expires_at")
} catch (error) {
  failed = true
  statusLine(false, "ai_cache table exists", error.message)
}

try {
  await checkSavedSearchesCanonicalColumns()
  statusLine(true, "saved_searches canonical columns exist", "bangladesh_mode, results, metadata")
} catch (error) {
  failed = true
  statusLine(false, "saved_searches canonical columns exist", error.message || "missing canonical columns")
}

process.exit(failed ? 1 : 0)
