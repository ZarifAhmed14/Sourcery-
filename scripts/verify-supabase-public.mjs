import { existsSync, readFileSync } from "node:fs"
import https from "node:https"
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

function decodeJwtPayload(token) {
  const [, payload] = token.split(".")
  if (!payload) return null
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
}

function statusLine(ok, label, details) {
  const marker = ok ? "PASS" : "FAIL"
  console.log(`${marker} ${label}${details ? `: ${details}` : ""}`)
}

function requestStatus(url, anonKey) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
      (res) => {
        res.resume()
        res.on("end", () => resolve(res.statusCode ?? 0))
      },
    )

    req.setTimeout(15000, () => {
      req.destroy(new Error("request timed out"))
    })
    req.on("error", reject)
    req.end()
  })
}

loadDotEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

let failed = false

if (!supabaseUrl || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.")
  process.exit(1)
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
try {
  const payload = decodeJwtPayload(anonKey)
  const jwtLooksRight =
    payload?.iss === "supabase" &&
    payload?.ref === projectRef &&
    payload?.role === "anon"

  statusLine(
    jwtLooksRight,
    "anon JWT payload",
    `iss=${payload?.iss ?? "missing"}, ref=${payload?.ref ?? "missing"}, role=${payload?.role ?? "missing"}`,
  )
  if (!jwtLooksRight) failed = true
} catch (error) {
  failed = true
  statusLine(false, "anon JWT payload", error.message)
}

try {
  const status = await requestStatus(`${supabaseUrl}/auth/v1/health`, anonKey)
  statusLine(status < 500, "Supabase project reachable", `HTTP ${status}`)
} catch (error) {
  failed = true
  statusLine(false, "Supabase project reachable", error.message)
}

process.exit(failed ? 1 : 0)
