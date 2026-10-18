import { format, isToday, isTomorrow } from 'date-fns'
import { AlertTriangle, CalendarDays, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { attendingCount, cn, inputClass, MIN_PLAYERS, practiceEnd } from '../../lib/utils'
import type { Profile, PracticeWithDetails, Team } from '../../types/database.types'
import PracticeCard from '../PracticeCard'
import PracticeForm from './PracticeForm'

type Props = {
  practices: PracticeWithDetails[]
  teams: Team[]
  profile: Profile
  now: Date
  onChanged: () => void
}

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEEE, d MMMM yyyy')
}

export default function AdminCalendar({ practices, teams, profile, now, onChanged }: Props) {
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming')
  const [teamFilter, setTeamFilter] = useState('')
  const [editing, setEditing] = useState<PracticeWithDetails | null>(null)
  const [adding, setAdding] = useState(false)

  const visible = useMemo(() => {
    const list = practices.filter(
      (p) => (when === 'upcoming' ? practiceEnd(p) > now : practiceEnd(p) <= now) && (!teamFilter || p.team_id === teamFilter),
    )
    return when === 'past' ? list.reverse() : list
  }, [practices, when, teamFilter, now])

  const grouped = useMemo(() => {
    const groups = new Map<string, { date: Date; items: PracticeWithDetails[] }>()
    for (const p of visible) {
      const date = new Date(p.scheduled_at)
      const key = format(date, 'yyyy-MM-dd')
      if (!groups.has(key)) groups.set(key, { date, items: [] })
      groups.get(key)!.items.push(p)
    }
    return [...groups.values()]
  }, [visible])

  const lowCount = practices.filter(
    (p) => p.status !== 'cancelled' && new Date(p.scheduled_at) > now && attendingCount(p) < MIN_PLAYERS,
  ).length

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          {(['upcoming', 'past'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWhen(w)}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium capitalize transition',
                when === w ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {w}
            </button>
          ))}
        </div>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={cn(inputClass, 'w-auto')}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {lowCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowCount} upcoming below {MIN_PLAYERS} players
          </span>
        )}
        <button
          onClick={() => setAdding(true)}
          disabled={teams.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add practice
        </button>
      </div>

      {teams.length === 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Create teams first (Teams & Users tab), then add practices.
        </p>
      )}

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-16 text-slate-500">
          <CalendarDays className="h-8 w-8" />
          <p className="text-sm">No {when} practices</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <div key={g.date.toISOString()}>
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{dayLabel(g.date)}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {g.items.map((p) => (
                  <PracticeCard key={p.id} practice={p} profile={profile} now={now} onChanged={onChanged} onEdit={setEditing} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(adding || editing) && (
        <PracticeForm
          teams={teams}
          practice={editing ?? undefined}
          onSaved={onChanged}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
