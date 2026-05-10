"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Activity, Bot, CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type HealthResponse = {
  ok: boolean
  service: string
  runtime?: {
    supabase?: boolean
    serviceRole?: boolean
    aiGeneration?: boolean
    aiGenerationProvider?: string
    embeddings?: boolean
  }
}

export function StatusDrawer() {
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        if (active) setHealth(data)
      })
      .catch(() => {
        if (active) setHealth(null)
      })

    return () => {
      active = false
    }
  }, [])

  const checks = [
    { label: "Retrieval engine", ok: Boolean(health?.runtime?.supabase), icon: Database },
    { label: "AI generation", ok: Boolean(health?.runtime?.aiGeneration), icon: Bot },
    { label: "Safety rails", ok: Boolean(health?.runtime?.serviceRole), icon: ShieldCheck },
    { label: "Embeddings", ok: Boolean(health?.runtime?.embeddings), icon: Sparkles },
  ]

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-9 rounded-full border-black/10 bg-white/70 px-3 text-[#1f2f2a]">
          <Activity className="mr-1.5 h-4 w-4 text-[#2e7d65]" />
          Status
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md border-l border-black/10 bg-[#f7f4ec] p-0">
        <SheetHeader className="border-b border-black/10 bg-white/80 px-6 py-5">
          <SheetTitle className="font-serif text-3xl text-[#16201d]">Demo Status</SheetTitle>
          <SheetDescription className="text-sm leading-6 text-[#5d6965]">
            Compact proof that Sourcery&apos;s retrieval, generation, and decision surfaces are alive without making the main workspace feel like a debug console.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border border-black/10 bg-[#16201d] p-5 text-[#f7f4ec]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">BuildFest MVP</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">{health?.ok ? "Ready" : "Checking"}</div>
                <div className="text-sm text-[#bdc8c2]">
                  {health?.runtime?.aiGenerationProvider ? `Generation: ${health.runtime.aiGenerationProvider}` : "Waiting for status"}
                </div>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#dbe5df]">Live</div>
            </div>
          </div>

          <div className="grid gap-3">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center gap-3">
                  <check.icon className="h-4 w-4 text-[#2e7d65]" />
                  <span className="text-sm font-medium text-[#16201d]">{check.label}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f1] px-2.5 py-1 text-xs font-medium text-[#1b6a54]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {check.ok ? "Ready" : "Pending"}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <h3 className="text-lg font-semibold text-[#16201d]">Show the workspace, not the plumbing</h3>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              The workspace map is part of the product story. Keep it one click away from sourcing so judges can see the Discovery, Risk, Bargain, and Simulation stack clearly.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="rounded-full bg-[#16201d] text-[#f7f4ec] hover:bg-[#22312d]">
                <Link href="/app/workflow">Workspace Map</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-transparent">
                <Link href="/app/health">Open technical health</Link>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
