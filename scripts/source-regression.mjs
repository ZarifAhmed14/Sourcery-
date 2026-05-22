import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const baseUrl = process.env.REGRESSION_BASE_URL ?? "http://127.0.0.1:3000"
const queriesPath = path.join(process.cwd(), "scripts", "source-regression-queries.json")

async function request(payload) {
  const res = await fetch(`${baseUrl}/api/source`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`${payload.query} failed with ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

async function main() {
  const raw = await readFile(queriesPath, "utf8")
  const queries = JSON.parse(raw.replace(/^\uFEFF/, ""))
  const results = []

  for (const item of queries) {
    const started = Date.now()
    const result = await request(item)
    results.push({
      name: item.name,
      supplierCount: result.suppliers?.length ?? 0,
      topSupplier: result.suppliers?.[0]?.name ?? null,
      resultMode: result.meta?.result_mode ?? null,
      resultQuality: result.meta?.result_quality ?? null,
      llmMode: result.meta?.llm_mode ?? null,
      aiProvider: result.meta?.ai_provider ?? null,
      elapsedMs: Date.now() - started,
    })
  }

  const reportPath = path.join(process.cwd(), "outputs", "supplier-dataset", "source_regression_report.json")
  await writeFile(reportPath, JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2))
  console.log(JSON.stringify({ ok: true, baseUrl, results, reportPath }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
