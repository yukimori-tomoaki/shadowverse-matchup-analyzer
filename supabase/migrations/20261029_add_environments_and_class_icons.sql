-- ==============================================================================
-- Migration: Add Environments and Class Icon Settings
-- Date: 2026-10-29
-- Description:
--   1. matchup_environments table for managing Shadowverse game environments
--   2. class_icon_settings table for managing class icon images in Supabase Storage
--   3. Storage bucket setup and RLS policies
-- ==============================================================================

-- 1. Game Environments Table
create table if not exists public.matchup_environments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date text not null, -- 'YYYY-MM-DD'
  end_date text,           -- 'YYYY-MM-DD', null means current/ongoing
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_environment_dates check (end_date is null or start_date <= end_date)
);

create index if not exists idx_matchup_environments_dates
  on public.matchup_environments (start_date, end_date);

create index if not exists idx_matchup_environments_is_default
  on public.matchup_environments (is_default);

-- Enable RLS for matchup_environments
alter table public.matchup_environments enable row level security;

-- Public can view all environments
drop policy if exists "anyone can view environments" on public.matchup_environments;
create policy "anyone can view environments"
  on public.matchup_environments for select using (true);

-- Authenticated users or editors can insert/update/delete environments
drop policy if exists "authenticated users can insert environments" on public.matchup_environments;
create policy "authenticated users can insert environments"
  on public.matchup_environments for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "authenticated users can update environments" on public.matchup_environments;
create policy "authenticated users can update environments"
  on public.matchup_environments for update
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "authenticated users can delete environments" on public.matchup_environments;
create policy "authenticated users can delete environments"
  on public.matchup_environments for delete
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Helper function to ensure only one environment is set as default
create or replace function public.set_default_environment(target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.matchup_environments set is_default = false where id <> target_id;
  update public.matchup_environments set is_default = true, updated_at = now() where id = target_id;
end;
$$;

revoke all on function public.set_default_environment(uuid) from public;
grant execute on function public.set_default_environment(uuid) to anon, authenticated;


-- 2. Class Icon Settings Table
create table if not exists public.class_icon_settings (
  class_key text primary key,
  class_name text not null,
  storage_path text not null,
  public_url text not null,
  updated_at timestamptz not null default now()
);

-- Enable RLS for class_icon_settings
alter table public.class_icon_settings enable row level security;

-- Anyone can read class icon settings
drop policy if exists "anyone can view class icons" on public.class_icon_settings;
create policy "anyone can view class icons"
  on public.class_icon_settings for select using (true);

-- Authenticated users can modify class icon settings
drop policy if exists "authenticated users can insert class icons" on public.class_icon_settings;
create policy "authenticated users can insert class icons"
  on public.class_icon_settings for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "authenticated users can update class icons" on public.class_icon_settings;
create policy "authenticated users can update class icons"
  on public.class_icon_settings for update
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

drop policy if exists "authenticated users can delete class icons" on public.class_icon_settings;
create policy "authenticated users can delete class icons"
  on public.class_icon_settings for delete
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');


-- 3. Supabase Realtime Registration
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'matchup_environments'
  ) then
    alter publication supabase_realtime add table public.matchup_environments;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'class_icon_settings'
  ) then
    alter publication supabase_realtime add table public.class_icon_settings;
  end if;
end
$$;


-- 4. Storage Bucket Setup (class-icons)
-- Note: In Supabase, buckets are created in storage.buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'class-icons',
  'class-icons',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Storage Policies
drop policy if exists "Public Access for class-icons" on storage.objects;
create policy "Public Access for class-icons"
  on storage.objects for select
  using (bucket_id = 'class-icons');

drop policy if exists "Authenticated insert for class-icons" on storage.objects;
create policy "Authenticated insert for class-icons"
  on storage.objects for insert
  with check (bucket_id = 'class-icons' and (auth.role() = 'authenticated' or auth.role() = 'service_role'));

drop policy if exists "Authenticated update for class-icons" on storage.objects;
create policy "Authenticated update for class-icons"
  on storage.objects for update
  using (bucket_id = 'class-icons' and (auth.role() = 'authenticated' or auth.role() = 'service_role'));

drop policy if exists "Authenticated delete for class-icons" on storage.objects;
create policy "Authenticated delete for class-icons"
  on storage.objects for delete
  using (bucket_id = 'class-icons' and (auth.role() = 'authenticated' or auth.role() = 'service_role'));
