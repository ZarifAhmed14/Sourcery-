import Link from "next/link"
import {
  ArrowRight,
  Database,
  LineChart,
  Lock,
  MapPin,
  Radar,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const supplierRows = [
  { name: "Dhaka Knitworks", place: "Dhaka, BD", fit: "94", risk: "Low", price: "$3.85", lead: "28d" },
  { name: "Akij Jute Mills", place: "Noapara, BD", fit: "91", risk: "Low", price: "$1.90", lead: "45d" },
  { name: "Guangzhou Beauty Pack", place: "Guangzhou, CN", fit: "86", risk: "Med", price: "$0.42", lead: "25d" },
]

const workflow = [
  ["1. Describe your need", "Tell Sourcery what product you want, your budget, quantity target, and how fast you need delivery."],
  ["2. Review suppliers", "Sourcery ranks supplier options and shows price, lead time, risk level, and match quality in one place."],
  ["3. Compare business impact", "Use the compare view to see which supplier gives the strongest balance of cost, speed, and margin."],
  ["4. Reach out with confidence", "Generate a ready-to-use supplier message after you choose the strongest option for your business."],
]

const proofItems = [
  ["Find suppliers", "Turn a messy buying brief into ranked supplier candidates."],
  ["Read the risk", "See risk score, flags, certifications, and why each supplier was picked."],
  ["Model margin", "Estimate landed cost, selling price, fees, and profit before outreach."],
  ["Negotiate faster", "Generate supplier-ready bargaining messages from the selected supplier context."],
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#16201d]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-[#f7f4ec]/82 backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#16201d] text-sm font-black text-[#f7f4ec]">
              SQ
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-[0.22em]">SOURCERY</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#66736f]">Supplier intelligence</span>
            </span>
          </Link>
          <nav className="hidden items-center justify-self-center gap-7 text-sm text-[#53605c] md:flex">
            <Link href="/app" className="hover:text-[#16201d]">Workspace</Link>
            <a href="#suppliers" className="hover:text-[#16201d]">Suppliers</a>
            <Link href="/app/workflow" className="hover:text-[#16201d]">How it works</Link>
          </nav>
          <div className="justify-self-end">
            <Button asChild variant="outline" className="hidden h-10 rounded-md border-black/10 bg-white/70 px-4 text-[#16201d] hover:bg-white md:inline-flex">
              <Link href="/auth/login">Log in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen border-b border-black/10 pt-16">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,32,29,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(22,32,29,0.08)_1px,transparent_1px)] bg-[size:54px_54px]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#f7f4ec] to-transparent" />
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-start gap-10 px-5 py-12 md:grid-cols-[1.02fr_0.98fr] md:px-8">
            <div className="w-[calc(100vw-40px)] min-w-0 max-w-3xl md:w-auto">
              <h1 className="max-w-[350px] text-balance font-serif text-6xl leading-[0.9] tracking-normal text-[#13201b] md:max-w-full md:text-8xl lg:text-9xl">
                Find the best supplier for your business.
              </h1>
              <p className="mt-8 max-w-[340px] text-lg leading-8 text-[#53605c] md:max-w-2xl md:text-xl">
                Sourcery turns a product idea into ranked suppliers, risk signals, negotiation drafts, and profit math. It is built for small brands that need sourcing intelligence without a procurement department.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
                  <Link href="/app">
                    Open the workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative min-w-0 self-start pt-2">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#d9b44a]/25 blur-3xl" />
              <div className="absolute -bottom-8 -right-10 h-48 w-48 rounded-full bg-[#16201d]/12 blur-3xl" />
              <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#16201d]/15 bg-[#101917] shadow-2xl shadow-[#16201d]/25">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-[#f5efe0]">
                    <Radar className="h-5 w-5 text-[#d9b44a]" />
                    <span className="text-sm font-semibold">Sourcing Run</span>
                  </div>
                  <span className="rounded-md border border-[#d9b44a]/30 bg-[#2d2414] px-2 py-1 text-xs font-medium text-[#f0d58d]">Bangladesh Mode</span>
                </div>
                <div className="grid min-w-0 border-b border-white/10 md:grid-cols-[0.78fr_1.22fr]">
                  <div className="min-w-0 space-y-4 border-r border-white/10 p-5">
                    <PanelLabel>Buyer brief</PanelLabel>
                    <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-[#e9e4d6]">
                      Eco-friendly jute tote bags under $3, low MOQ, export-ready, certifications preferred.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <TinyStat label="Budget" value="$3 max" />
                      <TinyStat label="MOQ" value="< 1000" />
                      <TinyStat label="Region" value="BD first" />
                      <TinyStat label="Risk" value="Low" />
                    </div>
                  </div>
                  <div className="min-w-0 p-5">
                    <PanelLabel>Ranked suppliers</PanelLabel>
                    <div className="mt-4 space-y-3">
                      {supplierRows.map((row, index) => (
                        <div key={row.name} className="rounded-md border border-white/10 bg-white/[0.045] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#d9b44a]">#{index + 1}</span>
                                <h3 className="font-semibold text-[#f5efe0]">{row.name}</h3>
                              </div>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#aab7b1]">
                                <MapPin className="h-3 w-3" />
                                {row.place}
                              </p>
                            </div>
                            <span className="rounded-md border border-[#d9b44a]/25 bg-[#2d2414] px-2 py-1 text-xs text-[#f0d58d]">
                              Fit {row.fit}%
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                            <MiniKpi label="Risk" value={row.risk} />
                            <MiniKpi label="Unit" value={row.price} />
                            <MiniKpi label="Lead" value={row.lead} />
                            <MiniKpi label="Source" value="RAG" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-white/10 bg-[#0b1210] text-xs text-[#aab7b1] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <DemoFooter icon={Database} text="Vector retrieval" />
                  <DemoFooter icon={Lock} text="Server-only API" />
                  <DemoFooter icon={LineChart} text="Telemetry-ready" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="suppliers" className="border-b border-black/10 bg-[#fffaf0] py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Suppliers</p>
              <h2 className="mt-4 font-serif text-5xl leading-none md:text-7xl">Browse the supplier base before you run a sourcing brief.</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5e6a66]">
                Judges can see the kind of supplier data Sourcery works with: category, location, fit, risk, price, and lead-time context before the AI ranking layer takes over.
              </p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.55fr_0.55fr] gap-3 bg-[#eef1ea] px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">
                  <span>Supplier</span>
                  <span>Location</span>
                  <span>Unit</span>
                  <span>Lead</span>
                  <span>Risk</span>
                </div>
                {supplierRows.map((row) => (
                  <div key={row.name} className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.55fr_0.55fr] gap-3 border-t border-black/10 px-5 py-4 text-sm">
                    <div>
                      <div className="font-semibold text-[#16201d]">{row.name}</div>
                      <div className="mt-1 text-xs text-[#6d7a75]">Fit {row.fit}%</div>
                    </div>
                    <span className="text-[#53605c]">{row.place}</span>
                    <span className="font-medium text-[#16201d]">{row.price}</span>
                    <span className="text-[#53605c]">{row.lead}</span>
                    <span className="text-[#53605c]">{row.risk}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">Inside each supplier profile</p>
                <div className="mt-6 space-y-4">
                  <SupplierLandingItem label="Products supported" value="Jute totes, knitwear, cartons, beauty packaging, and more" />
                  <SupplierLandingItem label="Operational detail" value="Unit price, MOQ, lead time, and country/region context" />
                  <SupplierLandingItem label="Trust signals" value="Risk score, certifications, BGMEA badge, and sourcing notes" />
                  <SupplierLandingItem label="Decision path" value="Shortlist, compare, profit model, and bargain draft generation" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#16201d] py-24 text-[#f7f4ec]">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Product proof</p>
              <h2 className="mt-4 font-serif text-5xl leading-none md:text-7xl">Not a pretty shell. A real sourcing system.</h2>
              <p className="mt-6 text-lg leading-8 text-[#bac5c0]">
                Judges can see the data, the ranking logic, the fallback behavior, the risk layer, and the actual supplier workspace in one flow.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {proofItems.map(([title, text]) => (
                <div key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#bac5c0]">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Button asChild variant="outline" className="h-12 rounded-md border-white/15 bg-white/[0.04] px-6 text-[#f7f4ec] hover:bg-white/[0.08]">
                <Link href="/app/workflow">
                  Open how it works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#f7f4ec] py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="rounded-lg border border-dashed border-black/15 bg-white/55 p-10 text-center">
              <h2 className="font-serif text-4xl">More homepage sections can go here next.</h2>
              <p className="mt-4 text-lg text-[#5e6a66]">
                We removed the extra system blocks for now to keep the homepage easier to understand.
              </p>
              <div className="mt-8 flex justify-center">
                <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
                  <Link href="/app">
                    Open Sourcery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#d9b44a] py-20 text-[#16201d]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 md:flex-row md:items-center md:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">Live demo ready</p>
              <h2 className="mt-3 max-w-3xl font-serif text-5xl leading-none md:text-7xl">
                Walk the judge from wow to working product.
              </h2>
            </div>
            <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
              <Link href="/app">
                Open Sourcery
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9b44a]">{children}</p>
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#85928d]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#f5efe0]">{value}</div>
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#85928d]">{label}</div>
      <div className="mt-1 font-semibold text-[#f5efe0]">{value}</div>
    </div>
  )
}

function SupplierLandingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-2 text-sm leading-6 text-[#16201d]">{value}</div>
    </div>
  )
}

function DemoFooter({ icon: Icon, text }: { icon: typeof Database; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Icon className="h-4 w-4 text-[#d9b44a]" />
      {text}
    </div>
  )
}
