-- Development-only reset.
-- Use this while testing if the Supabase tables were created with an older schema.
-- This deletes app usage/subscription/user rows, but does not delete auth.users.

drop table if exists public.sessions cascade;
drop table if exists public.magic_links cascade;
drop table if exists public.translation_logs cascade;
drop table if exists public.usage_daily cascade;
drop table if exists public.usage_monthly cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.users cascade;
