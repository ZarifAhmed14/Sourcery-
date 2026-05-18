import { CheckCircle2, FileSearch, ShieldCheck, TrendingUp } from "lucide-react"

type PipelineStage = {
  id: string
  badge: string
  techTag: string
  title: string
  description: string
  icon: typeof CheckCircle2
  dotClass: string
  badgeClass: string
}

const stages: PipelineStage[] = [
  {
    id: "01",
    badge: "01 / TELL US WHAT YOU NEED",
    techTag: "[Your request]",
    title: "You describe your product and budget",
    description:
      "Pick a category, product, region, and price range. You can also add quantity and notes. Sourcery uses this to understand your exact need.",
    icon: CheckCircle2,
    dotClass: "bg-indigo-400 shadow-[0_0_0_5px_rgba(129,140,248,0.15)]",
    badgeClass: "text-indigo-300",
  },
  {
    id: "02",
    badge: "02 / WE FIND MATCHING SUPPLIERS",
    techTag: "[Smart search]",
    title: "Supplier matching in seconds",
    description:
      "Sourcery checks the supplier database and finds the best matches based on your selected product, location, pricing, and delivery needs.",
    icon: FileSearch,
    dotClass: "bg-sky-400 shadow-[0_0_0_5px_rgba(56,189,248,0.15)]",
    badgeClass: "text-sky-300",
  },
  {
    id: "03",
    badge: "03 / WE CHECK RISK FOR YOU",
    techTag: "[Risk review]",
    title: "Clear warning signs before you buy",
    description:
      "You see supplier risk, MOQ, lead time, and reliability in simple language, so you can avoid costly mistakes before placing an order.",
    icon: ShieldCheck,
    dotClass: "bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.16)]",
    badgeClass: "text-amber-300",
  },
  {
    id: "04",
    badge: "04 / YOU CHOOSE WITH CONFIDENCE",
    techTag: "[Profit simulation]",
    title: "Compare options and pick the best one",
    description:
      "Sourcery helps you compare suppliers side by side, estimate profit, and choose the supplier that gives you the best balance of cost, speed, and safety.",
    icon: TrendingUp,
    dotClass: "bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.15)]",
    badgeClass: "text-emerald-300",
  },
]

export default function WorkflowPage() {
  return (
    <div className="space-y-6 rounded-xl border border-black/10 bg-[#f7f4ec] p-5 text-[#16201d] shadow-sm md:p-7">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-[#6d7a75]">
            <TrendingUp className="h-4 w-4" />
            Simple Workflow
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#16201d] md:text-4xl">How Sourcery works</h1>
          <p className="mt-2 text-sm text-[#5d6965] md:text-base">
            No technical knowledge needed. Just follow these four steps.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-mono text-indigo-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
          Buyer mode
        </div>
      </section>

      <section className="relative space-y-6 border-l border-black/10 pl-6">
        {stages.map((stage) => (
          <article
            key={stage.id}
            className="relative rounded-xl border border-black/10 bg-white/80 p-4 backdrop-blur-sm transition-all duration-200 hover:border-[#d9b44a]/45 hover:bg-white"
          >
            <span className={`absolute -left-[34px] top-6 h-3.5 w-3.5 rounded-full ${stage.dotClass}`} />

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`font-mono text-xs uppercase tracking-[0.16em] ${stage.badgeClass}`}>{stage.badge}</span>
              <span className="font-mono text-[11px] text-[#77837f]">{stage.techTag}</span>
            </div>

            <div className="flex items-start gap-2">
              <stage.icon className="mt-0.5 h-4 w-4 text-[#2e7d65]" />
              <div>
                <h2 className="text-base font-semibold text-[#16201d] md:text-lg">{stage.title}</h2>
                <p className="mt-1 text-sm leading-6 text-[#5d6965]">{stage.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
