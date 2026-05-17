"use client"

// Client-side context that persists Bangladesh Mode (and future prefs) in localStorage.
// Wraps the protected app shell so every component can read/write the same toggle.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

// Public shape consumed by hooks/components.
type PreferencesContextValue = {
  // True when the buyer wants South Asian preference + Bangla bargain copy.
  bangladeshMode: boolean
  // Setter — persists to localStorage and triggers a re-render of consumers.
  setBangladeshMode: (v: boolean) => void
}

// Create the React context. Default values are only used before the provider mounts.
const PreferencesContext = createContext<PreferencesContextValue>({
  bangladeshMode: false,
  setBangladeshMode: () => {},
})

// localStorage key — namespaced so we don't collide with anything else on the origin.
const STORAGE_KEY = "sourcery.preferences.v1"

// Provider component — wrap the app shell with this once.
export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Local state mirrors localStorage; we hydrate it on the client after first mount.
  const [bangladeshMode, setBangladeshModeState] = useState<boolean>(false)

  // Hydrate from localStorage exactly once on mount (skipping during SSR).
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (!raw) return
      const parsed = JSON.parse(raw) as { bangladeshMode?: boolean }
      if (typeof parsed?.bangladeshMode === "boolean") setBangladeshModeState(parsed.bangladeshMode)
    } catch (err) {
      console.log("[v0] preferences hydrate error:", (err as Error).message)
    }
  }, [])

  // Wrapped setter that persists to localStorage on every change.
  const setBangladeshMode = (v: boolean) => {
    setBangladeshModeState(v)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bangladeshMode: v }))
      }
    } catch (err) {
      console.log("[v0] preferences persist error:", (err as Error).message)
    }
  }

  // Memoize the context value to avoid unnecessary re-renders of every consumer.
  const value = useMemo(() => ({ bangladeshMode, setBangladeshMode }), [bangladeshMode])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// Convenience hook — call inside any client component under the provider.
export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext)
}
