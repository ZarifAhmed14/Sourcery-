// Layout for the Sourcery app shell (everything under /app).
// Wraps children in the PreferencesProvider so Bangladesh Mode is available everywhere.

import type { ReactNode } from "react"
import { PreferencesProvider } from "@/lib/preferences-context"
import { AppNav } from "@/components/sourcery/app-nav"

// Client provider is rendered by AppNav's parent — but we keep this layout a Server
// Component and let PreferencesProvider mark itself "use client". Next.js handles the boundary.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      {/* Full-bleed cream background to match the editorial brand. */}
      <div className="min-h-screen bg-background text-foreground">
        {/* Top nav with brand mark, route links, and the Bangladesh Mode toggle. */}
        <AppNav />
        {/* Main content area sized to the standard editorial container. */}
        <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8 md:px-10">{children}</main>
      </div>
    </PreferencesProvider>
  )
}
