-- Sourcery backend hardening migration
-- Safe to run after an older 001_create_schema.sql. It does not drop supplier data.

alter table public.suppliers drop constraint if exists suppliers_category_check;
alter table public.suppliers
  add constraint suppliers_category_check
  check (category in ('apparel', 'beauty', 'home', 'food', 'accessories', 'packaging', 'electronics', 'textiles', 'footwear', 'industrial'));

alter table public.suppliers drop constraint if exists suppliers_region_check;
alter table public.suppliers
  add constraint suppliers_region_check
  check (region in ('South Asia', 'Southeast Asia', 'East Asia', 'Europe', 'MENA', 'Africa', 'North America', 'South America'));

create table if not exists public.source_events (
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

alter table public.source_events add column if not exists ai_provider text not null default 'unknown';

create index if not exists source_events_created_at_idx on public.source_events (created_at desc);
create index if not exists source_events_query_hash_idx on public.source_events (query_hash);

alter table public.source_events enable row level security;

-- source_events intentionally has no anon policies.
-- Server writes use SUPABASE_SERVICE_ROLE_KEY through lib/supabase/admin.ts.
