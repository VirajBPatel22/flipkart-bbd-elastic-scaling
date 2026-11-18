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


create index if not exists idx_products_category on public.products (category);


create index if not exists idx_products_active_created_at
  on public.products (is_active, created_at desc);


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


alter table public.products enable row level security;


drop policy if exists "Public can read active products" on public.products;

create policy "Public can read active products"
  on public.products
  for select
  using (is_active = true);
