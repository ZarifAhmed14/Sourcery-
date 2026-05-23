import Link from "next/link"
import { ArrowRight, BarChart3, CheckCircle2, Factory, GitCompare, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/sourcery/brand-logo"

const steps = [
  {
    icon: Search,
    title: "Choose product",
    copy: "Start with category, product, type, region, and target price so the search is grounded in a real buying brief.",
  },
  {
    icon: GitCompare,
    title: "Compare ranked suppliers",
    copy: "Sourcery ranks supplier options by fit, unit price, MOQ, lead time, and operational quality instead of dumping a raw list.",
  },
  {
    icon: BarChart3,
    title: "Simulate profit & logistics",
    copy: "Check margin, landed cost, route logic, and delivery assumptions before deciding who deserves outreach.",
  },
]

const traditionalPain = ["Spreadsheet tabs everywhere", "Random supplier websites", "Manual quote comparison", "No clear logistics view"]
const sourceryWins = ["Ranked supplier shortlists", "Unit price, MOQ, and lead in one view", "Profit simulation built in", "Logistics route context"]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] text-[#16201d]">
      <nav className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-black/10 bg-[#fbf7ef]/88 px-4 shadow-sm backdrop-blur md:px-8 lg:px-12">
        <BrandLogo showSubtitle />

        <div className="hidden items-center gap-14 text-base font-semibold text-[#53605c] md:flex">
          <Link href="/app" className="hover:text-[#16201d]">Workspace</Link>
          <Link href="/app/workflow" className="hover:text-[#16201d]">How it works</Link>
          <Link href="/app/directory" className="hover:text-[#16201d]">Suppliers</Link>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 py-12 md:px-16 lg:px-28 lg:py-16">
        <div
          aria-hidden
          className="absolute right-[-10rem] top-10 h-[28rem] w-[28rem] rounded-full bg-[#eadbb2]/50 blur-3xl"
        />
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5b0f]">Supplier intelligence for faster buying</p>
            <h1 className="mt-5 font-serif font-[550] text-6xl leading-[1.04] tracking-[-0.045em] text-[#13201b] md:text-7xl lg:text-[5.35rem]">
              Find the right supplier
              <br />
              before you place
              <br />
              the order.
            </h1>

            <p className="mt-8 max-w-xl text-xl leading-[1.65] tracking-[-0.01em] text-[#5f6b67] md:text-2xl">
              See price, risk, and profit clearly before you choose a supplier.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild className="h-14 min-w-[19rem] rounded-full bg-[#16201d] px-12 text-lg font-bold text-[#f7f4ec] hover:bg-[#24332f]">
                <Link href="/app">
                  Open sourcing workspace
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          <AbstractHeroShapes />
        </div>
      </section>

      <section className="px-6 py-16 md:px-16 lg:px-28 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5b0f]">How Sourcery works</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em] text-[#13201b] md:text-6xl">
            From product brief to supplier decision in three steps.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, copy }, index) => (
            <div key={title} className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbf7ef] p-6 shadow-sm">
              <div className="absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full bg-[#eadbb2]/60" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#16201d] text-[#f7f4ec]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-sm text-[#7b8783]">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-2xl font-bold tracking-[-0.03em] text-[#16201d]">{title}</h3>
                <p className="mt-3 text-base leading-7 text-[#5f6b67]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 md:px-16 lg:px-28">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a5b0f]">How we differ</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em] text-[#13201b] md:text-6xl">
            Built to replace messy supplier hunting with a decision-ready sourcing workflow.
          </h2>
        </div>
        <div className="grid overflow-hidden rounded-[2.2rem] border border-black/10 bg-[#16201d] shadow-[0_28px_90px_rgba(22,32,29,0.18)] lg:grid-cols-2">
          <ComparisonCard
            eyebrow="Traditional sourcing"
            title="Spreadsheets, random tabs, and quote chaos."
            items={traditionalPain}
            muted
          />
          <ComparisonCard
            eyebrow="Sourcery workflow"
            title="Ranked suppliers, profit, and logistics in one view."
            items={sourceryWins}
          />
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#16201d] px-6 py-10 text-[#f7f4ec] md:px-16 lg:px-28">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <BrandLogo showSubtitle inverted />
            <p className="mt-5 max-w-md text-sm leading-7 text-[#c9d7d2]">
              A sourcing workspace for buyers who need cleaner supplier decisions, clearer tradeoffs, and faster confidence.
            </p>
            <Button asChild className="mt-6 h-12 rounded-full bg-[#d9b44a] px-7 font-bold text-[#16201d] hover:bg-[#e4c45d]">
              <Link href="/app">
                Open sourcing workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <FooterColumn
            title="Product"
            links={[
              ["Workspace", "/app"],
              ["How it works", "/app/workflow"],
              ["Supplier directory", "/app/directory"],
            ]}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d9b44a]">Built for</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["SME buyers", "Supplier comparison", "Profit simulation", "Bangladesh sourcing"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-[#dfe8e5]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

function AbstractHeroShapes() {
  return (
    <div className="relative hidden h-[620px] lg:block">
      <div className="absolute left-[15%] top-[16%] h-[286px] w-[286px] rounded-[42%] bg-[#7fb7a7]/85 rotate-[11deg]" />
      <div className="absolute right-[12%] top-[8%] h-[250px] w-[250px] rounded-full bg-[#eadbb2]/82" />
      <div className="absolute left-[43%] top-[27%] h-[275px] w-[275px] rounded-full bg-[#8a6f44]/58" />
      <div className="absolute left-[36%] top-[15%] h-[190px] w-[190px] rounded-[18%] bg-[#16201d]/82 rotate-[10deg]" />
    </div>
  )
}

function ComparisonCard({ eyebrow, title, items, muted = false }: { eyebrow: string; title: string; items: string[]; muted?: boolean }) {
  return (
    <div className={`p-7 md:p-10 ${muted ? "bg-[#22312d] text-[#dfe8e5]" : "bg-[#fbf7ef] text-[#16201d]"}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.22em] ${muted ? "text-[#d9b44a]" : "text-[#7a5b0f]"}`}>{eyebrow}</p>
      <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">{title}</h2>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${muted ? "bg-white/8" : "border border-black/10 bg-white"}`}>
            {muted ? <Factory className="h-5 w-5 text-[#d9b44a]" /> : <CheckCircle2 className="h-5 w-5 text-[#14765d]" />}
            <span className="font-semibold">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d9b44a]">{title}</p>
      <div className="mt-4 space-y-3">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="block text-sm font-semibold text-[#c9d7d2] transition-colors hover:text-[#f7f4ec]">
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
