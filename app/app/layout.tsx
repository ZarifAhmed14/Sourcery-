// Layout for the Sourcery app shell (everything under /app).
// Server component — fetches the current Supabase user once and passes it to the nav,
// then wraps children in the client-side PreferencesProvider so Bangladesh Mode is available everywhere.

import type { ReactNode } from "react"
import { PreferencesProvider } from "@/lib/preferences-context"
import { AppNav } from "@/components/sourcery/app-nav"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Server-side Supabase client uses request cookies — no client roundtrip needed.
  if (!isSupabaseConfigured()) {
    return (
      <PreferencesProvider>
        <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#16201d]">
          <AppNav user={null} />
          <main className="mx-auto w-full max-w-[1680px] px-8 pb-24 pt-8 md:px-10 xl:px-14">{children}</main>
        </div>
      </PreferencesProvider>
    )
  }

  const supabase = await createClient()
  // getUser returns the authenticated user (or null) — not just session, which is forgeable.
  const {
    data: { user },
  } = await supabase.auth.getUser().catch((error) => {
    console.log("[sourcery] app shell auth skipped:", error.message)
    return { data: { user: null } }
  })
  // Reduce to a small, serializable shape; avoids leaking the entire auth payload to the client.
  const userInfo = user ? { id: user.id, email: user.email ?? null } : null

  return (
    <PreferencesProvider>
      <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#16201d]">
        <AppNav user={userInfo} />
        <main className="mx-auto w-full max-w-[1680px] px-8 pb-24 pt-8 md:px-10 xl:px-14">{children}</main>
      </div>
    </PreferencesProvider>
  )
}
