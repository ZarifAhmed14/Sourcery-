import Link from "next/link"
import { ArrowRight, BarChart3, Database, Radar, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const supplierRows = [
  { name: "Dhaka Knitworks", place: "Dhaka, BD", fit: "94%", risk: "Low 18", price: "$3.85", moq: "800", lead: "28d" },
  { name: "Akij Jute Mills", place: "Noapara, BD", fit: "91%", risk: "Low 22", price: "$1.90", moq: "2,000", lead: "45d" },
  { name: "Tiruppur Organic Textiles", place: "Tiruppur, IN", fit: "87%", risk: "Medium 34", price: "$4.30", moq: "700", lead: "30d" },
]

const featureStrip = [
  { icon: Database, label: "Supplier ranking" },
  { icon: ShieldCheck, label: "Risk review" },
  { icon: BarChart3, label: "Profit simulation" },
  { icon: Radar, label: "Bangladesh Mode" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f4ec] text-[#16201d]">
      <header className="border-b border-black/10 bg-[#f7f4ec]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-[#16201d] text-sm font-black text-[#f7f4ec]">
              SQ
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.22em]">SOURCERY</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#66736f]">Supplier intelligence</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[#53605c] md:flex">
            <Link href="/app" className="hover:text-[#16201d]">Workspace</Link>
            <Link href="/app/workflow" className="hover:text-[#16201d]">How it works</Link>
            <Link href="/app/directory" className="hover:text-[#16201d]">Suppliers</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-5 py-8 md:px-8 md:py-10">
        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5b0f]">BuildFest MVP</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-[#13201b] md:text-6xl">
              Source suppliers with margin, risk, and readiness intelligence.
            </h1>
            <div className="mt-8">
              <Button asChild size="lg" className="h-12 rounded-md bg-[#16201d] px-6 text-[#f7f4ec] hover:bg-[#24332f]">
                <Link href="/app">
                  Open sourcing workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#16201d]/12 bg-[linear-gradient(180deg,#f3ecde_0%,#eee4d1_100%)] shadow-[0_24px_70px_rgba(22,32,29,0.10)]">
            <div className="grid border-b border-[#16201d]/10 lg:grid-cols-[0.46fr_0.54fr]">
              <div className="border-r border-[#16201d]/10 bg-[#f6f0e4]/80 p-5">
                <div className="rounded-2xl border border-[#16201d]/10 bg-[#fbf7ef] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Category</p>
                  <p className="mt-2 text-base font-medium text-[#16201d]">Bags & accessories</p>
                </div>
                <div className="mt-3 rounded-2xl border border-[#16201d]/10 bg-[#fbf7ef] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d7a75]">Product</p>
                  <p className="mt-2 text-base font-medium text-[#16201d]">jute tote bags</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <PreviewStat label="Target price" value="$1.5-$3.0" />
                  <PreviewStat label="Order qty" value="1,000" />
                  <PreviewStat label="Region" value="South Asia" />
                  <PreviewStat label="Country" value="Bangladesh" />
                </div>
              </div>

              <div className="bg-[#f9f4e9] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a5b0f]">Ranked suppliers</p>
                    <p className="mt-1 text-sm text-[#53605c]">Live sourcing preview</p>
                  </div>
                  <span className="rounded-full border border-[#d9b44a]/35 bg-[#f9edd0] px-3 py-1 text-xs font-medium text-[#7a5b0f]">
                    Bangladesh mode ready
                  </span>
                </div>

                <div className="space-y-3">
                  {supplierRows.map((row, index) => (
                    <div key={row.name} className="rounded-2xl border border-[#16201d]/10 bg-[#fffaf0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#d9b44a] px-2 py-0.5 text-xs font-semibold text-[#16201d]">#{index + 1}</span>
                            <h3 className="truncate text-base font-semibold text-[#16201d]">{row.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-[#66736f]">{row.place}</p>
                        </div>
                        <span className="rounded-full border border-[#d9b44a]/30 bg-[#f9edd0] px-3 py-1 text-xs font-semibold text-[#7a5b0f]">
                          {row.fit} fit
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <MiniCard label="Unit" value={row.price} />
                        <MiniCard label="MOQ" value={row.moq} />
                        <MiniCard label="Lead" value={row.lead} />
                        <MiniCard label="Risk" value={row.risk} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y divide-[#16201d]/10 bg-[#ece3d2] text-xs text-[#53605c] md:grid-cols-4 md:divide-y-0">
              {featureStrip.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-3">
                  <Icon className="h-4 w-4 text-[#7a5b0f]" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="mt-5 text-xs text-[#7b8783]">
          BuildFest MVP — demo supplier data, deterministic ranking, AI-assisted explanations where available.
        </p>
      </main>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#16201d]/10 bg-[#fbf7ef] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[#6d7a75]">{label}</div>
      <div className="mt-1.5 text-sm font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#16201d]/10 bg-[#f6f0e4] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#6d7a75]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#16201d]">{value}</div>
    </div>
  )
}
