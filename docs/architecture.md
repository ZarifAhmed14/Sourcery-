# Sourcery Backend Architecture

Sourcery follows the Infinity AI BuildFest workflow: define a concrete business problem, design the architecture, build a knowledge layer, integrate models, orchestrate agents, validate outputs, and prepare for deployment.

## 1. Problem Definition

SMEs and e-commerce founders lose weeks comparing suppliers across price, MOQ, lead time, certifications, quality, and risk. Sourcery turns a product brief into a ranked supplier shortlist with explainable trade-offs, profit impact, simulation, and localized Bangla outreach.

## 2. Architecture Design

The backend is a Next.js App Router API layer with Supabase Postgres as the system of record.

Core API routes:

| Route | Purpose |
|---|---|
| `POST /api/source` | Retrieve suppliers, rank them, run AI/deterministic agents, return explainable results |
| `GET /api/suppliers` | Filterable supplier catalog for the frontend |
| `GET /api/suppliers/[id]` | Supplier detail lookup |
| `POST /api/bargain` | Bangla outreach generation with deterministic fallback |
| `POST /api/simulate` | Server-side simulation helper for frontend parity |
| `GET /api/health` | Runtime/configuration status |

## 3. Data Layer

Supabase schema lives in `scripts/001_create_schema.sql`.

Tables:

| Table | Purpose |
|---|---|
| `suppliers` | Supplier catalog, numeric decision fields, generated full-text index, optional pgvector embedding |
| `supplier_relationships` | Lightweight graph-style links for category/region/certification peer relationships |
| `saved_searches` | User-owned saved runs under RLS |
| `ai_cache` | Service-role-only AI response cache |
| `source_events` | Service-role-only telemetry for evaluation and performance review |

Security:

- Supplier data is public read because it is non-PII demo catalog data.
- Saved searches are owner-only through RLS.
- Cache and telemetry have no anon policies; backend writes use `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Knowledge Layer / RAG

The retrieval layer lives in `lib/sourcery/retrieval.ts`.

Retrieval order:

1. Detect likely product category from the buyer brief.
2. If `OPENAI_API_KEY` is configured and supplier embeddings exist, embed the query with `text-embedding-3-small`.
3. Call Supabase RPC `match_suppliers()` using pgvector cosine similarity.
4. If vector retrieval is unavailable, fall back to Postgres full-text search over `search_document`.
5. Apply Bangladesh Mode post-retrieval scoring server-side.

This means the backend supports real pgvector RAG when embeddings are configured, but still works in a cheaper full-text mode for demos.

## 5. Model Integration

AI generation uses the Vercel AI SDK via configurable model names:

| Env var | Default | Purpose |
|---|---|---|
| `AI_REASONING_MODEL` | `openai/gpt-5-mini` | Discovery, Risk, Comparison structured output |
| `AI_BARGAIN_MODEL` | `openai/gpt-5-mini` | Bangla outreach message |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Supplier/query embeddings |

If AI credentials are missing or `AI_DISABLE_LLM=1`, the backend returns deterministic structured recommendations instead of failing.

## 6. Agent Orchestration

`lib/sourcery/orchestrator.ts` coordinates three agent roles:

- Discovery Agent: ranks suppliers by fit.
- Risk Agent: flags risk, lead-time, MOQ, delivery, and Bangladesh Mode adjustments.
- Comparison Agent: returns numeric scorecards.

All agent outputs are Zod-validated. Missing or vague outputs are repaired using deterministic fallbacks grounded in supplier fields.

## 7. Prompt Engineering

Prompt contracts live in `lib/prompts/system.ts`.

Mandatory requirements:

- Every agent output must include an explanation.
- Every explanation must reference real values such as price, MOQ, lead time, quality, risk, or on-time rate.
- Confidence must be surfaced as `high`, `medium`, or `low`.
- Bangladesh Mode prompt context is injected only when the user enables it.

## 8. Testing & Validation

Current verification:

- `npm run typecheck` validates the TypeScript contract.
- `npm run build` validates the production Next.js build.
- `scripts/seed-suppliers.mjs` produces reproducible supplier seed SQL.
- `scripts/embed-suppliers.mjs` populates pgvector embeddings when credentials are available.

Recommended next tests:

- API contract tests for `/api/source`, `/api/suppliers`, `/api/bargain`, `/api/simulate`.
- Retrieval quality eval using fixed product briefs.
- Cost/latency eval for cached vs uncached runs.

## 9. Deployment Preparation

Required env vars:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Optional:

```text
AI_REASONING_MODEL=
AI_BARGAIN_MODEL=
OPENAI_EMBEDDING_MODEL=
AI_DISABLE_LLM=1
```

The app now avoids crashing when Supabase is missing; `/api/health` shows what is configured.

## 10. Impact & Scalability

Impact metrics:

- Time-to-shortlist: weeks to minutes.
- Supplier comparison breadth: 5-10 manual suppliers to 50+ searchable supplier profiles.
- Decision clarity: every supplier comes with fit, risk, comparison, and confidence.
- Localization: Bangladesh Mode and Bengali supplier outreach.

Scalability path:

- Move rate limiting from in-memory to Redis/Upstash for distributed production.
- Expand supplier ingestion from synthetic seed to scraping/uploads/partner data.
- Add scheduled embedding refresh and retrieval evals.
