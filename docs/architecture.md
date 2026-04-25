# Sourcery — AI-Native Architecture (BuildFest Phase 2)

This document maps Sourcery to the BuildFest 8-layer AI-Native Reference Architecture.

## Layer 1 — Data Layer

**Storage:** Supabase Postgres with `pgvector` extension.

| Table | Purpose |
|---|---|
| `suppliers` | Supplier master record — name, country, region, category, price, MOQ, lead time, on-time rate, quality, risk score, certifications |
| `supplier_embeddings` | 1536-dim vectors for semantic retrieval (text-embedding-3-small) |
| `saved_searches` | User-persisted sourcing runs incl. agent output and confidence telemetry |
| `ai_cache` | Server-side cache keyed by `sha256(query + bangladeshMode + topK)` to prevent repeat LLM calls |

Demo seed: 200 realistic suppliers across 9 countries and 5 consumer categories.

## Layer 2 — Knowledge Layer

- pgvector index (HNSW) over supplier description + category + certifications.
- Structured filters on country, region, category, MOQ, lead time, on-time rate.
- Bangladesh Mode region filter and server-side score adjustment (see Layer 7).
- No external scraping. No paid APIs. All knowledge comes from the seeded supplier corpus.

## Layer 3 — Model Layer

| Use case | Model | Rationale |
|---|---|---|
| Discovery reasoning | `anthropic/claude-opus-4.6` (or 4.7 if available) | Highest-quality multi-criteria reasoning |
| Comparison scorecards | `anthropic/claude-opus-4.6` | Structured trade-off analysis |
| Risk analysis | `anthropic/claude-opus-4.6` | Pattern detection across certs, country, anomalies |
| Bargain Copilot (Bangla) | `openai/gpt-5-mini` | Pure text generation, low cost |
| Simulation rank-change explainer | `openai/gpt-5-mini` | Single sentence, 60 token cap |
| Profit one-line explainer | `openai/gpt-5-mini` | Single sentence, 40 token cap |
| Embeddings | `openai/text-embedding-3-small` | Cheapest viable embedding model |

All calls go through the **Vercel AI Gateway** (zero-config for Anthropic and OpenAI). The AI SDK v6 is used throughout with `generateObject` for structured outputs and `streamText` for chat.

## Layer 4 — Agent Layer

Four specialized agents, each Zod-validated:

1. **Discovery Agent** — ranks pgvector candidates by fit; outputs explanation + key factors + confidence.
2. **Comparison Agent** — produces scorecards; references profit-engine numbers when provided.
3. **Risk Agent** — flags red flags (cert mismatches, anomalous prices, country risk).
4. **Bargain Copilot** — generates Bangla supplier outreach when Bangladesh Mode is on.

## Layer 5 — Orchestration Layer

Single orchestrator at `app/api/source/route.ts`:

```
1. Receive { query, bangladeshMode, topK }
2. Check ai_cache (sha256 hash)
3. Embed query
4. pgvector top-20
5. Server-side re-score (Bangladesh Mode)
6. Discovery Agent (top 10)
7. Risk Agent (parallel where independent)
8. Comparison Agent
9. Each call wrapped in validateExplainability() retry-once → fallback
10. Persist to ai_cache (24h TTL) + saved_searches if user authenticated
11. Stream/return to client
```

## Layer 6 — Application Layer

- Next.js 16 App Router
- Server Components by default
- Server Actions for all AI calls (no client-side keys)
- Tailwind v4 + shadcn/ui
- Pages: `/`, `/login`, `/app`, `/app/compare`, `/app/suppliers/[id]`, `/app/dashboard`

## Layer 7 — Trust & Safety Layer

| Mechanism | Implementation |
|---|---|
| Output schema validation | Zod schemas merge `ExplainabilitySchema` into every agent output |
| Guardrail retry | `validateExplainability()` rejects vague output → re-prompt once → deterministic `fallbackExplanation()` if still failing |
| Confidence indicator | Every recommendation shows green/amber/red dot + reason |
| Rate limiting | In-memory token bucket on AI routes |
| Cost limits | Hard `maxOutputTokens` per agent (Discovery 800, Comparison 600, Risk 400, Bargain 200, explainers 40–60) |
| Bangladesh Mode disclosure | Risk Agent must flag `bd_mode_adjusted: true` when applied |
| No hidden reasoning | All explanations exposed via `WhyThisAccordion` UI, no raw JSON shown |

## Layer 8 — Feedback Layer

- Saved searches store `{ confidence, country_diversity, token_cost_estimate }` in `metadata`.
- `/scripts/eval.ts` runs 12 fixed queries and asserts schema, numeric references, country diversity.
- Manual edge cases tracked in `/docs/test-cases.md`.

## Cross-cutting: Cost discipline

- Single tiered model strategy (Opus for reasoning, gpt-5-mini for supporting calls)
- 24h `ai_cache` TTL keyed by query hash
- Hard token caps per agent
- Streaming so unrendered tokens are not paid for
- Mock supplier dataset (no scraping costs)
- Embedding cost is one-time at seed (~$0.10)
- Hard project cap: **$20** before deployment
