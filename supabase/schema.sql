-- Run this once in Supabase SQL Editor.
create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Matchup Workspace',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.matches (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  date text not null,
  display_date text not null default '',
  my_deck text not null,
  opponent_deck text not null,
  turn text not null default '不明',
  result text not null check (result in ('WIN', 'LOSS')),
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.public_shares (
  token text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_publications (
  token text primary key,
  records jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guest_publications add column if not exists updated_at timestamptz not null default now();

create index if not exists matches_workspace_date_idx on public.matches(workspace_id, date desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.matches enable row level security;
alter table public.public_shares enable row level security;
alter table public.guest_publications enable row level security;
create policy "public can receive guest publication updates" on public.guest_publications for select using (true);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid());
$$;

create or replace function public.is_workspace_editor(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid() and role in ('owner', 'editor'));
$$;

create policy "members can view workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "users can create workspaces" on public.workspaces for insert with check (owner_id = auth.uid());
create policy "members can view memberships" on public.workspace_members for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy "owners can manage memberships" on public.workspace_members for all using (exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));
create policy "members can view matches" on public.matches for select using (public.is_workspace_member(workspace_id));
create policy "editors can insert matches" on public.matches for insert with check (public.is_workspace_editor(workspace_id));
create policy "editors can update matches" on public.matches for update using (public.is_workspace_editor(workspace_id));
create policy "editors can delete matches" on public.matches for delete using (public.is_workspace_editor(workspace_id));
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
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(public_token) < 24 or length(public_token) > 80 then raise exception 'Invalid publication token'; end if;
  if jsonb_typeof(public_records) <> 'array' or jsonb_array_length(public_records) = 0 or jsonb_array_length(public_records) > 5000 then raise exception 'Invalid record count'; end if;
  insert into public.guest_publications (token, records, updated_at) values (public_token, public_records, now());
end;
$$;

create or replace function public.update_guest_publication(public_token text, public_records jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(public_records) <> 'array' or jsonb_array_length(public_records) = 0 or jsonb_array_length(public_records) > 5000 then raise exception 'Invalid record count'; end if;
  update public.guest_publications set records = public_records, updated_at = now() where token = public_token;
  if not found then raise exception 'Publication not found'; end if;
end;
$$;

create or replace function public.get_guest_publication(public_token text)
returns table (id text, date text, display_date text, my_deck text, opponent_deck text, turn text, result text, memo text)
language sql
security definer
set search_path = public
as $$
  select item->>'id', item->>'date', coalesce(item->>'displayDate', ''), item->>'myDeck', item->>'opponentDeck', coalesce(item->>'turn', '不明'), item->>'result', coalesce(item->>'memo', '')
  from public.guest_publications publication, jsonb_array_elements(publication.records) item
  where publication.token = public_token;
$$;

revoke all on function public.create_guest_publication(text, jsonb) from public;
grant execute on function public.create_guest_publication(text, jsonb) to anon, authenticated;
grant execute on function public.update_guest_publication(text, jsonb) to anon, authenticated;
revoke all on function public.get_guest_publication(text) from public;
grant execute on function public.get_guest_publication(text) to anon, authenticated;

create or replace function public.create_default_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_workspace uuid;
begin
  insert into public.workspaces (name, owner_id) values ('My Matchup Workspace', new.id) returning id into new_workspace;
  insert into public.workspace_members (workspace_id, user_id, role) values (new_workspace, new.id, 'owner');
  return new;
exception when others then
  -- Workspace provisioning must not prevent the auth user from being created.
  raise warning 'Default workspace provisioning failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_default_workspace();

alter table public.matches replica identity full;
alter publication supabase_realtime add table public.matches;
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr join pg_publication p on p.oid = pr.prpubid join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'guest_publications'
  ) then alter publication supabase_realtime add table public.guest_publications; end if;
end
$$;

create table if not exists public.public_board_matches (
  id text primary key,
  date text not null,
  display_date text not null default '',
  my_deck text not null,
  opponent_deck text not null,
  turn text not null default '不明',
  result text not null check (result in ('WIN', 'LOSS')),
  memo text not null default '',
  created_at timestamptz not null default now()
);

alter table public.public_board_matches enable row level security;
create policy "public can view public board" on public.public_board_matches for select using (true);

create or replace function public.append_public_board_matches(public_records jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(public_records) <> 'array' or jsonb_array_length(public_records) = 0 or jsonb_array_length(public_records) > 5000 then raise exception 'Invalid record count'; end if;
  insert into public.public_board_matches (id, date, display_date, my_deck, opponent_deck, turn, result, memo)
  select id, date, coalesce("displayDate", ''), "myDeck", "opponentDeck", coalesce(turn, '不明'), result, coalesce(memo, '')
  from jsonb_to_recordset(public_records) as records(id text, date text, "displayDate" text, "myDeck" text, "opponentDeck" text, turn text, result text, memo text)
  on conflict (id) do nothing;
end;
$$;

create or replace function public.get_public_board_matches()
returns setof public.public_board_matches language sql security definer set search_path = public as $$
  select * from public.public_board_matches order by date desc, created_at desc;
$$;

grant execute on function public.append_public_board_matches(jsonb) to anon, authenticated;
grant execute on function public.get_public_board_matches() to anon, authenticated;
alter table public.public_board_matches replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_rel pr join pg_publication p on p.oid = pr.prpubid join pg_class c on c.oid = pr.prrelid join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime' and n.nspname = 'public' and c.relname = 'public_board_matches'
  ) then alter publication supabase_realtime add table public.public_board_matches; end if;
end
$$;
