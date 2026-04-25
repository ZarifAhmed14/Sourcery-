"use client"

// Top navigation for the Sourcery app shell — visible on every /app/* page.
// Hosts the brand mark, route links, and the Bangladesh Mode toggle.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BangladeshToggle } from "@/components/sourcery/bangladesh-toggle"
import { usePreferences } from "@/lib/preferences-context"
import { cn } from "@/lib/utils"

// Static link list — Source (chat), Compare (scorecard + profit), Recent (history).
const LINKS = [
  { href: "/app", label: "Source" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/dashboard", label: "Recent" },
]

export function AppNav() {
  // Used to highlight the active link.
  const pathname = usePathname()
  // Used to render the orange BD-mode accent border on the nav.
  const { bangladeshMode } = usePreferences()

  return (
    // The orange left border is the visual signal that BD mode is on globally.
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur",
        bangladeshMode && "border-l-4 border-l-[#f97316]",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
        {/* Brand mark — links back to landing page. */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl italic tracking-tight">Sourcery</span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground sm:inline">Sourcing OS</span>
        </Link>

        {/* Primary route links. */}
        <nav className="flex items-center gap-1 sm:gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                pathname === l.href ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Bangladesh Mode toggle on the right edge. */}
        <BangladeshToggle />
      </div>
    </header>
  )
}
