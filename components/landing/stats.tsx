// Big bold stats strip — communicates scale and impact.
// Black background with cream type for a strong editorial break.

// Server Component — purely presentational.
export function Stats() {
  // Four stat records — value plus caption.
  const stats = [
    { value: "$2.1B", label: "Sourced through verified factories indexed" },
    { value: "47 days", label: "Average sourcing time saved per SKU" },
    { value: "9", label: "Sourcing countries · 5 consumer categories" },
    { value: "94%", label: "Recommendations rated 'high confidence'" },
  ]

  // Section wrapper — full-bleed dark band.
  return (
    <section className="bg-foreground text-primary-foreground">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        {/* Top eyebrow row. */}
        <p className="mb-12 text-xs uppercase tracking-[0.22em] text-primary-foreground/60">
          Numbers
        </p>
        {/* Four-column stat grid. */}
        <ul className="grid gap-12 md:grid-cols-4">
          {/* Map each stat to a column. */}
          {stats.map((s) => (
            <li key={s.label} className="border-t border-primary-foreground/20 pt-6">
              {/* Big serif value. */}
              <p className="font-serif text-5xl leading-none tracking-tight md:text-6xl">
                {s.value}
              </p>
              {/* Caption beneath. */}
              <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">{s.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
