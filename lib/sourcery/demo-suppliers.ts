import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { normalizeSupplier, supplierSearchHaystack } from "@/lib/sourcery/supplier-normalizer"
import type { Supplier, SupplierCategory } from "@/lib/types"

type SupplierDatasetRow = Record<string, unknown>

let datasetCache: Supplier[] | null = null

function supplierDedupKey(supplier: Supplier): string {
  return [supplier.name, supplier.country, supplier.city, supplier.category, supplier.subcategory]
    .map((value) => value.trim().toLowerCase())
    .join("|")
}

function loadDatasetRows(): SupplierDatasetRow[] {
  const candidatePaths = [
    join(process.cwd(), "lib", "sourcery", "data", "sourcery_supplier_dataset_actual_names.json"),
    join(process.cwd(), "outputs", "supplier-dataset", "sourcery_supplier_dataset_actual_names.json"),
  ]

  const datasetPath = candidatePaths.find((path) => existsSync(path))
  if (!datasetPath) return []

  try {
    const raw = readFileSync(datasetPath, "utf-8")
    const parsed = JSON.parse(raw) as SupplierDatasetRow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getDatasetSuppliers(): Supplier[] {
  if (datasetCache) return datasetCache
  const rows = loadDatasetRows()
  const deduped = new Map<string, Supplier>()

  rows
    .map((row) => normalizeSupplier(row))
    .filter((supplier) => supplier.id && supplier.name)
    .forEach((supplier) => {
      const key = supplierDedupKey(supplier)
      const current = deduped.get(key)
      if (!current) {
        deduped.set(key, supplier)
        return
      }

      const currentScore = (current.rating ?? current.quality_rating ?? 0) + (current.on_time_rate ?? 0) / 100
      const nextScore = (supplier.rating ?? supplier.quality_rating ?? 0) + (supplier.on_time_rate ?? 0) / 100
      if (nextScore > currentScore) deduped.set(key, supplier)
    })

  datasetCache = Array.from(deduped.values())
  return datasetCache
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .slice(0, 12)
}

function scoreSupplier(supplier: Supplier, tokens: string[], bangladeshHint: boolean): number {
  const haystack = supplierSearchHaystack(supplier)
  const matches = tokens.filter((token) => haystack.includes(token)).length
  const matchScore = tokens.length ? (matches / tokens.length) * 45 : 10
  const qualityScore = supplier.quality_rating * 7
  const deliveryScore = supplier.on_time_rate * 0.12
  const riskPenalty = supplier.risk_score * 0.12
  const bdBonus = bangladeshHint && ["Bangladesh", "India", "Pakistan", "Vietnam"].includes(supplier.country) ? 14 : 0

  return Math.round((matchScore + qualityScore + deliveryScore + bdBonus - riskPenalty) * 100) / 100
}

export function getDemoSuppliers(query: string, topK: number, category: SupplierCategory | null): Supplier[] {
  const tokens = tokenize(query)
  const bangladeshHint = /\b(bangladesh|bd|dhaka|chattogram|local|nearby|jute)\b/i.test(query)
  const suppliers = getDatasetSuppliers()
  const categoryPool = category ? suppliers.filter((supplier) => supplier.category === category) : suppliers
  const pool = categoryPool.length > 0 ? categoryPool : suppliers

  return pool
    .map((supplier) => ({ supplier, score: scoreSupplier(supplier, tokens, bangladeshHint) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK))
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))
}

export function listDemoSuppliers(args: {
  q?: string
  category?: SupplierCategory
  country?: string
  region?: Supplier["region"]
  limit: number
  offset: number
}): { suppliers: Supplier[]; count: number } {
  const tokens = tokenize(args.q ?? "")
  const country = args.country?.toLowerCase()
  const suppliers = getDatasetSuppliers()

  const filtered = suppliers.filter((supplier) => {
    if (args.category && supplier.category !== args.category) return false
    if (args.region && supplier.region !== args.region) return false
    if (country && !supplier.country.toLowerCase().includes(country)) return false

    if (tokens.length > 0) {
      const haystack = supplierSearchHaystack(supplier)
      if (!tokens.some((token) => haystack.includes(token))) return false
    }

    return true
  })

  const ranked = filtered
    .map((supplier) => ({ supplier, score: scoreSupplier(supplier, tokens, false) }))
    .sort((a, b) => b.score - a.score)
    .map(({ supplier, score }) => ({ ...supplier, retrieval_score: score / 100 }))

  return {
    suppliers: ranked.slice(args.offset, args.offset + args.limit),
    count: ranked.length,
  }
}

export function findDemoSupplier(id: string): Supplier | null {
  return getDatasetSuppliers().find((supplier) => supplier.id === id) ?? null
}
