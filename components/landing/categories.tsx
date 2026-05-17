// Consumer-product categories section.
// Five tiles, each representing a category Sourcery indexes suppliers for.

// Server Component.
export function Categories() {
  // Five category records — name, supplier count, top sourcing region.
  const cats = [
    { name: "Apparel", count: 78, hub: "Dhaka · Tiruppur · Porto" },
    { name: "Beauty", count: 42, hub: "Seoul · Mumbai · Marrakech" },
    { name: "Home", count: 38, hub: "Istanbul · Jaipur · Hangzhou" },
    { name: "Food", count: 24, hub: "Bali · Antalya · Hanoi" },
    { name: "Accessories", count: 18, hub: "Sialkot · Florence · Shenzhen" },
  ]

  // Wrapper section anchored from nav.
  return (
    <section id="categories" className="border-t border-border/70 bg-secondary/30">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Eyebrow + headline grid. */}
        <div className="mb-16 grid gap-6 md:grid-cols-12">
          {/* Eyebrow column. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Categories</p>
          </div>
          {/* Headline column. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Built for the things <em className="italic">people actually buy.</em>
            </h2>
          </div>
        </div>

        {/* 5-tile grid — flex-wrap on small, evenly distributed on lg. */}
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 md:grid-cols-5">
          {/* Map each category to a tile. */}
          {cats.map((c) => (
            <li key={c.name} className="bg-background p-6 md:p-8">
              {/* Category name in display serif. */}
              <p className="font-serif text-3xl tracking-tight text-foreground md:text-4xl">
                {c.name}
              </p>
              {/* Supplier count for the category. */}
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{c.count}</span> verified suppliers
              </p>
              {/* Sourcing hubs for the category. */}
              <p className="mt-1 text-xs text-muted-foreground">{c.hub}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
