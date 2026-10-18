-- Padel League Management System — initial schema
-- Teams, profiles (player / captain / admin), practices and participations,
-- with RLS and Realtime.

create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.league_level as enum ('top', 'bottom', 'reserve');
create type public.practice_status as enum ('scheduled', 'at_risk', 'cancelled', 'completed');
create type public.participation_role as enum ('regular', 'substitute');
create type public.participation_status as enum ('attending', 'absent');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.teams (
  id          uuid primary key default extensions.uuid_generate_v4(),
  name        text not null unique,
  level       public.league_level not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'player' check (role in ('player', 'captain', 'admin')),
  team_id     uuid references public.teams (id) on delete set null,
  level       public.league_level,           -- synced from the team
  created_at  timestamptz not null default now()
);
create index profiles_team_id_idx on public.profiles (team_id);

create table public.practices (
  id                uuid primary key default extensions.uuid_generate_v4(),
  team_id           uuid references public.teams (id) on delete set null,
  level             public.league_level not null, -- synced from the team when set
  scheduled_at      timestamptz not null,
  duration_minutes  integer not null default 90 check (duration_minutes between 15 and 480),
  location          text,
  max_players       integer not null default 6 check (max_players between 1 and 12),
  status            public.practice_status not null default 'scheduled',
  has_coach         boolean,                     -- null = not reported yet
  notes             text,
  created_at        timestamptz not null default now()
);
create index practices_scheduled_at_idx on public.practices (scheduled_at);
create index practices_level_scheduled_at_idx on public.practices (level, scheduled_at);
create index practices_team_id_idx on public.practices (team_id);

create table public.participations (
  id           uuid primary key default extensions.uuid_generate_v4(),
  practice_id  uuid not null references public.practices (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  role_type    public.participation_role not null default 'regular',
  status       public.participation_status not null default 'attending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (practice_id, profile_id)
);
create index participations_profile_id_idx on public.participations (profile_id);

-- ---------------------------------------------------------------------------
-- Helper functions (used by RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_user_team()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select team_id from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_user_level()
returns public.league_level
language sql stable security definer set search_path = ''
as $$
  select level from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false);
$$;

create or replace function public.attending_count(p_practice_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.participations
  where practice_id = p_practice_id and status = 'attending';
$$;

-- Admin-only: profiles joined with their login email.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  team_id uuid,
  level public.league_level,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list users' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.team_id, p.level, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.full_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Column guards: non-admin users may only change specific columns.
-- Applies to API requests (role "authenticated"); triggers running as the
-- table owner, the service role and the dashboard are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin()
     and (to_jsonb(new) - 'full_name' - 'phone' - 'level') <> (to_jsonb(old) - 'full_name' - 'phone' - 'level') then
    raise exception 'You can only change your name and phone' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_a_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_practice_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin()
     and (to_jsonb(new) - 'has_coach') <> (to_jsonb(old) - 'has_coach') then
    raise exception 'Captains can only report whether there was a coach' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger practices_a_guard
  before update on public.practices
  for each row execute function public.guard_practice_update();

create or replace function public.guard_participation_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin()
     and (to_jsonb(new) - 'status' - 'updated_at') <> (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'You can only change your attendance status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger participations_a_guard
  before update on public.participations
  for each row execute function public.guard_participation_update();

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile on sign-up. New users are players with no team until an
-- admin assigns one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.level in sync with the team's level.
create or replace function public.sync_profile_level()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.level := (select level from public.teams where id = new.team_id);
  return new;
end;
$$;

create trigger profiles_b_sync_level
  before insert or update on public.profiles
  for each row execute function public.sync_profile_level();

-- When a player joins/changes team, enrol them as a regular in the team's
-- upcoming practices (and drop their regular spots in the old team's).
create or replace function public.enrol_profile_in_team_practices()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.team_id is distinct from new.team_id and old.team_id is not null then
    delete from public.participations pa
    using public.practices pr
    where pa.practice_id = pr.id
      and pa.profile_id = new.id
      and pa.role_type = 'regular'
      and pr.team_id = old.team_id
      and pr.scheduled_at > now();
  end if;

  if new.team_id is not null and (tg_op = 'INSERT' or old.team_id is distinct from new.team_id) then
    insert into public.participations (practice_id, profile_id, role_type, status)
    select pr.id, new.id, 'regular', 'attending'
    from public.practices pr
    where pr.team_id = new.team_id
      and pr.scheduled_at > now()
      and pr.status in ('scheduled', 'at_risk')
    on conflict (practice_id, profile_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger profiles_enrol_in_team_practices
  after insert or update of team_id on public.profiles
  for each row execute function public.enrol_profile_in_team_practices();

-- Keep practices.level in sync with the team's level.
create or replace function public.sync_practice_level()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.team_id is not null then
    select level into new.level from public.teams where id = new.team_id;
  end if;
  return new;
end;
$$;

create trigger practices_b_sync_level
  before insert or update of team_id on public.practices
  for each row execute function public.sync_practice_level();

-- New practice: every team member is a regular, assumed attending.
create or replace function public.enrol_team_in_new_practice()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.team_id is not null then
    insert into public.participations (practice_id, profile_id, role_type, status)
    select new.id, p.id, 'regular', 'attending'
    from public.profiles p
    where p.team_id = new.team_id
    on conflict (practice_id, profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger practices_enrol_team
  after insert on public.practices
  for each row execute function public.enrol_team_in_new_practice();

-- Capacity guard: claiming a spot (substitute insert, or switching back to
-- attending) locks the practice row so two players can't take the last spot.
create or replace function public.enforce_practice_capacity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_practice public.practices%rowtype;
  v_count    integer;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  if new.status = 'attending' and (
       (tg_op = 'INSERT' and new.role_type = 'substitute')
    or (tg_op = 'UPDATE' and old.status <> 'attending')
  ) then
    select * into v_practice from public.practices where id = new.practice_id for update;

    if v_practice.status in ('cancelled', 'completed') then
      raise exception 'This practice is no longer open' using errcode = 'P0001';
    end if;

    if v_practice.scheduled_at <= now() then
      raise exception 'This practice has already started' using errcode = 'P0001';
    end if;

    select count(*) into v_count
    from public.participations
    where practice_id = new.practice_id and status = 'attending' and id <> new.id;

    if v_count >= v_practice.max_players then
      raise exception 'This practice is already full' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger participations_b_enforce_capacity
  before insert or update of status on public.participations
  for each row execute function public.enforce_practice_capacity();

-- If an at-risk practice gets back to 4+ attending players, clear the flag.
create or replace function public.recover_at_risk_practice()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.practices
  set status = 'scheduled'
  where id = new.practice_id
    and status = 'at_risk'
    and public.attending_count(new.practice_id) >= 4;
  return new;
end;
$$;

create trigger participations_recover_at_risk
  after insert or update of status on public.participations
  for each row execute function public.recover_at_risk_practice();

-- Trigger functions are not meant to be called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_profile_level() from public, anon, authenticated;
revoke execute on function public.enrol_profile_in_team_practices() from public, anon, authenticated;
revoke execute on function public.sync_practice_level() from public, anon, authenticated;
revoke execute on function public.enrol_team_in_new_practice() from public, anon, authenticated;
revoke execute on function public.enforce_practice_capacity() from public, anon, authenticated;
revoke execute on function public.recover_at_risk_practice() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.guard_practice_update() from public, anon, authenticated;
revoke execute on function public.guard_participation_update() from public, anon, authenticated;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_team() from public, anon;
revoke execute on function public.current_user_level() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.attending_count(uuid) from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_team() to authenticated;
grant execute on function public.current_user_level() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.attending_count(uuid) to authenticated;
grant execute on function public.admin_list_users() to authenticated;

-- Signed-out visitors get nothing.
revoke all on public.teams, public.profiles, public.practices, public.participations from anon;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.teams          enable row level security;
alter table public.profiles       enable row level security;
alter table public.practices      enable row level security;
alter table public.participations enable row level security;

-- Admins: full access to everything.
create policy "Admins have full access to teams"
  on public.teams for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins have full access to profiles"
  on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins have full access to practices"
  on public.practices for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins have full access to participations"
  on public.participations for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Everyone signed in can read the league.
create policy "Teams are readable by signed-in users"
  on public.teams for select to authenticated using (true);
create policy "Profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "Practices are readable by signed-in users"
  on public.practices for select to authenticated using (true);
create policy "Participations are readable by signed-in users"
  on public.participations for select to authenticated using (true);

-- Players/captains: edit their own name/phone (role/team are guarded).
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Players/captains: change their own attendance status.
create policy "Users update their own participation status"
  on public.participations for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Players/captains: join a same-level practice as a substitute when spots are open.
create policy "Same-level players join as substitutes when spots are open"
  on public.participations for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and role_type = 'substitute'
    and status = 'attending'
    and exists (
      select 1 from public.practices pr
      where pr.id = practice_id
        and pr.level = (select public.current_user_level())
        and pr.status in ('scheduled', 'at_risk')
        and pr.scheduled_at > now()
        and public.attending_count(pr.id) < pr.max_players
    )
  );

-- Captains: report has_coach for their own team's practices once they've ended
-- (the guard trigger restricts the update to the has_coach column).
create policy "Captains report coach attendance for their team"
  on public.practices for update to authenticated
  using (
    (select public.current_user_role()) = 'captain'
    and team_id = (select public.current_user_team())
    and scheduled_at + make_interval(mins => duration_minutes) <= now()
  )
  with check (
    (select public.current_user_role()) = 'captain'
    and team_id = (select public.current_user_team())
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.participations;
alter publication supabase_realtime add table public.practices;
