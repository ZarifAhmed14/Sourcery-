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

The backend works before Supabase and AI keys are configured. In offline mode:

- `/api/source` returns deterministic ranked demo suppliers.
- `/api/suppliers` and `/api/suppliers/[id]` return demo supplier data.
- `/api/bargain` returns a deterministic supplier outreach message.
- `/api/health` reports which services are configured.

This is intentional. It keeps the demo usable while Supabase, embeddings, and AI Gateway are being wired.

## Commands

```bash
npm run typecheck
npm run build
npm run smoke:api
npm run self-check
```

`npm run smoke:api` starts the production server locally, tests the health, supplier, source, bargain, and simulation APIs, then shuts the server down.

## Supabase Setup Later

When Supabase is available:

1. Copy `.env.example` to `.env.local` and fill in the Supabase keys.
2. Run `scripts/001_create_schema.sql` in the Supabase SQL editor.
3. Run `npm run db:seed` to regenerate `scripts/generated/seed_suppliers.sql` if needed.
4. Run the generated seed SQL in Supabase.
5. Add `OPENAI_API_KEY`, then run `npm run db:embed` to populate pgvector embeddings.
6. Run `npm run self-check`.

## Frontend Contract

Lovable or any other frontend should call the relative API paths documented in `docs/api-contract.md`. Do not put Supabase service-role keys or AI provider keys in the frontend.
