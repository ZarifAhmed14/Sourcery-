// Top navigation for the Sourcery app shell — visible on every /app/* page.
// Hosts the brand mark, route links, the Bangladesh Mode toggle, and an auth-aware action.
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BangladeshToggle } from "@/components/sourcery/bangladesh-toggle"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/app", label: "Sourcing" },
  { href: "/app/dashboard", label: "Saved Searches" },
]

// Tiny user shape — kept narrow on purpose so we don't ship full auth payloads to the client.
type UserInfo = { id: string; email: string | null } | null

export function AppNav({ user }: { user: UserInfo }) {
  void user
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/10 bg-[#f7f4ec]/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1680px] flex-wrap items-center justify-between gap-3 px-8 py-3 md:flex-nowrap md:px-10 xl:px-14">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#d9b44a] text-xs font-black text-[#16201d]">
            SQ
          </span>
          <span className="hidden min-[520px]:block">
            <span className="block text-sm font-semibold tracking-[0.22em] text-[#16201d]">SOURCERY</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto md:order-none md:w-auto md:gap-3">
          {LINKS.map((l) => (
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
