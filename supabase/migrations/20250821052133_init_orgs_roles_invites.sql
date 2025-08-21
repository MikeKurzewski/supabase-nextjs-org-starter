-- Enable UUID helper if needed (safe to re-run)
create extension if not exists "pgcrypto";

-- 1) Roles enum (idempotent create)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'org_role' and n.nspname = 'public'
  ) then
    create type public.org_role as enum ('admin','member');
  end if;
end
$$ language plpgsql;

-- 2) Organizations
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 3) Profiles (mirror of auth.users; keep simple)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4) Organization membership
create table if not exists public.organization_members (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.org_role not null default 'member',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- 5) Helper predicates (SECURITY DEFINER to avoid policy recursion)
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = org
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- 6) RLS + Policies
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;

-- organizations
drop policy if exists "orgs: read my orgs" on public.organizations;
create policy "orgs: read my orgs"
on public.organizations
for select
using (public.is_org_member(id));

drop policy if exists "orgs: create" on public.organizations;
create policy "orgs: create"
on public.organizations
for insert
with check (created_by = auth.uid());

drop policy if exists "orgs: update" on public.organizations;
create policy "orgs: update"
on public.organizations
for update
using (public.is_org_admin(id))
with check (true);

drop policy if exists "orgs: delete" on public.organizations;
create policy "orgs: delete"
on public.organizations
for delete
using (public.is_org_admin(id));

-- organization_members
drop policy if exists "members: read members of my orgs" on public.organization_members;
create policy "members: read members of my orgs"
on public.organization_members
for select
using ( public.is_org_member(org_id) );

drop policy if exists "members: admin can insert" on public.organization_members;
create policy "members: admin can insert"
on public.organization_members
for insert
with check ( public.is_org_admin(org_id) );

drop policy if exists "members: admin can update" on public.organization_members;
create policy "members: admin can update"
on public.organization_members
for update
using ( public.is_org_admin(org_id) )
with check ( true );

drop policy if exists "members: admin can delete" on public.organization_members;
create policy "members: admin can delete"
on public.organization_members
for delete
using ( public.is_org_admin(org_id) );

-- profiles (read yourself; relax later if desired)
drop policy if exists "profiles: read self" on public.profiles;
create policy "profiles: read self"
on public.profiles
for select
using ( id = auth.uid() );

-- 7) Invites
create table if not exists public.org_invites (
  token       uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  role        public.org_role not null default 'member',
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

alter table public.org_invites enable row level security;

drop policy if exists "invites: read my org" on public.org_invites;
create policy "invites: read my org"
on public.org_invites
for select
using ( public.is_org_admin(org_id) );

-- RPC: create org (caller becomes admin)
create or replace function public.create_org_with_admin(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_org uuid;
begin
  insert into public.organizations (name, created_by)
  values (org_name, auth.uid())
  returning id into new_org;

  insert into public.organization_members (org_id, user_id, role)
  values (new_org, auth.uid(), 'admin');

  return new_org;
end $$;

revoke all on function public.create_org_with_admin(text) from public;
grant execute on function public.create_org_with_admin(text) to authenticated;

-- RPC: create invite (admin-only)
create or replace function public.create_org_invite(
  p_org_id uuid,
  p_email  text,
  p_role   public.org_role default 'member',
  p_expires_at timestamptz default (now() + interval '7 days')
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_token uuid;
begin
  if not public.is_org_admin(p_org_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.org_invites (org_id, email, role, invited_by, expires_at)
  values (p_org_id, lower(p_email), p_role, auth.uid(), p_expires_at)
  returning token into v_token;

  return v_token;
end $$;

revoke all on function public.create_org_invite(uuid, text, public.org_role, timestamptz) from public;
grant execute on function public.create_org_invite(uuid, text, public.org_role, timestamptz) to authenticated;

-- RPC: accept invite
create or replace function public.accept_org_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid;
declare v_role   public.org_role;
declare v_email  text;
declare v_user_id uuid;
declare v_user_email text;
begin
  select i.org_id, i.role, i.email
    into v_org_id, v_role, v_email
  from public.org_invites i
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();

  if not found then
    raise exception 'Invite not found or expired';
  end if;

  select u.id, u.email
    into v_user_id, v_user_email
  from auth.users u
  where u.id = auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if lower(v_user_email) <> lower(v_email) then
    raise exception 'Invite email does not match signed-in user';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org_id, v_user_id, v_role)
  on conflict (org_id, user_id) do nothing;

  update public.org_invites
     set accepted_at = now()
   where token = p_token;

  return v_org_id;
end $$;

revoke all on function public.accept_org_invite(uuid) from public;
grant execute on function public.accept_org_invite(uuid) to authenticated;
