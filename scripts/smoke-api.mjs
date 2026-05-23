import { spawn } from "node:child_process"
import path from "node:path"

const port = Number(process.env.SMOKE_PORT ?? 3030)
const providedBaseUrl = process.env.SMOKE_BASE_URL
const baseUrl = providedBaseUrl ?? `http://127.0.0.1:${port}`

let server = null
let serverOutput = ""

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request(path, init) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const health = await request("/api/health")
      if (health.ok) return health
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`Health endpoint did not become ready at ${baseUrl}`)
}

async function buildForSmoke() {
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next")
  await new Promise((resolve, reject) => {
    const build = spawn(process.execPath, [nextBin, "build"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })

    let buildOutput = ""
    build.stdout.on("data", (chunk) => {
      buildOutput += chunk.toString()
    })
    build.stderr.on("data", (chunk) => {
      buildOutput += chunk.toString()
    })
    build.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }
      reject(new Error(`next build failed with code ${code ?? "unknown"}\n${buildOutput}`))
    })
  })
}

function startServer() {
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next")
  server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString()
  })
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString()
  })
  server.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(serverOutput)
    }
  })
}

async function main() {
  if (!providedBaseUrl) {
    await buildForSmoke()
    startServer()
  }

  const health = await waitForHealth()
  const supplierList = await request("/api/suppliers?limit=3&q=jute")
  if (!Array.isArray(supplierList.suppliers) || supplierList.suppliers.length === 0) {
    throw new Error("/api/suppliers returned no suppliers")
  }

  const supplier = supplierList.suppliers[0]
  await request(`/api/suppliers/${supplier.id}`)

  const source = await request("/api/source", {
    method: "POST",
    body: JSON.stringify({
      query: "Find Bangladesh jute bag suppliers for export",
      bangladeshMode: true,
      topK: 4,
    }),
  })
  if (!Array.isArray(source.suppliers) || source.suppliers.length === 0) {
    throw new Error("/api/source returned no suppliers")
  }
  if (source.meta.llm_mode === "deterministic_fallback" && source.meta.ai_provider !== "none") {
    console.error("Source used deterministic fallback while an AI provider was configured. Server log:")
    console.error(serverOutput)
  }

  const bargain = await request("/api/bargain", {
    method: "POST",
    body: JSON.stringify({
      supplier,
      productDescription: "jute tote bags",
      orderQuantity: 300,
    }),
  })

  await request("/api/simulate", {
    method: "POST",
    body: JSON.stringify({
      suppliers: [supplier],
      baseInputs: {
        selling_price: Math.max(2, supplier.unit_price_usd * 2.4),
        shipping_cost_per_unit: 0.65,
        customs_rate: 5,
        packaging_cost_per_unit: 0.25,
        order_quantity: 300,
      },
      deltas: {
        shipping_cost_delta_pct: 10,
        lead_time_delta_days: 3,
        order_quantity: 300,
        selling_price: Math.max(2, supplier.unit_price_usd * 2.4),
        supplier_price_delta_pct: -4,
      },
    }),
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        health: health.runtime,
        supplierCount: supplierList.suppliers.length,
        sourceMode: source.meta.llm_mode,
        sourceAiProvider: source.meta.ai_provider,
        retrievalMode: source.meta.retrieval_mode,
        bargainMode: bargain.meta.llm_mode,
        bargainAiProvider: bargain.meta.ai_provider,
        topSupplier: source.suppliers[0]?.name,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => {
    if (server && !server.killed) {
      server.kill()
    }
  })
