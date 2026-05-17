"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Supplier, SupplierCategory } from "@/lib/types"
import { getProductImage } from "@/lib/product-images"

type SupplierListResponse = {
  suppliers: Supplier[]
  count: number
}

const CATEGORY_OPTIONS: Array<{ value: "all" | SupplierCategory; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "accessories", label: "Accessories" },
  { value: "apparel", label: "Apparel" },
  { value: "food", label: "Food & beverage" },
  { value: "home", label: "Home goods" },
  { value: "footwear", label: "Footwear" },
]

function categoryLabel(category: SupplierCategory) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

function riskLabel(score: number) {
  if (score <= 30) return "Low"
  if (score <= 60) return "Medium"
  return "High"
}

export function LandingSuppliersSection() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | SupplierCategory>("all")
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)

    void fetch("/api/suppliers?limit=1000")
      .then((res) => res.json())
      .then((data: SupplierListResponse) => {
        if (!active) return
        setSuppliers(data.suppliers ?? [])
        setCount(data.count ?? data.suppliers?.length ?? 0)
      })
      .catch(() => {
        if (!active) return
        setSuppliers([])
        setCount(0)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      if (category !== "all" && supplier.category !== category) return false
      if (!needle) return true
      return [supplier.name, supplier.category, supplier.subcategory, supplier.country, supplier.city, supplier.products?.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
  }, [category, query, suppliers])

  const visible = filtered.slice(0, 18)

  return (
    <section id="suppliers" className="border-b border-black/10 bg-[#fffaf0] py-24">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Suppliers</p>
          <h2 className="mt-4 font-serif text-5xl leading-none md:text-7xl">Search the full supplier base.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5e6a66]">
            Browse every supplier Sourcery can rank. Search by supplier name or category before you jump into the workspace.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#5e6a66]">
            <span className="font-semibold text-[#16201d]">{count.toLocaleString()} suppliers indexed</span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7a75]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search supplier or category"
                className="h-11 w-full rounded-full border border-black/10 bg-[#fbfaf6] pl-10 pr-4 text-sm outline-none md:w-72"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as "all" | SupplierCategory)}
              className="h-11 rounded-full border border-black/10 bg-[#fbfaf6] px-4 text-sm outline-none"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="grid grid-cols-[1.7fr_0.8fr_0.85fr_0.55fr_0.5fr] gap-3 bg-[#eef1ea] px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">
            <span>Supplier</span>
            <span>Category</span>
            <span>Location</span>
            <span>Unit</span>
            <span>Lead</span>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-sm text-[#6d7a75]">Loading supplier base…</div>
          ) : visible.length > 0 ? (
            visible.map((supplier) => (
              <div
                key={supplier.id}
                className="grid grid-cols-[1.7fr_0.8fr_0.85fr_0.55fr_0.5fr] items-center gap-3 border-t border-black/10 px-5 py-4 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <SupplierThumb supplier={supplier} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#16201d]">{supplier.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#6d7a75]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {supplier.city}, {supplier.country}
                    </div>
                  </div>
                </div>
                <span className="text-[#53605c]">{categoryLabel(supplier.category)}</span>
                <span className="truncate text-[#53605c]">{supplier.region}</span>
                <span className="font-medium text-[#16201d]">${supplier.unit_price_usd.toFixed(2)}</span>
                <span className="text-[#53605c]">{supplier.lead_time_days}d</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-sm text-[#6d7a75]">No suppliers match that search yet.</div>
          )}
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 text-sm text-[#5e6a66]">
          <span>Showing {visible.length} of {filtered.length.toLocaleString()} matched suppliers.</span>
          <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
            <Link href="/app">
              See more
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function SupplierThumb({ supplier }: { supplier: Supplier }) {
  const image = getProductImage({ supplier })
  return (
    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#f1ede3]">
      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
    </div>
  )
}
