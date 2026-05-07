-- Sourcery BuildFest backend schema
-- Phase alignment: data layer, knowledge/RAG layer, app persistence, cache, evaluation telemetry.

create extension if not exists pgcrypto;
create extension if not exists vector;

drop table if exists public.source_events cascade;
drop table if exists public.saved_searches cascade;
drop table if exists public.ai_cache cascade;
drop table if exists public.supplier_relationships cascade;
drop table if exists public.suppliers cascade;

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  city text not null,
  region text not null check (region in ('South Asia', 'Southeast Asia', 'East Asia', 'Europe', 'MENA', 'Africa', 'North America', 'South America')),
  category text not null check (category in ('apparel', 'beauty', 'home', 'food', 'accessories', 'packaging', 'electronics', 'textiles', 'footwear', 'industrial')),
  subcategory text not null,
  description text not null,
  unit_price_usd numeric(10,2) not null check (unit_price_usd >= 0),
  moq integer not null check (moq > 0),
  lead_time_days integer not null check (lead_time_days > 0),
  on_time_rate integer not null check (on_time_rate between 0 and 100),
  quality_rating numeric(2,1) not null check (quality_rating between 0 and 5),
  risk_score integer not null check (risk_score between 0 and 100),
  certifications text[] not null default '{}',
  bgmea_certified boolean not null default false,
  source_type text not null default 'synthetic' check (source_type in ('synthetic', 'public_web', 'partner', 'upload')),
  source_url text,
  verified_at timestamptz,
  embedding vector(1536),
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(subcategory, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(country, '') || ' ' || coalesce(region, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(certifications, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_category_idx on public.suppliers (category);
create index suppliers_country_idx on public.suppliers (country);
create index suppliers_region_idx on public.suppliers (region);
create index suppliers_quality_idx on public.suppliers (quality_rating desc);
create index suppliers_search_idx on public.suppliers using gin (search_document);
create index suppliers_embedding_hnsw_idx on public.suppliers using hnsw (embedding vector_cosine_ops);

create table public.supplier_relationships (
  id uuid primary key default gen_random_uuid(),
  source_supplier_id uuid not null references public.suppliers(id) on delete cascade,
  target_supplier_id uuid not null references public.suppliers(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('same_cluster', 'cert_overlap', 'regional_peer', 'category_peer')),
  weight numeric(4,3) not null check (weight >= 0 and weight <= 1),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_supplier_id, target_supplier_id, relationship_type)
);

create index supplier_relationships_source_idx on public.supplier_relationships (source_supplier_id);
create index supplier_relationships_target_idx on public.supplier_relationships (target_supplier_id);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  bangladesh_mode boolean not null default false,
  results jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index saved_searches_user_id_idx on public.saved_searches (user_id, created_at desc);

create table public.ai_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index ai_cache_expires_at_idx on public.ai_cache (expires_at);

create table public.source_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  query_hash text not null,
  bangladesh_mode boolean not null,
  retrieval_mode text not null,
  llm_mode text not null,
  ai_provider text not null default 'unknown',
  result_count integer not null,
  country_diversity integer not null,
  elapsed_ms integer not null,
  created_at timestamptz not null default now()
);

create index source_events_created_at_idx on public.source_events (created_at desc);
create index source_events_query_hash_idx on public.source_events (query_hash);

alter table public.suppliers enable row level security;
alter table public.supplier_relationships enable row level security;
alter table public.saved_searches enable row level security;
alter table public.ai_cache enable row level security;
alter table public.source_events enable row level security;

create policy suppliers_public_read on public.suppliers for select using (true);
create policy supplier_relationships_public_read on public.supplier_relationships for select using (true);

create policy saved_searches_select_own on public.saved_searches for select using (auth.uid() = user_id);
create policy saved_searches_insert_own on public.saved_searches for insert with check (auth.uid() = user_id);
create policy saved_searches_update_own on public.saved_searches for update using (auth.uid() = user_id);
create policy saved_searches_delete_own on public.saved_searches for delete using (auth.uid() = user_id);

-- ai_cache and source_events intentionally have no anon policies.
-- Server writes use SUPABASE_SERVICE_ROLE_KEY through lib/supabase/admin.ts.

create or replace function public.match_suppliers(
  query_embedding vector(1536),
  match_count integer default 20,
  category_filter text default null,
  min_similarity double precision default 0.05
)
returns table (
  id uuid,
  name text,
  country text,
  city text,
  region text,
  category text,
  subcategory text,
  description text,
  unit_price_usd numeric,
  moq integer,
  lead_time_days integer,
  on_time_rate integer,
  quality_rating numeric,
  risk_score integer,
  certifications text[],
  bgmea_certified boolean,
  source_type text,
  source_url text,
  verified_at timestamptz,
  similarity double precision
)
language sql
stable
as $$
  select
    s.id,
    s.name,
    s.country,
    s.city,
    s.region,
    s.category,
    s.subcategory,
    s.description,
    s.unit_price_usd,
    s.moq,
    s.lead_time_days,
    s.on_time_rate,
    s.quality_rating,
    s.risk_score,
    s.certifications,
    s.bgmea_certified,
    s.source_type,
    s.source_url,
    s.verified_at,
    1 - (s.embedding <=> query_embedding) as similarity
  from public.suppliers s
  where s.embedding is not null
    and (category_filter is null or s.category = category_filter)
    and 1 - (s.embedding <=> query_embedding) >= min_similarity
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
