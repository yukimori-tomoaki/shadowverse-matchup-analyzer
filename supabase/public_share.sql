-- Run this migration for existing Supabase projects to enable public matchup URLs.
create table if not exists public.public_shares (
  token text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_publications (
  token text primary key,
  records jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.public_shares enable row level security;
alter table public.guest_publications enable row level security;

drop policy if exists "anyone can view enabled public shares" on public.public_shares;
drop policy if exists "editors can create public shares" on public.public_shares;
drop policy if exists "editors can update public shares" on public.public_shares;
drop policy if exists "editors can delete public shares" on public.public_shares;
drop policy if exists "anyone can view publicly shared matches" on public.matches;
create policy "editors can create public shares" on public.public_shares for insert with check (public.is_workspace_editor(workspace_id));
create policy "editors can update public shares" on public.public_shares for update using (public.is_workspace_editor(workspace_id));
create policy "editors can delete public shares" on public.public_shares for delete using (public.is_workspace_editor(workspace_id));
create policy "anyone can view publicly shared matches" on public.matches for select using (exists (select 1 from public.public_shares where public_shares.workspace_id = matches.workspace_id and public_shares.enabled = true));

create or replace function public.get_public_matches(public_token text)
returns setof public.matches
language sql
security definer
set search_path = public
as $$
  select matches.*
  from public.matches
  where exists (select 1 from public.public_shares where token = public_token and enabled = true and workspace_id = matches.workspace_id)
  order by matches.date desc;
$$;

revoke all on function public.get_public_matches(text) from public;
grant execute on function public.get_public_matches(text) to anon, authenticated;

create or replace function public.create_guest_publication(public_token text, public_records jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(public_token) < 24 or length(public_token) > 80 then raise exception 'Invalid publication token'; end if;
  if jsonb_typeof(public_records) <> 'array' or jsonb_array_length(public_records) = 0 or jsonb_array_length(public_records) > 5000 then raise exception 'Invalid record count'; end if;
  insert into public.guest_publications (token, records) values (public_token, public_records);
end;
$$;

create or replace function public.get_guest_publication(public_token text)
returns table (id text, date text, display_date text, my_deck text, opponent_deck text, turn text, result text, memo text)
language sql security definer set search_path = public as $$
  select item->>'id', item->>'date', coalesce(item->>'displayDate', ''), item->>'myDeck', item->>'opponentDeck', coalesce(item->>'turn', '不明'), item->>'result', coalesce(item->>'memo', '')
  from public.guest_publications publication, jsonb_array_elements(publication.records) item
  where publication.token = public_token;
$$;

revoke all on function public.create_guest_publication(text, jsonb) from public;
grant execute on function public.create_guest_publication(text, jsonb) to anon, authenticated;
revoke all on function public.get_guest_publication(text) from public;
grant execute on function public.get_guest_publication(text) to anon, authenticated;