import type { ReactNode } from "react"
import { PreferencesProvider } from "@/lib/preferences-context"
import { AppNav } from "@/components/sourcery/app-nav"

export default function AppM3Layout({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <div className="m3-theme min-h-screen overflow-x-hidden bg-[#FFFBFE] text-[#1C1B1F]">
        <AppNav user={null} />
        <main className="w-full px-4 pb-6 pt-6 md:px-6 xl:px-8">{children}</main>
      </div>
    </PreferencesProvider>
  )
}

