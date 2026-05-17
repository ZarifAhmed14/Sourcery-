import {
  Bot,
  Brain,
  Database,
  FileSearch,
  LineChart,
  Network,
  ShieldAlert,
  Sparkles,
} from "lucide-react"

const stages = [
  {
    title: "Knowledge Layer",
    icon: Database,
    subtitle: "Supabase + pgvector",
    detail: "Supplier rows, embeddings, certifications, risk fields, and public/synthetic source labels are stored behind server-only API routes.",
  },
  {
    title: "Retrieval Layer",
    icon: FileSearch,
    subtitle: "Vector + guided category matching",
    detail: "The app constrains users to supported categories, retrieves candidates from Supabase, and ranks by category fit, keywords, lead time, MOQ, risk, and Bangladesh Mode.",
  },
  {
    title: "Discovery Agent",
    icon: Bot,
    subtitle: "Finds the best suppliers",
    detail: "Produces ranked candidates with fit scores and concrete reasons grounded in supplier fields instead of unsupported guesses.",
  },
  {
    title: "Risk Agent",
    icon: ShieldAlert,
    subtitle: "Flags sourcing risk",
    detail: "Reviews supplier risk score, lead time, MOQ, on-time rate, source type, certifications, and regional factors.",
  },
  {
    title: "Simulation Agent",
    icon: LineChart,
    subtitle: "Deterministic profit engine",
    detail: "Stress-tests supplier choice under shipping, price, quantity, and lead-time changes without relying on a paid model.",
  },
]

const workflowChecks = [
  ["Problem Definition", "Supplier discovery is slow, noisy, and risky for small businesses without procurement teams."],
  ["Architecture Design", "Landing page, guided app workspace, API routes, Supabase, pgvector, Gemini, deterministic fallbacks."],
  ["Prompt Engineering", "Structured generation paths for sourcing explanations, with fallback repair paths."],
  ["Knowledge Layer Setup", "84 supplier rows, embeddings, match_suppliers RPC, source labels, cache, and telemetry."],
  ["AI Model Integration", "Gemini handles generation; retrieval and simulation stay deterministic for demo reliability."],
  ["Testing & Validation", "Typecheck, production build, db verify, API smoke test, and guided demo query set."],
]

export default function WorkflowPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-black/10 bg-[#16201d] text-[#f7f4ec]">
        <div className="grid gap-8 p-7 md:grid-cols-[0.9fr_1.1fr] md:p-9">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b44a]">AI workflow proof</p>
            <h1 className="mt-4 font-serif text-5xl leading-none md:text-6xl">From brief to supplier decision.</h1>
            <p className="mt-5 text-base leading-7 text-[#bdc8c2]">
              Sourcery makes the BuildFest workflow visible: data enters a knowledge layer, retrieval narrows the supplier set,
              agents explain the decision, and deterministic tools keep the demo stable.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
              <Sparkles className="h-5 w-5 text-[#d9b44a]" />
              Judge demo pipeline
            </div>
            <div className="mt-5 grid gap-3">
              {["Choose category/product", "Run supplier intelligence", "Inspect supplier", "Compare options", "Simulate margin"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-[#0d1714] p-3">
                  <span className="grid h-7 w-7 place-items-center rounded bg-[#d9b44a] text-xs font-black text-[#16201d]">{index + 1}</span>
                  <span className="text-sm text-[#e8eee9]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stages.map((stage) => (
          <article key={stage.title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <stage.icon className="h-6 w-6 text-[#2e7d65]" />
            <h2 className="mt-4 text-xl font-semibold text-[#16201d]">{stage.title}</h2>
            <p className="mt-1 text-sm font-medium text-[#7a5b0f]">{stage.subtitle}</p>
            <p className="mt-3 text-sm leading-6 text-[#5d6965]">{stage.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-[#2e7d65]" />
          <h2 className="text-2xl font-semibold text-[#16201d]">BuildFest Workflow Coverage</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {workflowChecks.map(([phase, detail]) => (
            <div key={phase} className="rounded-md border border-black/10 bg-[#f7f4ec] p-4">
              <h3 className="text-sm font-semibold text-[#16201d]">{phase}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5d6965]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-[#fff8df] p-6">
        <div className="flex items-start gap-3">
          <Brain className="mt-1 h-5 w-5 text-[#7a5b0f]" />
          <div>
            <h2 className="text-xl font-semibold text-[#16201d]">Why AI is required</h2>
            <p className="mt-2 text-sm leading-6 text-[#5d6965]">
              Supplier sourcing is not just search. Buyers need relevance, risk interpretation, and
              cost tradeoffs. Sourcery combines retrieval with AI generation and deterministic validation so decisions are
              explainable instead of just keyword matches.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
