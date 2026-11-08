-- Migration: Create the `products` table
--
-- How to run this:
--   1. Open your Supabase project.
--   2. Go to "SQL Editor" -> "New query".
--   3. Paste the entire contents of this file and click "Run".
--
-- This migration is safe to run more than once (uses IF NOT EXISTS / OR
-- REPLACE / DROP ... IF EXISTS where appropriate).

-- gen_random_uuid() lives in pgcrypto. Supabase projects almost always have
-- it available already, but this makes the migration self-contained.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_key unique (name)
);

-- `name` has a UNIQUE constraint above so the seed script can safely upsert
-- on conflict instead of creating duplicate rows every time it is re-run.

-- Speeds up "browse by category" queries, e.g. GET /api/products?category=...
create index if not exists idx_products_category on public.products (category);

-- Speeds up the default listing query: active products, newest first.
create index if not exists idx_products_active_created_at
  on public.products (is_active, created_at desc);

-- Keep `updated_at` current whenever a product row is modified.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_set_updated_at on public.products;

create trigger trg_products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enabling RLS means NO access is allowed by default until a policy grants
-- it. This keeps the table safe even though we query it with the public
-- (anon/publishable) key from the backend.
alter table public.products enable row level security;

-- Allow anyone — including unauthenticated/public requests made with the
-- anon/publishable key — to SELECT only the rows where is_active = true.
-- There are intentionally no INSERT/UPDATE/DELETE policies for the public
-- role, so those actions remain denied. Product management should be done
-- by project maintainers directly in Supabase (SQL editor / table editor),
-- not through this public-facing API.
drop policy if exists "Public can read active products" on public.products;

create policy "Public can read active products"
  on public.products
  for select
  using (is_active = true);
