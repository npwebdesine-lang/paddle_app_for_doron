import { startOfDay, subDays } from 'date-fns'
import { CalendarDays, ClipboardCheck, Loader2, Radio, Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../context/auth'
import { useNow } from '../hooks/useNow'
import { useRealtimePractices } from '../hooks/useRealtimePractices'
import { attendingCount, cn, LEVEL_LABELS, practiceEnd } from '../lib/utils'
import type { PracticeWithDetails } from '../types/database.types'
import PracticeCard from './PracticeCard'
import ProfileStatus from './ProfileStatus'

/** Captains see their team's practices from this many days back, to report coach attendance. */
const SUMMARY_DAYS = 14

function Section({
  icon,
  title,
  subtitle,
  empty,
  children,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  empty: string
  children: ReactNode[]
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</span>
        <div>
          <h2 className="text-lg leading-tight font-semibold">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      )}
    </section>
  )
}

export default function PlayerDashboard() {
  const { profile } = useAuth()
  const now = useNow()
  const [from] = useState(() => subDays(startOfDay(new Date()), SUMMARY_DAYS))
  const range = useMemo(() => ({ from }), [from])
  const { practices, loading, error, live, refetch } = useRealtimePractices(range, 'player-dashboard')

  const { myPractices, openSpots, toReport } = useMemo(() => {
    const empty: PracticeWithDetails[] = []
    if (!profile) return { myPractices: empty, openSpots: empty, toReport: empty }
    const upcoming = practices.filter((p) => practiceEnd(p) > now && p.status !== 'completed')
    const isMine = (p: PracticeWithDetails) =>
      (profile.team_id !== null && p.team_id === profile.team_id) ||
      p.participations.some((x) => x.profile_id === profile.id)

    return {
      myPractices: upcoming.filter(isMine),
      openSpots: upcoming.filter(
        (p) =>
          !isMine(p) &&
          p.level === profile.level &&
          p.status !== 'cancelled' &&
          new Date(p.scheduled_at) > now &&
          attendingCount(p) < p.max_players,
      ),
      toReport:
        profile.role === 'captain'
          ? practices
              .filter((p) => p.team_id === profile.team_id && p.status !== 'cancelled' && practiceEnd(p) <= now)
              .reverse()
          : empty,
    }
  }, [practices, profile, now])

  if (!profile) return <ProfileStatus />

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  const levelLabel = profile.level ? LEVEL_LABELS[profile.level] : ''
  const card = (p: PracticeWithDetails) => (
    <PracticeCard key={p.id} practice={p} profile={profile} now={now} onChanged={refetch} />
  )

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">שלום{profile.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}!</h1>
          <p className="text-sm text-slate-500">
            {profile.teams ? `${profile.teams.name} · רמה ${levelLabel}` : 'עדיין ללא קבוצה'}
          </p>
        </div>
        <span className={cn('flex items-center gap-1 text-xs font-medium', live ? 'text-emerald-600' : 'text-slate-400')}>
          <Radio className="h-3.5 w-3.5" />
          {live ? 'מתעדכן בזמן אמת' : 'מתחבר…'}
        </span>
      </div>

      {!profile.team_id && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          עדיין לא שובצת לקבוצה. רכז הליגה ישבץ אותך בקרוב.
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <Section
        icon={<CalendarDays className="h-4 w-4" />}
        title="האימונים שלי"
        subtitle="האימונים הקרובים של הקבוצה שלך. את/ה רשום/ה אלא אם סימנת שלא תגיע/י."
        empty="אין אימונים קרובים לקבוצה שלך."
      >
        {myPractices.map(card)}
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="מקומות פנויים"
        subtitle={`אימונים של קבוצות אחרות ברמה ${levelLabel} עם מקומות פנויים. כל הקודם זוכה.`}
        empty="אין כרגע מקומות פנויים ברמה שלך."
      >
        {openSpots.map(card)}
      </Section>

      {profile.role === 'captain' && (
        <Section
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="סיכומי אימונים"
          subtitle={`אימוני הקבוצה מ-${SUMMARY_DAYS} הימים האחרונים. דווחו אם היה מאמן.`}
          empty="אין אימונים שהסתיימו לדיווח."
        >
          {toReport.map(card)}
        </Section>
      )}
    </div>
  )
}
