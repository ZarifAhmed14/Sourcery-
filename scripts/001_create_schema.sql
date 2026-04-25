-- =====================================================================
-- Sourcery — Phase 4 Knowledge Layer schema
-- Creates: suppliers (the catalog), saved_searches (per-user history),
-- ai_cache (orchestrator response cache to keep token spend low).
-- Embeddings are intentionally omitted: we use FTS + category filtering
-- for retrieval, then let Opus do the semantic reasoning on the shortlist.
-- =====================================================================

-- Drop in dependency-safe order so this script is idempotent during dev.
drop table if exists public.saved_searches cascade;
drop table if exists public.ai_cache cascade;
drop table if exists public.suppliers cascade;

-- ---------------------------------------------------------------------
-- suppliers: the master catalog. Every field maps directly to the
-- explainability requirements (numeric values that key_factors can cite).
-- ---------------------------------------------------------------------
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  country         text not null,
  city            text not null,
  region          text not null,                       -- "South Asia" | "Southeast Asia" | "East Asia" | "Europe" | "MENA"
  category        text not null,                       -- "apparel" | "beauty" | "home" | "food" | "accessories"
  subcategory     text not null,
  description     text not null,                       -- used for ILIKE retrieval + Opus context
  unit_price_usd  numeric(10,2) not null,
  moq             integer not null,                    -- minimum order quantity
  lead_time_days  integer not null,
  on_time_rate    integer not null check (on_time_rate between 0 and 100),
  quality_rating  numeric(2,1) not null check (quality_rating between 0 and 5),
  risk_score      integer not null check (risk_score between 0 and 100),
  certifications  text[] not null default '{}',
  bgmea_certified boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Helpful indexes for our retrieval patterns.
create index suppliers_category_idx on public.suppliers (category);
create index suppliers_region_idx   on public.suppliers (region);
create index suppliers_country_idx  on public.suppliers (country);
-- Trigram-style search on description for fuzzy keyword retrieval.
create index suppliers_description_idx on public.suppliers using gin (to_tsvector('english', description));

-- The catalog is public-read for the demo (no PII).
alter table public.suppliers enable row level security;
create policy "suppliers_public_read" on public.suppliers for select using (true);

-- ---------------------------------------------------------------------
-- saved_searches: per-user persistence. Only owners can read/write.
-- ---------------------------------------------------------------------
create table public.saved_searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  query           text not null,
  bangladesh_mode boolean not null default false,
  results         jsonb not null,                      -- full agent output incl. explainability
  metadata        jsonb not null default '{}'::jsonb,  -- { confidence, country_diversity, token_cost_estimate }
  created_at      timestamptz not null default now()
);

create index saved_searches_user_id_idx on public.saved_searches (user_id, created_at desc);

alter table public.saved_searches enable row level security;
create policy "saved_searches_select_own" on public.saved_searches for select using (auth.uid() = user_id);
create policy "saved_searches_insert_own" on public.saved_searches for insert with check (auth.uid() = user_id);
create policy "saved_searches_update_own" on public.saved_searches for update using (auth.uid() = user_id);
create policy "saved_searches_delete_own" on public.saved_searches for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- ai_cache: server-side response cache keyed by sha256(query+mode+topK).
-- This is the single biggest cost-saver — repeat queries return free.
-- Public-read but only service-role can write (no RLS insert policy).
-- ---------------------------------------------------------------------
create table public.ai_cache (
  cache_key   text primary key,
  response    jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index ai_cache_expires_at_idx on public.ai_cache (expires_at);

alter table public.ai_cache enable row level security;
create policy "ai_cache_public_read" on public.ai_cache for select using (true);
