import Link from "next/link"

export function SiteFooter() {
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
        { label: "Workflow", href: "/app/workflow" },
        { label: "Supplier directory", href: "/app/directory" },
        { label: "Saved searches", href: "/app/dashboard" },
        { label: "Contact", href: "/app" },
      ],
    },
  ]

  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-serif text-3xl tracking-tight text-foreground">Sourcery</span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The AI sourcing agent for consumer brands. Built for BuildFest 2026, Track 4.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 md:col-span-7">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-foreground transition-colors hover:text-muted-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 h-px w-full bg-border/70" />

        <div className="mt-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">Copyright {new Date().getFullYear()} Sourcery. All rights reserved.</p>
          <ul className="flex items-center gap-6 text-xs text-muted-foreground">
            <li>
              <Link href="/app" className="transition-colors hover:text-foreground">
                Workspace
              </Link>
            </li>
            <li>
              <Link href="/app/workflow" className="transition-colors hover:text-foreground">
                Workflow
              </Link>
            </li>
            <li>
              <Link href="/app/health" className="transition-colors hover:text-foreground">
                Health
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
