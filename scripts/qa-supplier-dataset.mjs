import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const datasetPath = path.join(process.cwd(), "outputs", "supplier-dataset", "sourcery_supplier_dataset_actual_names.json")
const reportPath = path.join(process.cwd(), "outputs", "supplier-dataset", "sourcery_supplier_dataset_qa_report.json")

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase()
}

function dedupeKey(row) {
  return [row.name, row.country, row.city, row.category, row.subcategory].map(normalizeText).join("|")
}

function isMissing(value) {
  return value === null || value === undefined || String(value).trim() === ""
}

async function main() {
  const rows = JSON.parse(await readFile(datasetPath, "utf8"))
  const byKey = new Map()
  const duplicateGroups = []
  const missingFieldCounts = {
    name: 0,
    country: 0,
    city: 0,
    category: 0,
    subcategory: 0,
    unit_price_usd: 0,
    moq: 0,
    lead_time_days: 0,
    description: 0,
  }
  const extremeMoq = []
  const extremeLeadTimes = []
  const suspiciousNames = []

  for (const row of rows) {
    for (const field of Object.keys(missingFieldCounts)) {
      if (isMissing(row[field])) missingFieldCounts[field] += 1
    }

    const moq = Number(row.moq)
    const lead = Number(row.lead_time_days)
    if (Number.isFinite(moq) && moq >= 5000) {
      extremeMoq.push({ name: row.name, country: row.country, moq })
    }
    if (Number.isFinite(lead) && (lead <= 5 || lead >= 90)) {
      extremeLeadTimes.push({ name: row.name, country: row.country, lead_time_days: lead })
    }
    if (/\b(Co\.?\s+Co\.?|Ltd\.?\s+Ltd\.?|Group\s+Group|Industries\s+Industries)\b/i.test(String(row.name ?? ""))) {
      suspiciousNames.push({ name: row.name, country: row.country })
    }

    const key = dedupeKey(row)
    const group = byKey.get(key) ?? []
    group.push({ id: row.id, name: row.name, country: row.country, city: row.city, category: row.category, subcategory: row.subcategory })
    byKey.set(key, group)
  }

  for (const [key, group] of byKey.entries()) {
    if (group.length > 1) duplicateGroups.push({ key, count: group.length, rows: group.slice(0, 5) })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    datasetPath,
    totalRows: rows.length,
    uniqueIdentityRows: byKey.size,
    duplicateIdentityGroups: duplicateGroups.length,
    missingFieldCounts,
    examples: {
      duplicateGroups: duplicateGroups.slice(0, 20),
      extremeMoq: extremeMoq.slice(0, 20),
      extremeLeadTimes: extremeLeadTimes.slice(0, 20),
      suspiciousNames: suspiciousNames.slice(0, 20),
    },
  }

  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ok: true, reportPath, summary: report }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
