// Top navigation for the Sourcery app shell — visible on every /app/* page.
// Hosts the brand mark, route links, the Bangladesh Mode toggle, and an auth-aware action.
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { BangladeshToggle } from "@/components/sourcery/bangladesh-toggle"
import { usePreferences } from "@/lib/preferences-context"
import { signOutAction } from "@/lib/sourcery/actions"
import { cn } from "@/lib/utils"

// Static link list — Source (chat), Compare (scorecard + profit), Recent (history).
const LINKS = [
  { href: "/app", label: "Source" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/dashboard", label: "Recent" },
]

// Tiny user shape — kept narrow on purpose so we don't ship full auth payloads to the client.
type UserInfo = { id: string; email: string | null } | null

export function AppNav({ user }: { user: UserInfo }) {
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

        {/* Right cluster — BD toggle + auth state. */}
        <div className="flex items-center gap-2 md:gap-4">
          <BangladeshToggle />
          {user ? (
            // Signed in — show a server-action sign-out form (no JS state required).
            <form action={signOutAction}>
              <button
                type="submit"
                className="hidden items-center gap-1.5 rounded-full border border-border/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          ) : (
            // Signed out — link to the auth flow.
            <Link
              href="/auth/login"
              className="hidden rounded-full border border-border/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
