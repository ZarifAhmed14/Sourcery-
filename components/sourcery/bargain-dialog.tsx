"use client"

// Bargain Copilot — generates a polite Bangla supplier outreach message.
// Only shown when Bangladesh Mode is on AND the supplier is in South Asia.
// One AI call (gpt-5-mini, ~80 token cap) per "Open" — cached in component state.

import { useState } from "react"
import { Loader2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { Supplier } from "@/lib/types"

type Props = {
  // The supplier the buyer wants to contact.
  supplier: Supplier
  // The buyer's product description (echoed into the prompt for relevance).
  productDescription: string
  // Order quantity context for the negotiation ask.
  orderQuantity: number
}

export function BargainDialog({ supplier, productDescription, orderQuantity }: Props) {
  // Open state of the dialog.
  const [open, setOpen] = useState(false)
  // Cached message text — generated lazily on first open and reused thereafter.
  const [message, setMessage] = useState<string>("")
  // Loading + error state for the fetch.
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lazy-load the message on first open.
  const onOpenChange = async (next: boolean) => {
    setOpen(next)
    if (!next || message || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/bargain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: { name: supplier.name, country: supplier.country, unit_price_usd: supplier.unit_price_usd, moq: supplier.moq, lead_time_days: supplier.lead_time_days },
          productDescription,
          orderQuantity,
        }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? `Bargain request failed (${res.status})`)
      }
      const data = (await res.json()) as { message: string }
      setMessage(data.message)
    } catch (err) {
      console.log("[v0] bargain error:", (err as Error).message)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Convenience copy-to-clipboard handler.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
    } catch (err) {
      console.log("[v0] clipboard error:", (err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full bg-transparent">
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          Bargain in Bangla
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Bargain Copilot — {supplier.name}</DialogTitle>
          <DialogDescription>A respectful, business-appropriate Bangla outreach message you can send directly. AI-drafted, edit before sending.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Drafting message…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>
        ) : (
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="font-sans" />
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={copy} disabled={!message} className="rounded-full bg-transparent">
            Copy
          </Button>
          <Button onClick={() => setOpen(false)} className="rounded-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
