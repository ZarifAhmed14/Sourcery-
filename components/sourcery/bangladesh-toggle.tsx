"use client"

// Bangladesh Mode toggle — persistent across the whole app via PreferencesProvider.
// Visible in the top nav. Adds a subtle orange flag accent when ON.

import { Switch } from "@/components/ui/switch"
import { usePreferences } from "@/lib/preferences-context"
import { cn } from "@/lib/utils"

export function BangladeshToggle() {
  const { bangladeshMode, setBangladeshMode } = usePreferences()
  return (
    // Wrapper aligns the label and switch on a single line.
    <label className="flex cursor-pointer items-center gap-2 select-none">
      {/* Tiny flag pill — green & red rectangle approximating the BD flag. */}
      <span className={cn("flex h-4 w-6 overflow-hidden rounded-sm ring-1 ring-border", bangladeshMode ? "opacity-100" : "opacity-50")}>
        <span className="h-full w-full bg-[#006a4e]" />
        <span className="absolute hidden" />
      </span>
      {/* Label text. */}
      <span className="hidden text-xs uppercase tracking-[0.16em] text-muted-foreground sm:inline">BD Mode</span>
      {/* The actual control. */}
      <Switch
        checked={bangladeshMode}
        onCheckedChange={(v) => setBangladeshMode(Boolean(v))}
        aria-label="Toggle Bangladesh Mode"
      />
    </label>
  )
}
