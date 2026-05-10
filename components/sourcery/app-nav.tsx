// Top navigation for the Sourcery app shell — visible on every /app/* page.
// Hosts the brand mark, route links, the Bangladesh Mode toggle, and an auth-aware action.
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Sparkles } from "lucide-react"
import { BangladeshToggle } from "@/components/sourcery/bangladesh-toggle"
import { StatusDrawer } from "@/components/sourcery/status-drawer"
import { usePreferences } from "@/lib/preferences-context"
import { signOutAction } from "@/lib/sourcery/actions"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/app", label: "Sourcing" },
  { href: "/app/directory", label: "Supplier Directory" },
  { href: "/app/dashboard", label: "Saved Searches" },
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
        "sticky top-0 z-30 w-full border-b border-black/10 bg-[#f7f4ec]/86 backdrop-blur-xl",
        bangladeshMode && "border-l-4 border-l-[#2e7d65]",
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:px-8">
        {/* Brand mark — links back to landing page. */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#16201d] text-xs font-black text-[#f7f4ec]">
            SQ
          </span>
          <span className="hidden min-[520px]:block">
            <span className="block text-sm font-semibold tracking-[0.22em] text-[#16201d]">SOURCERY</span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[#6d7a75] sm:block">Supplier intelligence</span>
          </span>
        </Link>

        {/* Primary route links. */}
        <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto md:order-none md:w-auto md:gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                  ? "bg-[#16201d] text-[#f7f4ec]"
                  : "text-[#6d7a75] hover:text-[#16201d]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster — BD toggle + auth state. */}
        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="hidden sm:block">
            <BangladeshToggle />
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-black/10 bg-[#fff8df] px-3 py-1 text-xs font-medium text-[#7a5b0f] lg:inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            BuildFest MVP
          </span>
          <ButtonLink href="/app/workflow" label="Workspace Map" />
          <StatusDrawer />
          {user ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="hidden items-center gap-1.5 rounded-md border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#6d7a75] transition-colors hover:text-[#16201d] sm:inline-flex"
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
              className="hidden rounded-md border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#6d7a75] transition-colors hover:text-[#16201d] sm:inline-block"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="hidden rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-[#1f2f2a] transition-colors hover:bg-white sm:inline-block"
    >
      {label}
    </Link>
  )
}
