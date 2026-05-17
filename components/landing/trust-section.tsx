// Trust & verification section.
// Explains how Sourcery's supplier scores are built and why they can be trusted.
// Anchors the "Explainability" pillar of the BuildFest evaluation criteria.

// Server Component — static content.
export function TrustSection() {
  // Three pillars of the trust system, each with a number, title, and description.
  const pillars = [
    {
      n: "01",
      title: "Verified data, not self-reported claims",
      body:
        "Every supplier score is derived from cross-checked certifications, third-party audits, and observed delivery performance — not the supplier's own brochure.",
    },
    {
      n: "02",
      title: "Reasoning attached to every recommendation",
      body:
        "Discovery, Comparison, and Risk agents must reference real numbers and named fields in their explanations. Vague output is rejected by the guardrail and re-prompted.",
    },
    {
      n: "03",
      title: "Confidence, in plain sight",
      body:
        "A green/amber/red dot accompanies every recommendation, with a one-line reason. When confidence is low, Sourcery says so — instead of pretending.",
    },
  ]

  // Section wrapper.
  return (
    <section className="border-t border-border/70">
      {/* Centered container with editorial padding. */}
      <div className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        {/* Eyebrow + headline grid. */}
        <div className="mb-16 grid gap-6 md:grid-cols-12">
          {/* Eyebrow. */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Trust layer</p>
          </div>
          {/* Headline + supporting paragraph. */}
          <div className="md:col-span-8">
            <h2 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-[1] tracking-tight text-balance">
              Recommendations you can <em className="italic">defend in a meeting.</em>
            </h2>
            {/* Body intro under the headline. */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Sourcery's scoring is auditable. Every number, every sentence is traceable back to the
              data it came from.
            </p>
          </div>
        </div>

        {/* Three-pillar grid — stacks on mobile, three columns on md. */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Render each pillar card. */}
          {pillars.map((p) => (
            <div
              key={p.n}
              // Each pillar is a quiet card with a top accent line and serif numeral.
              className="border-t-2 border-foreground pt-6"
            >
              {/* Step number. */}
              <p className="font-serif text-2xl text-muted-foreground">{p.n}</p>
              {/* Pillar title. */}
              <h3 className="mt-3 font-serif text-2xl leading-tight text-foreground md:text-3xl">
                {p.title}
              </h3>
              {/* Pillar description. */}
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
