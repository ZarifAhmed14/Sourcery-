# Sourcery API Contract

This contract is for the Lovable frontend. Use relative URLs such as `/api/source`; do not call Supabase or AI providers directly from the browser.

## POST /api/source

Request:

```json
{
  "query": "GOTS-certified organic cotton hoodies, MOQ 300, lead under 35 days",
  "bangladeshMode": true,
  "topK": 10,
  "category": "apparel"
}
```

Response:

```ts
type SourcingResult = {
  suppliers: Supplier[]
  discovery: DiscoveryItem[]
  risk: RiskItem[]
  comparison: ComparisonItem[]
  meta: {
    request_id: string
    bangladeshMode: boolean
    cached: boolean
    confidence: "high" | "medium" | "low"
    country_diversity: number
    query: string
    retrieval_mode: "vector" | "full_text" | "deterministic"
    llm_mode: "ai" | "deterministic_fallback"
    ai_provider: "ai_sdk" | "pollinations" | "none"
    elapsed_ms: number
  }
}
```

## GET /api/suppliers

Query params:

```text
q=hoodie
category=apparel
country=Bangladesh
region=South Asia
limit=50
offset=0
```

Response:

```ts
{
  suppliers: Supplier[]
  count: number
  limit: number
  offset: number
  source: "supabase" | "demo"
}
```

## GET /api/suppliers/[id]

Response:

```ts
{
  supplier: Supplier
  source: "supabase" | "demo"
}
```

## POST /api/bargain

Request:

```json
{
  "supplier": {
    "name": "Padma Manufacturing 01",
    "country": "Bangladesh",
    "unit_price_usd": 8.75,
    "moq": 300,
    "lead_time_days": 28
  },
  "productDescription": "organic cotton hoodie",
  "orderQuantity": 300
}
```

Response:

```ts
{
  message: string
  meta: {
    llm_mode: "ai" | "deterministic_fallback"
    ai_provider: "ai_sdk" | "pollinations" | "none"
  }
}
```

## POST /api/simulate

Request:

```json
{
  "suppliers": [],
  "baseInputs": {
    "selling_price": 24,
    "shipping_cost_per_unit": 1.5,
    "customs_rate": 5,
    "packaging_cost_per_unit": 0.8,
    "order_quantity": 300
  },
  "deltas": {
    "shipping_cost_delta_pct": 20,
    "lead_time_delta_days": 5,
    "order_quantity": 500,
    "selling_price": 26,
    "supplier_price_delta_pct": -5
  }
}
```

Response matches `runSimulation()` from `lib/simulate.ts`.

## GET /api/health

Returns non-secret backend status for debugging:

```ts
{
  ok: true
  service: "sourcery-backend"
  runtime: {
    supabase: boolean
    serviceRole: boolean
    aiGeneration: boolean
    aiGenerationProvider: "ai_sdk" | "pollinations" | "none"
    embeddings: boolean
    embeddingProvider: "openai" | "local_hash"
    reasoningModel: string
    embeddingModel: string
    freeProvider: "pollinations" | "none"
    pollinationsModel: string | null
  }
}
```

When paid AI keys are missing, the backend can use the free Pollinations text endpoint for lightweight demo generation. Structured sourcing defaults to vector retrieval plus deterministic ranking unless `AI_ENABLE_FREE_SOURCE_AI=1`, because the anonymous free endpoint is queue-limited. Frontend code should surface `meta.retrieval_mode`, `meta.llm_mode`, `meta.ai_provider`, and list/detail `source` fields when building debug or judge-demo views.
