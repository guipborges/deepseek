create extension if not exists pgcrypto;

-- users.id mirrors auth.users.id from Supabase Auth (same UUID).
-- Authentication is delegated to Supabase Auth. The extension receives the
-- Supabase session through the Cloudflare Worker callback page.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan text not null default 'trial' check (plan in ('trial', 'pro', 'expired')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'lemon_squeezy',
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null,
  renews_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  month text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  translation_count integer not null default 0,
  details_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day text not null,
  translation_count integer not null default 0,
  details_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists public.translation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_type text not null check (request_type in ('translate', 'word_details')),
  source_language text,
  target_language text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_monthly_user_month_idx on public.usage_monthly(user_id, month);
create index if not exists usage_daily_user_day_idx on public.usage_daily(user_id, day);
create index if not exists translation_logs_user_created_idx on public.translation_logs(user_id, created_at desc);
