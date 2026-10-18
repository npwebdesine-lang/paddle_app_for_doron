# Padel League

Practice scheduling for the league. Regular players mark themselves absent, same-level players claim open spots as substitutes, captains report whether a coach showed up, and practices with fewer than 4 players 4 days ahead are flagged "At risk".

Stack: React + TypeScript + Vite, Tailwind CSS v4, React Router, Supabase (Postgres, Auth, Realtime, Edge Functions).

## Setup

1. `.env.local` must contain the project URL and anon/publishable key (Supabase dashboard → Project Settings → API).
2. Apply the schema: run `supabase/migrations/20261018000000_init_padel_league.sql` in the SQL Editor, or `npx supabase db push`.
3. Optional: run `supabase/seed.sql` to create 8 placeholder teams, then rename them. Admins can also create teams in the app.
4. `npm install`, then `npm run dev`.
5. Register your own account in the app, then make yourself the first admin in the SQL Editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   From then on, admins assign every other user's team and role from **Admin → Teams & Users**.

## Roles

| Role | Lands on | Can do |
|---|---|---|
| **Admin** (coordinator) | `/admin` | Everything: add, edit and cancel practices (including weekly repeats), manage teams, assign users to teams and roles, view reports and export them to CSV. Can open the player view too. |
| **Captain** | `/practices` | Everything a player can, plus a **Practice Summary** button on their team's finished practices to report "Was there a coach? Yes/No" (`practices.has_coach`). |
| **Player** | `/practices` | **My Practices**: their team's upcoming practices, with **Mark Absent**. **Open Spots**: other same-level practices with free spots, with **Join as Substitute**. |

New sign-ups are players with no team until an admin assigns one.

## How it works

- **Teams & levels:** each team has a level (`top`, `bottom`, `reserve`). A player's level comes from their team.
- **Practices:** when an admin creates a practice for a team, every team member is added as a `regular`, `attending` participant. Players added to a team later are enrolled in its upcoming practices.
- **Substitutes:** a database trigger locks the practice row while a spot is claimed, so two players can't take the last spot at the same time.
- **Permissions:** RLS controls which rows each user can touch. Guard triggers control which columns non-admins can change: players can only change their own `participations.status`, and captains only `practices.has_coach`, on their own team's practices after the practice has ended.
- **4-Day Rule:** the `check-minimum-players` edge function marks practices 4 days out with fewer than 4 attending players as `at_risk`. When attendance goes back to 4 or more, a trigger resets the status to `scheduled`.
- **Realtime:** both dashboards subscribe to `participations` and `practices`, so open spots and attendance update instantly on every screen.

## Schedule the 4-Day Rule

```bash
npx supabase functions deploy check-minimum-players
```

Then run this once in the SQL Editor (it needs the `pg_cron` and `pg_net` extensions) to call the function daily at 08:00 UTC:

```sql
select cron.schedule(
  'check-minimum-players',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://aekbbpqyqzntymvpuown.supabase.co/functions/v1/check-minimum-players',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>')
  );
  $$
);
```

The function uses the `Asia/Jerusalem` timezone by default. To change it, set the `LEAGUE_TIMEZONE` secret.

## Deploying the frontend

This is a single-page app with client-side routes (`/admin`, `/practices`). Configure your host to serve `index.html` for unknown paths.
