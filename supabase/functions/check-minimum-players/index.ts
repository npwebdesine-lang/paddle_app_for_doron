// The 4-Day Rule: any practice exactly 4 days from today (league timezone)
// with fewer than 4 attending players is marked 'at_risk'.
//
// Deploy:   npx supabase functions deploy check-minimum-players
// Schedule: see README.md (pg_cron + pg_net, once a day).

import { createClient } from 'npm:@supabase/supabase-js@2'

const DAYS_AHEAD = 4
const MIN_PLAYERS = 4
const TIMEZONE = Deno.env.get('LEAGUE_TIMEZONE') ?? 'Asia/Jerusalem'

/** YYYY-MM-DD for a moment, as seen in the league's timezone. */
function localDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const targetDate = localDate(new Date(now + DAYS_AHEAD * day))

  // Fetch a window wide enough to cover the whole target day in any timezone,
  // then keep only practices whose local date is the target date.
  const { data: candidates, error } = await supabase
    .from('practices')
    .select('id, scheduled_at, status, participations(status)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date(now + (DAYS_AHEAD - 2) * day).toISOString())
    .lte('scheduled_at', new Date(now + (DAYS_AHEAD + 2) * day).toISOString())

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const checked = (candidates ?? []).filter((p) => localDate(new Date(p.scheduled_at)) === targetDate)

  const atRisk = checked
    .map((p) => ({
      id: p.id,
      attending: (p.participations ?? []).filter((x: { status: string }) => x.status === 'attending').length,
    }))
    .filter((p) => p.attending < MIN_PLAYERS)

  if (atRisk.length > 0) {
    const { error: updateError } = await supabase
      .from('practices')
      .update({ status: 'at_risk' })
      .in('id', atRisk.map((p) => p.id))

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }
  }

  return Response.json({
    target_date: targetDate,
    timezone: TIMEZONE,
    checked: checked.length,
    marked_at_risk: atRisk,
  })
})
