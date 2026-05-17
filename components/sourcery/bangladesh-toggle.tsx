"use client"

// Bangladesh Mode toggle — persistent across the whole app via PreferencesProvider.
// Visible in the top nav. Adds a subtle orange flag accent when ON.

import { Switch } from "@/components/ui/switch"
import { TermHelp } from "@/components/sourcery/term-help"
import { usePreferences } from "@/lib/preferences-context"
import { cn } from "@/lib/utils"

export function BangladeshToggle() {
  const { bangladeshMode, setBangladeshMode } = usePreferences()
  return (
    // Wrapper aligns the label and switch on a single line.
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm select-none transition",
        bangladeshMode ? "border-[#d9b44a]/60 bg-[#fff8df] text-[#16201d]" : "border-black/10 bg-white/70 text-[#5d6965]",
      )}
    >
      {/* Tiny flag pill — green & red rectangle approximating the BD flag. */}
      <span className={cn("flex h-4 w-6 overflow-hidden rounded-sm ring-1 ring-border", bangladeshMode ? "opacity-100" : "opacity-50")}>
        <span className="h-full w-full bg-[#006a4e]" />
        <span className="absolute hidden" />
      </span>
      {/* Label text. */}
      <span className="text-xs font-semibold uppercase tracking-[0.16em]">BD Mode</span>
      <TermHelp
        term="BD Mode"
        description="Only searches Bangladesh suppliers and shows prices in taka."
        className="text-[#7a5b0f] hover:text-[#16201d]"
      />
      {/* The actual control. */}
      <Switch
        checked={bangladeshMode}
        onCheckedChange={(v) => setBangladeshMode(Boolean(v))}
        aria-label="Toggle Bangladesh Mode"
      />
    </label>
  )
}
