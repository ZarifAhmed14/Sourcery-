# Sourcery BuildFest Backend

Sourcery is an AI-assisted supplier sourcing backend for finding, comparing, and negotiating with suppliers, with a special Bangladesh Mode for local/regional buyer needs.

The backend is built to follow the BuildFest AI Development Workflow:

- Problem definition: supplier discovery is slow, opaque, and hard to compare.
- Architecture design: Next.js API routes, Supabase Postgres, pgvector retrieval, deterministic fallbacks, AI orchestration.
- Knowledge layer/RAG: supplier rows, search documents, vector embeddings, and provenance fields.
- Model integration: configurable reasoning and bargaining models through AI SDK/provider keys.
- Agent orchestration: retrieval, ranking, risk review, comparison, and negotiation draft generation.
- Testing and validation: typecheck, production build, and API smoke tests.
- Deployment readiness: env-gated services, rate limits, RLS schema, health endpoint, and docs.

## Offline Mode

The backend works before paid AI keys are configured. In offline or low-key mode:

- `/api/source` returns deterministic ranked demo suppliers.
- `/api/suppliers` and `/api/suppliers/[id]` return demo supplier data.
- `/api/bargain` returns a deterministic supplier outreach message.
- `/api/health` reports which services are configured.

This is intentional. It keeps the demo usable while Supabase, embeddings, and AI Gateway are being wired. When no paid provider key is present, the backend attempts the free Pollinations text endpoint first, then falls back to deterministic output if the free endpoint is unavailable or returns invalid structured data.

## Commands

```bash
npm run typecheck
npm run build
npm run smoke:api
npm run self-check
npm run db:verify
npm run db:seed:rich
```

`npm run smoke:api` starts the production server locally, tests the health, supplier, source, bargain, and simulation APIs, then shuts the server down.

## Supabase Setup Later

When Supabase is available:

1. Copy `.env.example` to `.env.local` and fill in the Supabase keys.
2. Run `scripts/001_create_schema.sql` in the Supabase SQL editor.
3. Run `scripts/002_backend_hardening.sql` if you are updating an older Supabase project.
4. Run `npm run db:seed` to regenerate `scripts/generated/seed_suppliers.sql` if needed.
5. Run the generated seed SQL in Supabase.
6. Run `npm run db:seed:rich` to add the richer BuildFest supplier dataset.
7. Add `OPENAI_API_KEY` later if available, then run `npm run db:embed` to replace local-hash embeddings with provider embeddings.
8. Run `npm run self-check` and `npm run db:verify`.

## Free AI Provider

Until OpenAI or AI Gateway keys are available, leave:

```bash
AI_FREE_PROVIDER=pollinations
AI_ENABLE_FREE_SOURCE_AI=0
POLLINATIONS_BASE_URL=https://text.pollinations.ai
POLLINATIONS_MODEL=openai-fast
```

This is for prototype validation, not a production guarantee. The production path should use AI Gateway or a provider key once available. `AI_ENABLE_FREE_SOURCE_AI` is off by default because the anonymous Pollinations endpoint is queue-limited; sourcing still works through vector retrieval and deterministic ranking, while bargain messages can use the free endpoint when it is available.

If your Supabase project was created from an older schema, run `scripts/002_backend_hardening.sql` in the Supabase SQL editor. It adds the sourcing telemetry table and syncs supplier category/region checks with the richer seeded dataset.

## Frontend Contract

Lovable or any other frontend should call the relative API paths documented in `docs/api-contract.md`. Do not put Supabase service-role keys or AI provider keys in the frontend.
