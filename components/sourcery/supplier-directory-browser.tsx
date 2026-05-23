"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BadgeCheck, MapPin, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Supplier, SupplierCategory } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"
import { usePreferences } from "@/lib/preferences-context"

type SupplierListResponse = {
  suppliers: Supplier[]
}

const CATEGORY_OPTIONS: Array<{ value: SupplierCategory | "all"; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "accessories", label: "Accessories" },
  { value: "apparel", label: "Apparel" },
  { value: "food", label: "Food" },
  { value: "home", label: "Home" },
  { value: "footwear", label: "Footwear" },
]

export function SupplierDirectoryBrowser() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<SupplierCategory | "all">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const { bangladeshMode } = usePreferences()

  const loadSuppliers = useCallback(() => {
    setStatus("loading")
    setError(null)
    void fetch("/api/suppliers?limit=1000")
      .then((res) => {
        if (!res.ok) throw new Error(`Supplier directory failed (${res.status})`)
        return res.json()
      })
      .then((data: SupplierListResponse) => {
        setSuppliers(data.suppliers ?? [])
        setSelectedId((current) => current ?? data.suppliers?.[0]?.id ?? null)
        setStatus("ready")
      })
      .catch((err) => {
        setSuppliers([])
        setError((err as Error).message || "Supplier directory could not load.")
        setStatus("error")
      })
  }, [])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return suppliers.filter((supplier) => {
      if (category !== "all" && supplier.category !== category) return false
      if (!lowered) return true
      return [supplier.name, supplier.country, supplier.city, supplier.description, supplier.products?.join(" "), supplier.certifications.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(lowered)
    })
  }, [category, query, suppliers])

  const selected =
    filtered.find((supplier) => supplier.id === selectedId) ?? suppliers.find((supplier) => supplier.id === selectedId) ?? null

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Supplier directory</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#16201d]">Browse the supplier base</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d7a75]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search supplier, city, product"
                className="h-11 rounded-full border border-black/10 bg-[#fbfaf6] pl-10 pr-4 text-sm outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupplierCategory | "all")}
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

        <div className="mt-5 overflow-hidden rounded-3xl border border-black/10">
          <div className="grid grid-cols-[1.2fr_0.65fr_0.65fr_0.7fr_0.8fr] gap-3 bg-[#eef1ea] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">
            <div>Supplier</div>
            <div>Category</div>
            <div>Location</div>
            <div>Best for</div>
            <div>Best delivery fit</div>
          </div>
          {filtered.map((supplier) => (
            <div
              key={supplier.id}
              className={cn(
                "grid grid-cols-[1.2fr_0.65fr_0.65fr_0.7fr_0.8fr] gap-3 border-t border-black/10 px-4 py-4 text-sm",
                selected?.id === supplier.id && "bg-[#f7fbf9]",
              )}
            >
              <button type="button" onClick={() => setSelectedId(supplier.id)} className="min-w-0 text-left">
                <div className="truncate font-medium text-[#16201d]">{supplier.name}</div>
                <div className="mt-1 truncate text-xs text-[#6d7a75]">{supplier.products?.slice(0, 2).join(" | ") || supplier.subcategory}</div>
              </button>
              <div className="capitalize text-[#53605c]">{supplier.category}</div>
              <div className="truncate text-[#53605c]">{supplier.country}</div>
              <div className="text-[#53605c]">{supplierBestFor(supplier)}</div>
              <div className="text-sm text-[#53605c]">{supplierDeliveryFit(supplier)}</div>
            </div>
          ))}
          {status === "loading" ? (
            <div className="border-t border-black/10 px-4 py-10 text-center text-sm text-[#6d7a75]">
              Loading suppliers...
            </div>
          ) : null}
          {status === "error" ? (
            <div className="border-t border-black/10 px-4 py-10 text-center text-sm text-[#6d7a75]">
              <p>{error ?? "Supplier directory could not load."}</p>
              <Button type="button" onClick={loadSuppliers} className="mt-3 rounded-full bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]">
                Retry
              </Button>
            </div>
          ) : null}
          {status === "ready" && filtered.length === 0 ? (
            <div className="border-t border-black/10 px-4 py-10 text-center text-sm text-[#6d7a75]">
              No suppliers match this search. Try a company name, city, product, or a broader category.
            </div>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7a75]">Supplier profile</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#16201d]">{selected.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-[#6d7a75]">
                  <MapPin className="h-4 w-4 text-[#2e7d65]" />
                  {selected.city}, {selected.country}
                </p>
              </div>
              <div className="rounded-full bg-[#eef1ea] px-3 py-1 text-xs font-semibold text-[#51605a]">
                Best for {supplierBestFor(selected)}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ProfileItem label="Category" value={selected.category} />
              <ProfileItem label="Products" value={selected.products?.join(", ") || selected.subcategory} />
              <ProfileItem label="Best for" value={supplierBestForDetail(selected)} />
              <ProfileItem label="Certifications" value={selected.certifications.join(", ") || "Not listed"} />
              <ProfileItem label="Operational metrics" value={`${selected.moq} MOQ | ${selected.lead_time_days}d lead | ${formatMoney(selected.unit_price_usd, bangladeshMode)}`} />
            </div>

            <p className="mt-5 text-sm leading-6 text-[#4e5a55]">{selected.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {selected.bgmea_certified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f1] px-3 py-1 text-xs font-medium text-[#165c49]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  BGMEA certified
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8df] px-3 py-1 text-xs font-medium text-[#7a5b0f]">
                <Sparkles className="h-3.5 w-3.5" />
                {supplierBestForDetail(selected)}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full bg-transparent">
                <Link href={`/app/compare?supplier=${selected.id}`}>Profit view</Link>
              </Button>
              <Button asChild className="rounded-full bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f]">
                <Link href={`/app/suppliers/${selected.id}`}>
                  Open detail
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 px-4 py-10 text-center text-sm text-[#6d7a75]">
            Pick a supplier to inspect the full profile.
          </div>
        )}
      </aside>
    </div>
  )
}

function supplierBestFor(supplier: Supplier): string {
  if (supplier.moq <= 400) return "small test orders"
  if (supplier.lead_time_days <= 22) return "fast restocks"
  if (supplier.unit_price_usd <= 2.5) return "margin-first buying"
  if ((supplier.rating ?? supplier.quality_rating ?? 0) >= 4.6) return "premium quality"
  if (supplier.bgmea_certified) return "compliance-sensitive sourcing"
  if (supplier.country === "Bangladesh") return "local Bangladesh sourcing"
  return "balanced sourcing"
}

function supplierBestForDetail(supplier: Supplier): string {
  if (supplier.moq <= 400) return "Best for small test orders with lower upfront inventory risk."
  if (supplier.lead_time_days <= 22) return "Best for fast restocks when speed matters more than deep customization."
  if (supplier.unit_price_usd <= 2.5) return "Best for margin-first buying where landed cost discipline is the priority."
  if ((supplier.rating ?? supplier.quality_rating ?? 0) >= 4.6) return "Best for premium quality programs where finish and consistency matter most."
  if (supplier.bgmea_certified) return "Best for compliance-sensitive sourcing with stronger buyer reassurance."
  if (supplier.country === "Bangladesh") return "Best for local Bangladesh sourcing when proximity and familiarity matter."
  return "Best for balanced sourcing when you need a practical middle ground across price, speed, and quality."
}

function supplierDeliveryFit(supplier: Supplier): string {
  if (supplier.country === "Bangladesh" || supplier.country === "India" || supplier.country === "Pakistan") {
    if (supplier.moq <= 400 || supplier.lead_time_days <= 18) return "Air-ready"
    if (supplier.moq >= 1500) return "Sea-first"
    return "Flexible mix"
  }

  if (supplier.region === "Europe") return "Road-friendly"
  if (supplier.lead_time_days <= 16) return "Air for urgent runs"
  if (supplier.moq >= 1200 || supplier.unit_price_usd <= 2.5) return "Sea for margin protection"
  if (supplier.region === "Southeast Asia" || supplier.region === "East Asia") return "Sea-first"
  return "Flexible mix"
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm leading-6 text-[#16201d]">{value}</div>
    </div>
  )
}
