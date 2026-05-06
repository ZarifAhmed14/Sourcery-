# Offline Demo Plan

This project can be demonstrated without Supabase or AI Gateway for the next 12 hours.

## What Works Offline

- Health check: `GET /api/health`
- Supplier browse/search: `GET /api/suppliers?limit=3&q=jute`
- Supplier detail: `GET /api/suppliers/:id`
- AI sourcing shape: `POST /api/source`
- Bargaining message: `POST /api/bargain`
- Profit simulation: `POST /api/simulate`

Offline responses are marked through metadata such as `retrieval_mode: "deterministic"` and `llm_mode: "deterministic_fallback"`.

## What Needs Supabase Later

- Real supplier database
- Row-level security persistence
- Saved searches
- Service-role cache writes
- Source event telemetry
- pgvector retrieval through `match_suppliers`

## What Needs AI Gateway or Provider Keys Later

- Live reasoning model for supplier ranking explanations
- Live Bengali negotiation message generation
- Embedding generation for supplier vectors

## Judge-Safe Story

The honest story is:

> Sourcery has a working backend architecture with secure schema, RAG-ready retrieval, deterministic safety fallbacks, and API contracts. The live database/model layer can be switched on by adding Supabase and AI environment variables.

Do not claim the offline mode is using live supplier databases or live LLM inference.
