"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type PreferencesContextValue = {
  bangladeshMode: boolean
  preferencesReady: boolean
  setBangladeshMode: (v: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextValue>({
  bangladeshMode: false,
  preferencesReady: false,
  setBangladeshMode: () => {},
})

const STORAGE_KEY = "sourcery.preferences.v1"

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [bangladeshMode, setBangladeshModeState] = useState<boolean>(false)
  const [preferencesReady, setPreferencesReady] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (!raw) return
      const parsed = JSON.parse(raw) as { bangladeshMode?: boolean }
      if (typeof parsed?.bangladeshMode === "boolean") setBangladeshModeState(parsed.bangladeshMode)
    } catch {}
    finally {
      setPreferencesReady(true)
    }
  }, [])

  const setBangladeshMode = (v: boolean) => {
    setBangladeshModeState(v)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bangladeshMode: v }))
      }
    } catch {}
  }

  const value = useMemo(() => ({ bangladeshMode, preferencesReady, setBangladeshMode }), [bangladeshMode, preferencesReady])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext)
}
