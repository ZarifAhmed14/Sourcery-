# Offline Demo Plan

This project can be demonstrated without paid OpenAI or AI Gateway access.

## What Works Offline

- Health check: `GET /api/health`
- Supplier browse/search: `GET /api/suppliers?limit=3&q=jute`
- Supplier detail: `GET /api/suppliers/:id`
- AI sourcing shape: `POST /api/source`
- Bargaining message: `POST /api/bargain`
- Profit simulation: `POST /api/simulate`

Free-provider and fallback responses are marked through metadata such as `ai_provider: "pollinations"` or `llm_mode: "deterministic_fallback"`.

## What Needs Supabase Later

- Real supplier database
- Row-level security persistence
- Saved searches
- Service-role cache writes
- Source event telemetry
- pgvector retrieval through `match_suppliers`

## What Works With The Free Provider

- The backend can use Pollinations text generation through `https://text.pollinations.ai/openai`.
- Bargain messages use Pollinations when it is available and fall back to a local Bengali template if needed.
- Structured sourcing uses vector retrieval plus deterministic ranking by default. Set `AI_ENABLE_FREE_SOURCE_AI=1` only for experiments, because the anonymous free endpoint is queue-limited.

## What Needs AI Gateway or Provider Keys Later

- More reliable production-grade reasoning model calls
- Higher rate limits and better observability
- OpenAI provider embeddings instead of local-hash embeddings

## Judge-Safe Story

The honest story is:

> Sourcery has a working backend architecture with secure schema, RAG-ready retrieval, a free demo model path, deterministic safety fallbacks, and API contracts. The production model layer can be upgraded by adding AI Gateway or OpenAI environment variables.

Do not claim the free provider is equivalent to a production OpenAI or AI Gateway deployment.
