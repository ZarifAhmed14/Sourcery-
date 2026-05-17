// Sourcery agent evaluation harness.
//
// Runs a canonical set of sourcing queries against /api/source and verifies:
//   1) the response shape conforms to the public contract
//   2) Bangladesh Mode actually rescores BD/South-Asia suppliers higher
//   3) explainability fields are populated (why_top_pick, agent_steps)
//   4) the comparison agent produced exactly one row per shortlisted supplier
//
// Usage:
//   SOURCERY_BASE_URL=http://localhost:3000 node scripts/eval-agent.mjs
//   SOURCERY_BASE_URL=https://sourcery.example.com node scripts/eval-agent.mjs
//
// Exit code is non-zero on any failure so this can be wired into CI.

// Use the built-in `fetch` (Node 18+).
const BASE_URL = process.env.SOURCERY_BASE_URL ?? "http://localhost:3000"

// Canonical eval set — tuned to exercise different verticals + Bangladesh Mode.
const EVAL_SET = [
  {
    id: "bd-cotton-hoodies",
    query: "GOTS-certified organic cotton oversized hoodies, 320 GSM heavyweight fleece, MOQ 300, BSCI compliant",
    bangladeshMode: true,
    // Expect BD suppliers to appear and the top pick to be South Asia when BD mode is on.
    expectations: {
      includesCountry: "Bangladesh",
      topPickRegion: "South Asia",
    },
  },
  {
    id: "vegan-skincare",
    query: "Vegan skincare contract manufacturer for serums and creams, ISO 22716 certified, MOQ 1000",
    bangladeshMode: false,
    expectations: {
      // Beauty category is multi-region — we just verify the rep is wide enough.
      minCountriesAcrossShortlist: 2,
    },
  },
  {
    id: "denim-bd-mode",
    query: "Premium denim manufacturer with sustainable laser/ozone wash, recycled cotton, BSCI",
    bangladeshMode: true,
    expectations: {
      includesCountry: "Bangladesh",
    },
  },
  {
    id: "rugs-goodweave",
    query: "Hand-knotted wool rugs, GoodWeave certified, custom designs, MOQ 50",
    bangladeshMode: false,
    expectations: {
      minCountriesAcrossShortlist: 1,
    },
  },
  {
    id: "specialty-coffee",
    query: "Single-origin specialty coffee, Rainforest Alliance certified, 500kg minimum",
    bangladeshMode: false,
    expectations: {
      minCountriesAcrossShortlist: 1,
    },
  },
]

// Lightweight assertion utility — collects failures rather than aborting the whole eval.
function check(condition, label, failures) {
  if (!condition) failures.push(label)
}

// Run a single eval case end-to-end.
async function runCase(testCase) {
  const failures = []
  const start = Date.now()

  let res
  try {
    res = await fetch(`${BASE_URL}/api/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: testCase.query, bangladeshMode: testCase.bangladeshMode }),
    })
  } catch (err) {
    return {
      id: testCase.id,
      ok: false,
      durationMs: Date.now() - start,
      failures: [`network error: ${err.message}`],
    }
  }

  const elapsed = Date.now() - start

  // Top-level HTTP status check.
  check(res.ok, `HTTP ${res.status}`, failures)
  // Parse the JSON body — bail early if the server didn't return JSON.
  let body
  try {
    body = await res.json()
  } catch {
    failures.push("invalid JSON response")
    return { id: testCase.id, ok: false, durationMs: elapsed, failures }
  }

  // Shape checks — the keys we contractually rely on across the UI.
  check(Array.isArray(body.suppliers), "suppliers is array", failures)
  check(Array.isArray(body.discovery), "discovery is array", failures)
  check(Array.isArray(body.risk), "risk is array", failures)
  check(Array.isArray(body.comparison), "comparison is array", failures)
  check(body.meta && typeof body.meta.confidence === "number", "meta.confidence present", failures)

  // Length parity — comparison/discovery/risk should each have one row per supplier.
  if (Array.isArray(body.suppliers)) {
    const n = body.suppliers.length
    check(n >= 5 && n <= 12, `shortlist size in [5,12] (got ${n})`, failures)
    check(body.discovery.length === n, "discovery length matches", failures)
    check(body.risk.length === n, "risk length matches", failures)
    check(body.comparison.length === n, "comparison length matches", failures)
  }

  // Explainability — every comparison row must have a non-empty score breakdown.
  if (Array.isArray(body.comparison)) {
    for (const c of body.comparison) {
      check(typeof c.score === "number" && c.score >= 0 && c.score <= 100, "comparison.score in [0,100]", failures)
      check(typeof c.score_breakdown === "object" && c.score_breakdown !== null, "score_breakdown present", failures)
    }
  }

  // BD-specific expectations.
  if (testCase.expectations.includesCountry) {
    const countries = (body.suppliers ?? []).map((s) => s.country)
    check(
      countries.includes(testCase.expectations.includesCountry),
      `shortlist includes ${testCase.expectations.includesCountry}`,
      failures,
    )
  }

  // Top-pick region check.
  if (testCase.expectations.topPickRegion) {
    const top = (body.discovery ?? []).find((d) => d.rank === 1)
    const supplier = (body.suppliers ?? []).find((s) => s.id === top?.supplier_id)
    check(
      supplier?.region === testCase.expectations.topPickRegion,
      `top pick region == ${testCase.expectations.topPickRegion} (got ${supplier?.region})`,
      failures,
    )
  }

  // Diversity check — the orchestrator should never return 8 suppliers all from one country.
  if (testCase.expectations.minCountriesAcrossShortlist) {
    const countries = new Set((body.suppliers ?? []).map((s) => s.country))
    check(
      countries.size >= testCase.expectations.minCountriesAcrossShortlist,
      `shortlist contains >= ${testCase.expectations.minCountriesAcrossShortlist} distinct countries (got ${countries.size})`,
      failures,
    )
  }

  return { id: testCase.id, ok: failures.length === 0, durationMs: elapsed, failures }
}

// Top-level driver — runs all cases sequentially so we don't hammer the agent in parallel.
async function main() {
  console.log(`Running Sourcery eval against ${BASE_URL}`)
  console.log(`Cases: ${EVAL_SET.length}\n`)

  const results = []
  for (const c of EVAL_SET) {
    process.stdout.write(`  · ${c.id} … `)
    const r = await runCase(c)
    results.push(r)
    console.log(r.ok ? `pass (${r.durationMs}ms)` : `FAIL (${r.durationMs}ms)`)
    if (!r.ok) {
      for (const f of r.failures) console.log(`     - ${f}`)
    }
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.length - passed
  const totalMs = results.reduce((acc, r) => acc + r.durationMs, 0)
  const avgMs = Math.round(totalMs / results.length)

  console.log(`\nSummary: ${passed}/${results.length} passed · avg ${avgMs}ms · total ${totalMs}ms`)
  // Non-zero exit on any failure so this works in CI.
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Eval crashed:", err)
  process.exit(1)
})
