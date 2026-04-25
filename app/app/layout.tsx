// Layout for the Sourcery app shell (everything under /app).
// Server component — fetches the current Supabase user once and passes it to the nav,
// then wraps children in the client-side PreferencesProvider so Bangladesh Mode is available everywhere.

import type { ReactNode } from "react"
import { PreferencesProvider } from "@/lib/preferences-context"
import { AppNav } from "@/components/sourcery/app-nav"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Server-side Supabase client uses request cookies — no client roundtrip needed.
  const supabase = await createClient()
  // getUser returns the authenticated user (or null) — not just session, which is forgeable.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Reduce to a small, serializable shape; avoids leaking the entire auth payload to the client.
  const userInfo = user ? { id: user.id, email: user.email ?? null } : null

  return (
    <PreferencesProvider>
      {/* Full-bleed cream background to match the editorial brand. */}
      <div className="min-h-screen bg-background text-foreground">
        {/* Top nav — knows whether the user is signed in to render the right action. */}
        <AppNav user={userInfo} />
        {/* Main content area sized to the standard editorial container. */}
        <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8 md:px-10">{children}</main>
      </div>
    </PreferencesProvider>
  )
}
