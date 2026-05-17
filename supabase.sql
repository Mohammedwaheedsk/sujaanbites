create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  description text not null,
  price integer not null,
  category text not null,
  image text not null default '',
  available boolean not null default true,
  stock_count integer not null default 20,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  customer_phone text not null,
  status text not null,
  admin_status text not null,
  payment_method text not null,
  payment_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

alter table public.orders
  add column if not exists customer_phone text,
  add column if not exists status text,
  add column if not exists admin_status text,
  add column if not exists payment_method text,
  add column if not exists payment_status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists payload jsonb;

update public.orders
set
  customer_phone = coalesce(customer_phone, ''),
  status = coalesce(status, 'pending_admin_acceptance'),
  admin_status = coalesce(admin_status, 'pending'),
  payment_method = coalesce(payment_method, 'prepaid'),
  payment_status = coalesce(payment_status, 'pending'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now()),
  payload = coalesce(payload, jsonb_build_object('id', id));

create index if not exists orders_customer_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.menu_items
  add column if not exists stock_count integer not null default 20;

update public.menu_items
set
  stock_count = case
    when stock_count is null or stock_count <= 0 then 20
    else stock_count
  end;

alter table public.menu_items
  alter column stock_count set default 20;

create table if not exists public.customers (
  phone text primary key,
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists customers_updated_at_idx on public.customers (updated_at desc);

-- This app uses the Supabase service-role key on the backend.
-- Keep RLS disabled for these tables unless you later add public client access policies.
