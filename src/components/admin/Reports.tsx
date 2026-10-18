import { subDays } from 'date-fns'
import { AlertTriangle, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  attendingCount,
  cn,
  errorMessage,
  formatHe,
  LEVEL_LABELS,
  LEVEL_STYLES,
  MIN_PLAYERS,
  practiceEnd,
} from '../../lib/utils'
import type { PracticeWithDetails, Team } from '../../types/database.types'

type Props = {
  practices: PracticeWithDetails[]
  teams: Team[]
  now: Date
}

const PERIODS = [
  { days: 7, label: '7 הימים האחרונים' },
  { days: 30, label: '30 הימים האחרונים' },
  { days: 90, label: '90 הימים האחרונים' },
]

type TeamRow = {
  team: Team
  held: number
  cancelled: number
  avgAttendance: number
  belowMin: number
  coachYes: number
  coachNo: number
  coachUnreported: number
  absences: number
  substitutes: number
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function downloadCsv(rows: TeamRow[], days: number) {
  const header = [
    'קבוצה',
    'רמה',
    'אימונים שהתקיימו',
    'בוטלו',
    'ממוצע נוכחות',
    `מתחת ל-${MIN_PLAYERS} שחקנים`,
    'מאמן: כן',
    'מאמן: לא',
    'מאמן: לא דווח',
    'היעדרויות',
    'מחליפים',
  ]
  const lines = rows.map((r) =>
    [
      r.team.name,
      LEVEL_LABELS[r.team.level],
      r.held,
      r.cancelled,
      r.avgAttendance.toFixed(1),
      r.belowMin,
      r.coachYes,
      r.coachNo,
      r.coachUnreported,
      r.absences,
      r.substitutes,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  // BOM so Excel opens the Hebrew text as UTF-8.
  const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `padel-league-report-${days}d.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports({ practices, teams, now }: Props) {
  const [days, setDays] = useState(30)
  const [exportError, setExportError] = useState<string | null>(null)

  const { rows, totals, upcomingLow } = useMemo(() => {
    const since = subDays(now, days)
    const inPeriod = practices.filter((p) => new Date(p.scheduled_at) >= since && practiceEnd(p) <= now)

    const rows: TeamRow[] = teams.map((team) => {
      const mine = inPeriod.filter((p) => p.team_id === team.id)
      const held = mine.filter((p) => p.status !== 'cancelled')
      const attendance = held.map(attendingCount)
      const parts = held.flatMap((p) => p.participations)
      return {
        team,
        held: held.length,
        cancelled: mine.length - held.length,
        avgAttendance: attendance.length ? attendance.reduce((a, b) => a + b, 0) / attendance.length : 0,
        belowMin: attendance.filter((n) => n < MIN_PLAYERS).length,
        coachYes: held.filter((p) => p.has_coach === true).length,
        coachNo: held.filter((p) => p.has_coach === false).length,
        coachUnreported: held.filter((p) => p.has_coach === null).length,
        absences: parts.filter((x) => x.status === 'absent').length,
        substitutes: parts.filter((x) => x.role_type === 'substitute' && x.status === 'attending').length,
      }
    })

    const sum = (key: keyof Omit<TeamRow, 'team' | 'avgAttendance'>) => rows.reduce((a, r) => a + r[key], 0)
    const held = sum('held')
    const reported = sum('coachYes') + sum('coachNo')
    const totals = {
      held,
      cancelled: sum('cancelled'),
      avgAttendance: held ? rows.reduce((a, r) => a + r.avgAttendance * r.held, 0) / held : 0,
      coachRate: reported ? Math.round((sum('coachYes') / reported) * 100) : null,
      coachUnreported: sum('coachUnreported'),
      substitutes: sum('substitutes'),
      absences: sum('absences'),
    }

    const upcomingLow = practices.filter(
      (p) => p.status !== 'cancelled' && new Date(p.scheduled_at) > now && attendingCount(p) < MIN_PLAYERS,
    )

    return { rows, totals, upcomingLow }
  }, [practices, teams, now, days])

  function handleExport() {
    setExportError(null)
    try {
      downloadCsv(rows, days)
    } catch (err) {
      setExportError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                'rounded-md px-3 py-1.5 font-medium transition',
                days === p.days ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="ms-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          ייצוא ל-CSV
        </button>
      </div>

      {exportError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="אימונים שהתקיימו" value={totals.held} hint={`${totals.cancelled} בוטלו`} />
        <Stat label="ממוצע נוכחות" value={totals.avgAttendance.toFixed(1)} hint="שחקנים לאימון" />
        <Stat
          label="נוכחות מאמן"
          value={totals.coachRate === null ? '—' : `${totals.coachRate}%`}
          hint={`${totals.coachUnreported} לא דווחו`}
        />
        <Stat label="מחליפים" value={totals.substitutes} hint={`${totals.absences} היעדרויות`} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">קבוצה</th>
              <th className="px-4 py-2.5 text-end font-medium">התקיימו</th>
              <th className="px-4 py-2.5 text-end font-medium">ממוצע שחקנים</th>
              <th className="px-4 py-2.5 text-end font-medium">מתחת ל-{MIN_PLAYERS}</th>
              <th className="px-4 py-2.5 text-end font-medium">מאמן כן / לא / ?</th>
              <th className="px-4 py-2.5 text-end font-medium">היעדרויות</th>
              <th className="px-4 py-2.5 text-end font-medium">מחליפים</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.team.id}>
                <td className="px-4 py-2 text-start">
                  <span className="font-medium">{r.team.name}</span>{' '}
                  <span className={cn('ms-1 rounded-full px-2 py-0.5 text-xs', LEVEL_STYLES[r.team.level])}>
                    {LEVEL_LABELS[r.team.level]}
                  </span>
                </td>
                <td className="px-4 py-2 text-end">
                  {r.held}
                  {r.cancelled > 0 && <span className="text-slate-400"> (+{r.cancelled} בוטלו)</span>}
                </td>
                <td className="px-4 py-2 text-end">{r.held ? r.avgAttendance.toFixed(1) : '—'}</td>
                <td className={cn('px-4 py-2 text-end', r.belowMin > 0 && 'font-medium text-orange-700')}>{r.belowMin}</td>
                <td className="px-4 py-2 text-end">
                  {r.coachYes} / {r.coachNo} /{' '}
                  <span className={cn(r.coachUnreported > 0 && 'font-medium text-orange-700')}>{r.coachUnreported}</span>
                </td>
                <td className="px-4 py-2 text-end">{r.absences}</td>
                <td className="px-4 py-2 text-end">{r.substitutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          אימונים קרובים עם פחות מ-{MIN_PLAYERS} שחקנים
        </h2>
        {upcomingLow.length === 0 ? (
          <p className="text-sm text-slate-500">אין — בכל האימונים הקרובים יש לפחות {MIN_PLAYERS} שחקנים.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {upcomingLow.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{p.teams?.name ?? LEVEL_LABELS[p.level]}</span>{' '}
                  <span className="text-slate-500">{formatHe(new Date(p.scheduled_at), 'EEEE, d בMMM, HH:mm')}</span>
                </span>
                <span className="flex items-center gap-2">
                  {p.status === 'at_risk' && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">בסיכון</span>
                  )}
                  <span dir="ltr" className="font-medium text-orange-700">
                    {attendingCount(p)}/{p.max_players}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
