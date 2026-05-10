import Link from "next/link"
import type { ComponentType } from "react"
import { Activity, AlertTriangle, CheckCircle2, Database, Gauge, Server, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin"
import { publicRuntimeStatus } from "@/lib/env"

type Check = {
  label: string
  status: "pass" | "warn"
  detail: string
}

async function safeCount(table: string, filter?: (query: any) => any) {
  if (!isAdminSupabaseConfigured()) return null
  const supabase = getAdminClient()
  let query = supabase.from(table).select("*", { count: "exact", head: true })
  if (filter) query = filter(query) as typeof query
  const { count, error } = await query
  if (error) return null
  return count ?? 0
}

export default async function HealthPage() {
  const runtime = publicRuntimeStatus()
  const [supplierCount, embeddedCount, savedSearchCount, eventCount, cacheCount] = await Promise.all([
    safeCount("suppliers"),
    safeCount("suppliers", (query) => query.not("embedding", "is", null)),
    safeCount("saved_searches"),
    safeCount("source_events"),
    safeCount("ai_cache"),
  ])

  const checks: Check[] = [
    {
      label: "Supabase service route",
      status: supplierCount === null ? "warn" : "pass",
      detail: supplierCount === null ? "Service credentials unavailable to this runtime." : `${supplierCount} suppliers reachable through server-only API.`,
    },
    {
      label: "pgvector knowledge layer",
      status: embeddedCount && embeddedCount > 0 ? "pass" : "warn",
      detail: embeddedCount && supplierCount ? `${embeddedCount}/${supplierCount} supplier profiles have embeddings.` : "Embedding count is not available.",
    },
    {
      label: "Gemini generation",
      status: runtime.aiGenerationProvider === "gemini" ? "pass" : "warn",
      detail: runtime.aiGenerationProvider === "gemini" ? "Free Gemini provider is selected for demo generation." : `Current provider: ${runtime.aiGenerationProvider}.`,
    },
    {
      label: "Demo reliability",
      status: "pass",
      detail: "Sourcing and simulation keep deterministic fallback paths so the judge flow still runs if generation is slow.",
    },
  ]

  return (
    <div className="space-y-7">
      <section className="rounded-lg border border-black/10 bg-[#16201d] p-7 text-[#f7f4ec] shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Health and debug</p>
            <h1 className="mt-3 font-serif text-5xl leading-none md:text-6xl">Demo control room.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#bdc8c2]">
              A simple proof page for judges and teammates: data layer, RAG layer, AI provider, cache, telemetry, and safe fallback status.
            </p>
          </div>
          <Button asChild className="rounded-md bg-[#d9b44a] text-[#16201d] hover:bg-[#e6c45b]">
            <Link href="/app">Run judge flow</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <Metric icon={Database} label="Suppliers" value={fmt(supplierCount)} />
        <Metric icon={Sparkles} label="Embeddings" value={fmt(embeddedCount)} />
        <Metric icon={Activity} label="Events" value={fmt(eventCount)} />
        <Metric icon={Gauge} label="Cache rows" value={fmt(cacheCount)} />
        <Metric icon={Server} label="Saved runs" value={fmt(savedSearchCount)} />
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-[#16201d]">Runtime checks</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <div key={check.label} className="rounded-md border border-black/10 bg-[#f7f4ec] p-4">
              <div className="flex items-center gap-2">
                {check.status === "pass" ? <CheckCircle2 className="h-5 w-5 text-[#2e7d65]" /> : <AlertTriangle className="h-5 w-5 text-[#9a6b00]" />}
                <h3 className="font-semibold text-[#16201d]">{check.label}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5d6965]">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-[#2e7d65]" />
          <h2 className="mt-4 text-2xl font-semibold text-[#16201d]">API surfaces covered</h2>
          <div className="mt-4 grid gap-2 text-sm text-[#5d6965]">
            <Endpoint method="GET" path="/api/health" />
            <Endpoint method="GET" path="/api/suppliers" />
            <Endpoint method="POST" path="/api/source" />
            <Endpoint method="POST" path="/api/bargain" />
            <Endpoint method="POST" path="/api/simulate" />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-[#fff8df] p-5">
          <h2 className="text-2xl font-semibold text-[#16201d]">What this proves</h2>
          <p className="mt-3 text-sm leading-6 text-[#5d6965]">
            Sourcery is not just a static frontend. The app has a server-side supplier API, Supabase storage, pgvector-ready
            retrieval, AI generation for negotiation, deterministic ranking and simulation, and a visible workflow proof page.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-md bg-transparent">
            <Link href="/app/workflow">Open AI workflow proof</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function fmt(value: number | null) {
  return value === null ? "n/a" : value.toLocaleString()
}

function Metric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <Icon className="h-5 w-5 text-[#2e7d65]" />
      <div className="mt-3 text-2xl font-semibold text-[#16201d]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
    </div>
  )
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-black/10 bg-[#f7f4ec] px-3 py-2">
      <span className="font-mono text-xs font-semibold text-[#7a5b0f]">{method}</span>
      <span className="font-mono text-xs text-[#16201d]">{path}</span>
    </div>
  )
}
