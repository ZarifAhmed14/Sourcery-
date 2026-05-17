// Footer for the public landing page.
// Editorial layout — wordmark and small-caps link columns, plus a fine-print row.

// Next.js Link for navigation.
import Link from "next/link"

// Server Component.
export function SiteFooter() {
  // Column definitions to keep markup simple.
  const columns = [
    {
      title: "Product",
      links: [
        { label: "How it works", href: "#how-it-works" },
        { label: "Comparison", href: "#demo" },
        { label: "Pricing", href: "#pricing" },
        { label: "App", href: "/app" },
      ],
    },
    {
      title: "Categories",
      links: [
        { label: "Apparel", href: "#categories" },
        { label: "Beauty", href: "#categories" },
        { label: "Home", href: "#categories" },
        { label: "Food", href: "#categories" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Press", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ]

  // Footer wrapper.
  return (
    <footer className="border-t border-border/70 bg-background">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        {/* Top grid — wordmark + columns. */}
        <div className="grid gap-12 md:grid-cols-12">
          {/* Wordmark + tagline column. */}
          <div className="md:col-span-5">
            {/* Brand wordmark in serif. */}
            <Link href="/" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-serif text-3xl tracking-tight text-foreground">Sourcery</span>
            </Link>
            {/* Footer tagline. */}
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The AI sourcing agent for consumer brands. Built for BuildFest 2026 — Track 4.
            </p>
          </div>

          {/* Three link columns evenly distributed across the remaining width. */}
          <div className="grid grid-cols-3 gap-6 md:col-span-7">
            {/* Render each column. */}
            {columns.map((col) => (
              <div key={col.title}>
                {/* Column title — small caps. */}
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {col.title}
                </p>
                {/* Column link list. */}
                <ul className="mt-4 space-y-3">
                  {/* Map each link to a list item. */}
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-foreground transition-colors hover:text-muted-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Hairline divider before the fine-print row. */}
        <div className="mt-16 h-px w-full bg-border/70" />

        {/* Fine-print row — copyright and tiny links. */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          {/* Copyright statement. */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sourcery. All rights reserved.
          </p>
          {/* Tiny legal links. */}
          <ul className="flex items-center gap-6 text-xs text-muted-foreground">
            <li>
              <Link href="#" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="#" className="transition-colors hover:text-foreground">
                Terms
              </Link>
            </li>
            <li>
              <Link href="#" className="transition-colors hover:text-foreground">
                Security
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
