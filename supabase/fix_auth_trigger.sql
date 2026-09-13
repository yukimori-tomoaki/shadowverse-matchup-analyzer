-- Run this migration if Auth shows: Database error saving new user
create or replace function public.create_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace uuid;
begin
  insert into public.workspaces (name, owner_id)
  values ('My Matchup Workspace', new.id)
  returning id into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace, new.id, 'owner');

  return new;
exception when others then
  raise warning 'Default workspace provisioning failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_default_workspace();
