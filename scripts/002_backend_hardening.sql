-- Sourcery backend hardening migration
-- Safe to run after an older 001_create_schema.sql. It does not drop supplier data.

update public.suppliers
set category = case lower(category)
  when 'apparel' then 'apparel'
  when 'beauty' then 'beauty'
  when 'cosmetics' then 'beauty'
  when 'home' then 'home'
  when 'food' then 'food'
  when 'accessories' then 'accessories'
  when 'packaging' then 'packaging'
  when 'electronics' then 'electronics'
  when 'textiles' then 'textiles'
  when 'footwear' then 'footwear'
  when 'industrial' then 'industrial'
  else 'industrial'
end
where category is not null;

alter table public.suppliers add column if not exists subcategory text;
alter table public.suppliers add column if not exists on_time_rate integer;
alter table public.suppliers add column if not exists quality_rating numeric;
alter table public.suppliers add column if not exists source_type text;
alter table public.suppliers add column if not exists source_url text;
alter table public.suppliers add column if not exists verified_at timestamptz;

update public.suppliers
set
  subcategory = coalesce(
    nullif(subcategory, ''),
    nullif(products[1], ''),
    category,
    'general'
  ),
  on_time_rate = coalesce(on_time_rate, greatest(70, least(98, 100 - coalesce(risk_score, 50) / 2))),
  quality_rating = coalesce(quality_rating, rating, 4.0),
  source_type = coalesce(source_type, case when source_url is not null or website is not null then 'public_web' else 'synthetic' end),
  source_url = coalesce(source_url, website);

alter table public.suppliers alter column subcategory set default 'general';
alter table public.suppliers alter column on_time_rate set default 90;
alter table public.suppliers alter column quality_rating set default 4.0;
alter table public.suppliers alter column source_type set default 'synthetic';

alter table public.suppliers drop constraint if exists suppliers_category_check;
alter table public.suppliers
  add constraint suppliers_category_check
  check (category in ('apparel', 'beauty', 'home', 'food', 'accessories', 'packaging', 'electronics', 'textiles', 'footwear', 'industrial'));

alter table public.suppliers drop constraint if exists suppliers_region_check;
alter table public.suppliers
  add constraint suppliers_region_check
  check (region in ('South Asia', 'Southeast Asia', 'East Asia', 'Europe', 'MENA', 'Africa', 'North America', 'South America'));

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  query text not null,
  bangladesh_mode boolean not null default false,
  results jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.saved_searches add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.saved_searches add column if not exists bangladesh_mode boolean not null default false;
alter table public.saved_searches add column if not exists results jsonb not null default '[]'::jsonb;
alter table public.saved_searches add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists saved_searches_user_id_idx on public.saved_searches (user_id, created_at desc);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_select_own on public.saved_searches;
drop policy if exists saved_searches_insert_own on public.saved_searches;
drop policy if exists saved_searches_update_own on public.saved_searches;
drop policy if exists saved_searches_delete_own on public.saved_searches;

create policy saved_searches_select_own on public.saved_searches for select using (auth.uid() = user_id);
create policy saved_searches_insert_own on public.saved_searches for insert with check (auth.uid() = user_id);
create policy saved_searches_update_own on public.saved_searches for update using (auth.uid() = user_id);
create policy saved_searches_delete_own on public.saved_searches for delete using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.saved_searches to authenticated;
grant all on table public.saved_searches to service_role;

create table if not exists public.ai_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ai_cache_expires_at_idx on public.ai_cache (expires_at);

alter table public.ai_cache enable row level security;
revoke all on table public.ai_cache from anon, authenticated;
grant all on table public.ai_cache to service_role;

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
revoke all on table public.source_events from anon, authenticated;
grant all on table public.source_events to service_role;

drop function if exists public.match_suppliers(vector(1536), integer, text, double precision);
drop function if exists public.match_suppliers(vector(1536), integer, text, text, text, integer, boolean);

create function public.match_suppliers(
  query_embedding vector(1536),
  match_count integer default 20,
  filter_category text default null,
  filter_country text default null,
  filter_region text default null,
  max_risk_score integer default null,
  require_bgmea boolean default null
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
    and (filter_category is null or s.category = filter_category)
    and (filter_country is null or s.country = filter_country)
    and (filter_region is null or s.region = filter_region)
    and (max_risk_score is null or s.risk_score <= max_risk_score)
    and (require_bgmea is null or s.bgmea_certified = require_bgmea)
  order by s.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

revoke all on function public.match_suppliers(vector(1536), integer, text, text, text, integer, boolean) from anon, authenticated;
grant execute on function public.match_suppliers(vector(1536), integer, text, text, text, integer, boolean) to service_role;

-- ai_cache and source_events intentionally have no anon policies.
-- Server writes use SUPABASE_SERVICE_ROLE_KEY through lib/supabase/admin.ts.
