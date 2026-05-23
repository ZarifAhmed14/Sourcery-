// Top navigation for the Sourcery app shell — visible on every /app/* page.
// Hosts the brand mark, route links, the Bangladesh Mode toggle, and an auth-aware action.
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BangladeshToggle } from "@/components/sourcery/bangladesh-toggle"
import { BrandLogo } from "@/components/sourcery/brand-logo"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/app", label: "Workspace" },
  { href: "/app/dashboard", label: "Saved Searches" },
]

// Tiny user shape — kept narrow on purpose so we don't ship full auth payloads to the client.
type UserInfo = { id: string; email: string | null } | null

export function AppNav({ user }: { user: UserInfo }) {
  void user
  const pathname = usePathname()
  const visibleLinks = pathname.startsWith("/app/workflow")
    ? LINKS.filter((link) => link.href !== "/app/dashboard")
    : LINKS

  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/10 bg-[#f7f4ec]/92 backdrop-blur-xl">
      <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:px-6 xl:px-8">
        <BrandLogo />

        <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto md:order-none md:w-auto md:gap-3">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                  ? "bg-[#16201d] text-[#f7f4ec]"
                  : "text-[#6a746f] hover:text-[#16201d]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <BangladeshToggle />
        </div>
      </div>
    </header>
  )
}
