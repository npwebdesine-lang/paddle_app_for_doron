-- Padel League — team selection on registration.
-- Run this once in the Supabase SQL Editor (after the initial migration).
-- Safe to run more than once.

-- 1) Create the profile on sign-up, including the team the player picked.
--    - team_id is only accepted if it matches an existing team (no cast errors
--      on garbage input, no foreign-key failures that would block sign-up).
--    - level is filled from the team by the profiles_b_sync_level trigger, and
--      the player is auto-enrolled in the team's upcoming practices by the
--      profiles_enrol_in_team_practices trigger.
--    - role always starts as 'player'; only an admin can promote.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_full_name text;
  v_team_id   uuid;
begin
  v_full_name := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);

  select t.id into v_team_id
  from public.teams t
  where t.id::text = nullif(trim(new.raw_user_meta_data ->> 'team_id'), '');

  insert into public.profiles (id, full_name, team_id)
  values (new.id, v_full_name, v_team_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2) Let signed-out visitors read the team list (for the registration dropdown).
grant select on public.teams to anon;

drop policy if exists "Teams are readable by visitors for registration" on public.teams;
create policy "Teams are readable by visitors for registration"
  on public.teams for select to anon using (true);
