import { BarChart3, BrainCircuit, CheckCircle2, Database, GitCompare, PackageSearch, Route, Search, Send, ShieldCheck, Sparkles } from "lucide-react"

const steps = [
  { id: "01", title: "Choose the product you want to buy", caption: "Product, price, quantity, region", visual: "brief", icon: Search },
  { id: "02", title: "See suppliers that match your needs", caption: "Best matches first", visual: "matching", icon: PackageSearch },
  { id: "03", title: "Check the risks before you decide", caption: "MOQ, lead time, quality, logistics", visual: "risk", icon: ShieldCheck },
  { id: "04", title: "Compare profit and contact the supplier", caption: "Profit, profile, contact", visual: "decision", icon: Send },
]

const aiUses = [
  { icon: Database, title: "Read data", copy: "Supplier rows" },
  { icon: GitCompare, title: "Rank options", copy: "Best matches" },
  { icon: ShieldCheck, title: "Explain risk", copy: "Buyer warnings" },
  { icon: Sparkles, title: "Draft action", copy: "Outreach prep" },
]

export default function WorkflowPage() {
  return (
    <div className="space-y-7 rounded-xl border border-black/10 bg-[#f7f4ec] p-5 text-[#16201d] shadow-sm md:p-7">
      <style>
        {`
          @keyframes workflow-pop { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes workflow-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
          @keyframes workflow-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(4deg); } }
          @keyframes workflow-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217, 180, 74, 0.42); transform: scale(1); } 50% { box-shadow: 0 0 0 10px rgba(217, 180, 74, 0); transform: scale(1.015); } }
          @keyframes workflow-pulse-soft { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(20, 118, 93, 0.24); } 50% { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(20, 118, 93, 0); } }
          @keyframes workflow-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        `}
      </style>

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="bg-[#16201d] p-6 text-[#f7f4ec] md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#d9b44a] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#16201d]">
              Supplier decision flow
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-tight tracking-[-0.03em] md:text-5xl">A simple way to choose the right supplier.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#c9d7d2] md:text-lg">
              Start with what you want to buy. Sourcery checks the supplier pool, ranks the strongest matches, shows the risks, and gives you a clear next step.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ExplainerCard label="You choose" value="Product, budget, quantity, region" />
              <ExplainerCard label="Sourcery returns" value="Best suppliers, risk, profit, contact path" />
            </div>
          </div>
          <JourneyMap />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {steps.map((step, index) => (
          <article
            key={step.id}
            className="animate-[workflow-pop_600ms_ease-out_both] overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="border-b border-black/10 bg-[#fbf7ef] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a5b0f]">Step {step.id}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#16201d]">{step.title}</h2>
                </div>
                <span className="rounded-full bg-[#16201d] px-3 py-1 text-xs font-bold text-[#f7f4ec]">{step.caption}</span>
              </div>
            </div>
            <div className="p-5">
              <WorkflowVisual type={step.visual} />
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
          <div className="bg-[#fbf7ef] p-6 md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff8df] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#7a5b0f]">
              <BrainCircuit className="h-4 w-4" />
              How we used AI
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-tight tracking-[-0.03em] text-[#16201d] md:text-5xl">AI helps with judgment. The data keeps it grounded.</h2>
            <div className="mt-6 rounded-2xl bg-[#16201d] p-4 text-[#f7f4ec]">
              <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[#d9b44a]">
                <span>Supplier data</span>
                <span>AI reasoning</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[78%] origin-left animate-[workflow-grow_1.2s_ease-out_both] rounded-full bg-[#7fb7a7]" />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#c9d7d2]">AI ranks and explains. Numeric supplier metrics keep the answer practical.</p>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 md:p-7">
            {aiUses.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-5 transition-colors duration-300 hover:bg-[#fffaf0]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#16201d] text-[#f7f4ec]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#16201d]">{title}</h3>
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5d6965]">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function JourneyMap() {
  return (
    <div className="bg-[#fbf7ef] p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a5b0f]">The flow</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[#16201d]">Four decisions, one clean shortlist.</h2>
        </div>
        <span className="hidden rounded-full bg-[#e9dfc8] px-3 py-1 text-xs font-bold text-[#53605c] sm:inline-flex">No spreadsheet cleanup</span>
      </div>

      <div className="grid gap-3">
        {steps.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.id} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#16201d] text-[#f7f4ec]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#7a5b0f]">{step.id}</span>
                  <span className="rounded-full bg-[#f1ede3] px-2.5 py-1 text-xs font-bold text-[#53605c]">{step.caption}</span>
                </div>
                <p className="mt-2 text-base font-bold text-[#16201d]">{step.title}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExplainerCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d9b44a]">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#f7f4ec]">{value}</p>
    </div>
  )
}

function WorkflowVisual({ type }: { type: string }) {
  if (type === "brief") return <BriefVisual />
  if (type === "matching") return <MatchingVisual />
  if (type === "risk") return <RiskVisual />
  return <DecisionVisual />
}

function BriefVisual() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#16201d] p-4 text-[#f7f4ec]">
      <div className="absolute -right-10 -top-10 h-32 w-32 animate-[workflow-float_5s_ease-in-out_infinite] rounded-full bg-[#7fb7a7]/20" />
      <div className="absolute -bottom-12 left-10 h-28 w-28 animate-[workflow-float_6s_ease-in-out_infinite_reverse] rounded-[35%] bg-[#d9b44a]/20" />
      <div className="grid gap-3 sm:grid-cols-2">
        <VisualField label="Category" value="Bags & accessories" />
        <VisualField label="Product" value="Jute tote bags" />
        <VisualField label="Target price" value="$1.50-$2.50" />
        <VisualField label="Region" value="South Asia" />
      </div>
      <div className="relative mt-4 animate-[workflow-pulse_2.4s_ease-in-out_infinite] rounded-2xl bg-[#d9b44a] px-4 py-3 text-center font-bold text-[#16201d] shadow-[0_0_0_0_rgba(217,180,74,0.6)]">Find suppliers</div>
    </div>
  )
}

function MatchingVisual() {
  const rows = [
    ["Golden Jute", "84%", "w-[84%]"],
    ["Akij Jute", "84%", "w-[84%]"],
    ["Natore Canvas", "79%", "w-[79%]"],
    ["Dhaka Packaging", "76%", "w-[76%]"],
  ]
  return (
    <div className="rounded-3xl bg-[#fbf7ef] p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#16201d]">
        <PackageSearch className="h-5 w-5 text-[#7a5b0f]" />
        Ranked supplier match board
      </div>
      <div className="space-y-3">
        {rows.map(([name, score, width], index) => (
          <div key={name} className="rounded-2xl border border-black/10 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#d9b44a] px-2 py-0.5 text-xs font-bold text-[#16201d]">#{index + 1}</span>
                <span className="font-bold text-[#16201d]">{name}</span>
              </div>
              <span className="text-sm font-bold text-[#14765d]">{score} fit</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#ece6d9]">
              <div className={`h-2 origin-left animate-[workflow-grow_1.2s_ease-out_both] rounded-full bg-[#7fb7a7] ${width}`} style={{ animationDelay: `${index * 160}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskVisual() {
  return (
    <div className="grid gap-4 rounded-3xl bg-[#fbf7ef] p-4 sm:grid-cols-[0.75fr_1.25fr]">
      <div className="grid place-items-center rounded-3xl bg-[#e6f4ee] p-5 text-center">
        <div className="grid h-20 w-20 animate-[workflow-pulse-soft_2.2s_ease-in-out_infinite] place-items-center rounded-full bg-white">
          <ShieldCheck className="h-14 w-14 text-[#14765d]" />
        </div>
        <p className="mt-3 text-3xl font-black text-[#14765d]">Low</p>
        <p className="text-sm font-bold text-[#53605c]">risk profile</p>
      </div>
      <div className="space-y-3">
        <RiskRow label="MOQ" value="1,500" good />
        <RiskRow label="Lead time" value="25d" good />
        <RiskRow label="Quality" value="4.4/5" good />
        <RiskRow label="Logistics" value="Ship route ready" />
      </div>
    </div>
  )
}

function DecisionVisual() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#16201d] p-4 text-[#f7f4ec]">
      <div className="absolute right-5 top-5 h-24 w-24 animate-[workflow-float_4.5s_ease-in-out_infinite] rounded-full bg-[#7fb7a7]/15" />
      <div className="grid gap-3 sm:grid-cols-3">
        <DecisionMetric icon={BarChart3} label="Margin" value="32%" />
        <DecisionMetric icon={Route} label="Route" value="Ship" />
        <DecisionMetric icon={CheckCircle2} label="Next" value="Contact" />
      </div>
      <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/8 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d9b44a]">Decision summary</p>
        <p className="mt-2 text-xl font-bold">Pick the front-runner, check profit, then contact the supplier.</p>
      </div>
    </div>
  )
}

function VisualField({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:bg-white/12">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#d9b44a]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  )
}

function RiskRow({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
      <span className="text-sm font-bold text-[#53605c]">{label}</span>
      <span className={`font-bold ${good ? "text-[#14765d]" : "text-[#16201d]"}`}>{value}</span>
    </div>
  )
}

function DecisionMetric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 transition-colors duration-300 hover:bg-white/12">
      <Icon className="h-5 w-5 animate-[workflow-bob_2s_ease-in-out_infinite] text-[#d9b44a]" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#9fafaa]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  )
}
