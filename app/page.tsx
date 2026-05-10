import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Brain,
  CheckCircle2,
  Database,
  Factory,
  Globe2,
  LineChart,
  Lock,
  MapPin,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const supplierRows = [
  { name: "Dhaka Knitworks", place: "Dhaka, BD", fit: "94", risk: "Low", price: "$3.85", lead: "28d" },
  { name: "Akij Jute Mills", place: "Noapara, BD", fit: "91", risk: "Low", price: "$1.90", lead: "45d" },
  { name: "Guangzhou Beauty Pack", place: "Guangzhou, CN", fit: "86", risk: "Med", price: "$0.42", lead: "25d" },
]

const workflow = [
  ["Data", "300 synthetic suppliers plus public-source rows, normalized into one sourcing schema."],
  ["Retrieval", "Semantic and rule-based ranking across price, MOQ, lead time, region, and certifications."],
  ["AI", "Explainable sourcing briefs, risk notes, bargaining drafts, and deterministic fallbacks."],
  ["Governance", "Rate limits, cache, telemetry, RLS-ready schema, and health checks for judging."],
]

const capabilities = [
  { icon: Search, title: "Find suppliers", text: "Turn a messy buying brief into ranked supplier candidates." },
  { icon: ShieldCheck, title: "Read the risk", text: "See risk score, flags, certifications, and why each supplier was picked." },
  { icon: TrendingUp, title: "Model margin", text: "Estimate landed cost, selling price, fees, and profit before outreach." },
  { icon: Brain, title: "Negotiate faster", text: "Generate supplier-ready bargaining messages from the selected supplier context." },
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f4ec] text-[#16201d]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-[#f7f4ec]/82 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#16201d] text-sm font-black text-[#f7f4ec]">
              SQ
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-[0.22em]">SOURCERY</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#66736f]">Supplier intelligence</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#53605c] md:flex">
            <a href="#workflow" className="hover:text-[#16201d]">Workflow</a>
            <a href="#proof" className="hover:text-[#16201d]">Proof</a>
            <a href="#system" className="hover:text-[#16201d]">System</a>
          </nav>
          <Button asChild className="hidden rounded-md bg-[#16201d] text-[#f7f4ec] hover:bg-[#24332f] min-[520px]:inline-flex">
            <Link href="/app">
              <span className="hidden sm:inline">Launch demo</span>
              <span className="sm:hidden">Demo</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen border-b border-black/10 pt-16">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,32,29,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(22,32,29,0.08)_1px,transparent_1px)] bg-[size:54px_54px]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#f7f4ec] to-transparent" />
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-[1.02fr_0.98fr] md:px-8">
            <div className="w-[calc(100vw-40px)] min-w-0 max-w-3xl md:w-auto">
              <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-[#cdbb89] bg-[#fff8df] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">
                <Sparkles className="h-4 w-4" />
                BuildFest 2026 sourcing agent
              </div>
              <h1 className="max-w-[350px] text-balance font-serif text-6xl leading-[0.9] tracking-normal text-[#13201b] md:max-w-full md:text-8xl lg:text-9xl">
                Find the supplier before your competitor does.
              </h1>
              <p className="mt-8 max-w-[340px] text-lg leading-8 text-[#53605c] md:max-w-2xl md:text-xl">
                Sourcery turns a product idea into ranked suppliers, risk signals, negotiation drafts, and profit math. It is built for small brands that need sourcing intelligence without a procurement department.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
                  <Link href="/app">
                    Run the live sourcing workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-md border-[#16201d]/20 bg-white/40 px-6">
                  <a href="#workflow">See the AI workflow</a>
                </Button>
              </div>
            <div className="mt-10 grid max-w-2xl grid-cols-1 divide-y divide-black/10 border-y border-black/10 bg-white/35 min-[520px]:grid-cols-3 min-[520px]:divide-x min-[520px]:divide-y-0">
                <Metric value="300+" label="synthetic supplier rows" />
                <Metric value="10" label="public-source sample rows" />
                <Metric value="<60s" label="judge-safe API response" />
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#d9b44a]/25 blur-3xl" />
              <div className="absolute -bottom-8 -right-10 h-48 w-48 rounded-full bg-[#2e7d65]/20 blur-3xl" />
              <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[#16201d]/15 bg-[#101917] shadow-2xl shadow-[#16201d]/25">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2 text-[#f5efe0]">
                    <Radar className="h-5 w-5 text-[#d9b44a]" />
                    <span className="text-sm font-semibold">Sourcing Run</span>
                  </div>
                  <span className="rounded-md bg-[#1d3d33] px-2 py-1 text-xs font-medium text-[#9cf0c9]">Bangladesh Mode</span>
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
                            <span className="rounded-md border border-[#9cf0c9]/25 bg-[#12362d] px-2 py-1 text-xs text-[#9cf0c9]">
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

        <section id="workflow" className="border-b border-black/10 bg-[#fffaf0] py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">AI Development Workflow</p>
              <h2 className="mt-4 font-serif text-5xl leading-none md:text-7xl">Built to check the boxes and survive the demo.</h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {workflow.map(([title, text], index) => (
                <div key={title} className="rounded-lg border border-black/10 bg-[#f7f4ec] p-5">
                  <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-md bg-[#16201d] text-sm font-semibold text-[#f7f4ec]">
                    0{index + 1}
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5e6a66]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="bg-[#16201d] py-24 text-[#f7f4ec]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.8fr_1.2fr] md:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">Product proof</p>
              <h2 className="mt-4 font-serif text-5xl leading-none md:text-7xl">Not a pretty shell. A real sourcing system.</h2>
              <p className="mt-6 text-lg leading-8 text-[#bac5c0]">
                Judges can see the data, the ranking logic, the fallback behavior, the risk layer, and the actual supplier workspace in one flow.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                  <item.icon className="h-6 w-6 text-[#d9b44a]" />
                  <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#bac5c0]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="system" className="border-b border-black/10 bg-[#f7f4ec] py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-black/10 bg-white/55 p-7">
                <Globe2 className="h-7 w-7 text-[#2e7d65]" />
                <h2 className="mt-5 font-serif text-4xl">Supplier graph, ready for expansion.</h2>
                <p className="mt-4 text-[#5e6a66]">
                  The frontend presents verified and synthetic rows separately, so the demo can be honest while still feeling rich.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  {["Bangladesh Mode", "BGMEA flagging", "Risk score 0-100", "Public source URLs"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-md bg-[#eef2e8] p-3">
                      <CheckCircle2 className="h-4 w-4 text-[#2e7d65]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-black/10 bg-white/55 p-7">
                <Boxes className="h-7 w-7 text-[#2e7d65]" />
                <h2 className="mt-5 font-serif text-4xl">From search to negotiation.</h2>
                <p className="mt-4 text-[#5e6a66]">
                  One workspace moves from supplier discovery to comparison, bargaining, and margin simulation without exposing database keys.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["/api/source", "/api/suppliers", "/api/bargain", "/api/simulate", "/api/health"].map((item) => (
                    <span key={item} className="rounded-md border border-black/10 bg-[#16201d] px-3 py-2 font-mono text-xs text-[#f7f4ec]">
                      {item}
                    </span>
                  ))}
                </div>
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

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4">
      <div className="font-serif text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#66736f]">{label}</div>
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

function DemoFooter({ icon: Icon, text }: { icon: typeof Database; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Icon className="h-4 w-4 text-[#d9b44a]" />
      {text}
    </div>
  )
}
