// Four-capability section — Discover, Compare, Negotiate, Monitor.
// Renders a 2x2 grid of capability cards with numbered eyebrows and short copy.

// Server Component — purely presentational data + layout.
export function Capabilities() {
  // Static array of capability records keeping content separate from markup.
  const items = [
    {
      // Step number for editorial labeling.
      n: "01",
      // Capability title in display serif.
      title: "Discover",
      // Concise body explaining the agent behavior.
      body:
        "Describe the product in plain language. The Discovery Agent searches the full supplier index, ranks candidates by fit, and explains every recommendation with the data it used.",
      // Tag list — each tag is a single keyword.
      tags: ["Semantic search", "Multi-criteria ranking", "Verified directory"],
    },
    {
      n: "02",
      title: "Compare",
      body:
        "Side-by-side scorecards across price, lead time, MOQ, quality rating, on-time rate, and certifications. Profit-engine math is built in — see landed cost and margin per supplier.",
      tags: ["Live scorecards", "Profit Engine", "Country diversity"],
    },
    {
      n: "03",
      title: "Negotiate",
      body:
        "Sourcery turns the selected supplier context into clear next-step guidance for outreach, samples, and price checks before the buyer commits.",
      tags: ["Buyer guidance", "Sample checks", "Price context"],
    },
    {
      n: "04",
      title: "Monitor",
      body:
        "Once an order is live, Sourcery tracks lead times, on-time delivery, and quality signals — and proactively recommends backup suppliers before disruptions hit.",
      tags: ["What-if simulation", "Risk alerts", "Backup shortlists"],
    },
  ]

  // Section wrapper with anchor for the nav and a top border to separate from the previous section.
  return (
    <section id="how-it-works" className="border-t border-border/70">
      {/* Centered container with editorial side and vertical padding. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Eyebrow + headline pair. */}
        <div className="mb-16 grid gap-6 md:grid-cols-12">
          {/* Eyebrow column — small caps label. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">How it works</p>
          </div>
          {/* Headline column — display serif. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Four agents, <em className="italic">one workflow.</em>
            </h2>
            {/* Optional supporting paragraph explaining the architecture lightly. */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Each capability is a specialized agent with its own prompt, schema, and guardrails — orchestrated together so reasoning stays explainable from end to end.
            </p>
          </div>
        </div>

        {/* 2x2 grid of capability cards. */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 md:grid-cols-2">
          {/* Render one card per capability item. */}
          {items.map((item) => (
            // Card uses the cream background; the gap-px trick creates hairline dividers.
            <div key={item.n} className="bg-background p-8 md:p-12">
              {/* Top row — number on the left, "Agent" tag on the right. */}
              <div className="mb-8 flex items-center justify-between">
                {/* Big editorial step number. */}
                <span className="font-serif text-2xl text-muted-foreground">{item.n}</span>
                {/* Tiny "agent" tag. */}
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Agent
                </span>
              </div>

              {/* Capability title in display serif. */}
              <h3 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
                {item.title}
              </h3>

              {/* Body copy explaining the capability. */}
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                {item.body}
              </p>

              {/* Tag list — pill style. */}
              <ul className="mt-8 flex flex-wrap gap-2">
                {/* Map each tag to a small pill with a lime tick. */}
                {item.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
