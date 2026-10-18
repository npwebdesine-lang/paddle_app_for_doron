import { startOfDay, subDays } from 'date-fns'
import { BarChart3, CalendarDays, Loader2, Radio, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/auth'
import { useNow } from '../hooks/useNow'
import { useRealtimePractices } from '../hooks/useRealtimePractices'
import { supabase } from '../lib/supabase'
import { cn, errorMessage } from '../lib/utils'
import type { Team } from '../types/database.types'
import AdminCalendar from './admin/AdminCalendar'
import Reports from './admin/Reports'
import TeamsAndUsers from './admin/TeamsAndUsers'
import ProfileStatus from './ProfileStatus'

/** How far back the admin views (past calendar, reports) look. */
const HISTORY_DAYS = 90

const TABS = [
  { id: 'calendar', label: 'לוח אימונים', icon: CalendarDays },
  { id: 'teams', label: 'קבוצות ומשתמשים', icon: Users },
  { id: 'reports', label: 'דוחות', icon: BarChart3 },
] as const

type Tab = (typeof TABS)[number]['id']

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('level').order('name')
  if (error) throw error
  return data ?? []
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const now = useNow()
  const [tab, setTab] = useState<Tab>('calendar')
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [from] = useState(() => subDays(startOfDay(new Date()), HISTORY_DAYS))
  const range = useMemo(() => ({ from }), [from])
  const { practices, loading, error, live, refetch } = useRealtimePractices(range, 'admin-dashboard')

  useEffect(() => {
    let active = true
    fetchTeams()
      .then((list) => {
        if (active) setTeams(list)
      })
      .catch((err) => {
        if (active) setTeamsError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [])

  const reloadTeams = useCallback(async () => {
    try {
      setTeams(await fetchTeams())
      setTeamsError(null)
    } catch (err) {
      setTeamsError(errorMessage(err))
    }
  }, [])

  if (!profile) return <ProfileStatus />

  const upcoming = practices.filter((p) => new Date(p.scheduled_at) > now).length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">לוח בקרה לרכז</h1>
          <p className="text-sm text-slate-500">
            {teams.length} קבוצות · {upcoming} אימונים קרובים
          </p>
        </div>
        <span className={cn('flex items-center gap-1 text-xs font-medium', live ? 'text-emerald-600' : 'text-slate-400')}>
          <Radio className="h-3.5 w-3.5" />
          {live ? 'מתעדכן בזמן אמת' : 'מתחבר…'}
        </span>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {teamsError && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">שגיאה בטעינת הקבוצות: {teamsError}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : tab === 'calendar' ? (
        <AdminCalendar practices={practices} teams={teams} profile={profile} now={now} onChanged={refetch} />
      ) : tab === 'teams' ? (
        <TeamsAndUsers teams={teams} currentUserId={profile.id} onTeamsChanged={reloadTeams} />
      ) : (
        <Reports practices={practices} teams={teams} now={now} />
      )}
    </div>
  )
}
