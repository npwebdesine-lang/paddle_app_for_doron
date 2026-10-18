import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Undo2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  cn,
  errorMessage,
  formatHe,
  LEVEL_LABELS,
  LEVEL_STYLES,
  MIN_PLAYERS,
  practiceEnd,
  spotsLabel,
} from '../lib/utils'
import type { Profile, PracticeWithDetails } from '../types/database.types'

type Props = {
  practice: PracticeWithDetails
  profile: Profile
  now: Date
  onChanged: () => void
  /** Admin calendar: show an Edit button. */
  onEdit?: (practice: PracticeWithDetails) => void
}

export default function PracticeCard({ practice, profile, now, onChanged, onEdit }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  const start = new Date(practice.scheduled_at)
  const ended = practiceEnd(practice) <= now
  const attending = practice.participations.filter((p) => p.status === 'attending')
  const absent = practice.participations.filter((p) => p.status === 'absent')
  const spotsLeft = Math.max(practice.max_players - attending.length, 0)
  const mine = practice.participations.find((p) => p.profile_id === profile.id)

  const cancelled = practice.status === 'cancelled'
  const open = !cancelled && start > now
  const low = open && attending.length < MIN_PLAYERS
  const critical = low && attending.length < 2
  const atRisk = practice.status === 'at_risk'
  const canJoin = open && !mine && practice.level === profile.level && spotsLeft > 0
  const canReportCoach =
    profile.role === 'captain' && practice.team_id === profile.team_id && ended && !cancelled

  async function run(key: string, action: () => PromiseLike<{ error: unknown }>) {
    setBusy(key)
    setError(null)
    try {
      const { error } = await action()
      if (error) throw error
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const setStatus = (status: 'attending' | 'absent') => {
    if (!mine) return
    return run(status, () => supabase.from('participations').update({ status }).eq('id', mine.id))
  }

  const joinAsSubstitute = () =>
    run('join', () =>
      supabase.from('participations').insert({
        practice_id: practice.id,
        profile_id: profile.id,
        role_type: 'substitute',
        status: 'attending',
      }),
    )

  const reportCoach = (hasCoach: boolean) =>
    run(hasCoach ? 'coach-yes' : 'coach-no', () =>
      // .single() turns "0 rows updated" (blocked by RLS) into a visible error.
      supabase.from('practices').update({ has_coach: hasCoach }).eq('id', practice.id).select('id').single(),
    )

  const spinner = <Loader2 className="h-4 w-4 animate-spin" />
  const playerName = (name: string | undefined) => name || 'שחקן'

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm transition',
        cancelled && 'opacity-60',
        critical ? 'border-red-300 ring-1 ring-red-200' : low ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200',
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', LEVEL_STYLES[practice.level])}>
              {LEVEL_LABELS[practice.level]}
            </span>
            {practice.teams && <span className="text-xs text-slate-500">{practice.teams.name}</span>}
            {mine?.role_type === 'substitute' && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                משחק/ת כמחליף
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-lg font-semibold">
            <Clock className="h-4 w-4 text-slate-400" />
            {formatHe(start, 'HH:mm')}
            <span className="text-sm font-normal text-slate-500">
              · {formatHe(start, 'EEEE, d בMMM')} · {practice.duration_minutes} דק׳
            </span>
          </p>
          {practice.location && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {practice.location}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(practice)}
              aria-label="עריכת אימון"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <div
            className={cn(
              'flex flex-col items-center rounded-xl px-3 py-1.5',
              critical ? 'bg-red-50 text-red-700' : low ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700',
            )}
          >
            <span dir="ltr" className="text-xl leading-none font-bold">
              {attending.length}/{practice.max_players}
            </span>
            <span className="text-[11px] font-medium">שחקנים</span>
          </div>
        </div>
      </header>

      {cancelled && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">האימון בוטל</p>}
      {open && (low || atRisk) && (
        <p
          className={cn(
            'mb-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
            critical ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700',
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {atRisk ? 'בסיכון' : 'מעט משתתפים'}
          {attending.length < MIN_PLAYERS && ` — חסרים עוד ${MIN_PLAYERS - attending.length}`}
        </p>
      )}

      <ul className="mb-3 flex flex-wrap gap-1.5">
        {attending.map((p) => (
          <li
            key={p.id}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs',
              p.role_type === 'substitute' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700',
              p.profile_id === profile.id && 'ring-2 ring-emerald-500',
            )}
          >
            {playerName(p.profiles?.full_name)}
            {p.role_type === 'substitute' && <span className="ms-1 opacity-70">(מחליף)</span>}
          </li>
        ))}
        {open &&
          Array.from({ length: spotsLeft }).map((_, i) => (
            <li
              key={`open-${i}`}
              className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-400"
            >
              מקום פנוי
            </li>
          ))}
      </ul>

      {absent.length > 0 && (
        <p className="mb-3 text-xs text-slate-400">
          לא מגיעים: {absent.map((p) => playerName(p.profiles?.full_name)).join(', ')}
        </p>
      )}

      {ended && practice.has_coach !== null && !canReportCoach && (
        <p className="mb-3 text-xs text-slate-500">מאמן: {practice.has_coach ? 'כן' : 'לא'}</p>
      )}

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {open && (
        <footer className="flex flex-wrap items-center gap-2">
          {mine?.status === 'attending' && (
            <button
              disabled={!!busy}
              onClick={() => setStatus('absent')}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {busy === 'absent' ? spinner : <UserMinus className="h-4 w-4" />}
              לא אגיע
            </button>
          )}

          {mine?.status === 'absent' && (
            <>
              <span className="text-sm text-slate-500">סימנת שלא תגיע/י.</span>
              {spotsLeft > 0 && (
                <button
                  disabled={!!busy}
                  onClick={() => setStatus('attending')}
                  className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
                >
                  {busy === 'attending' ? spinner : <Undo2 className="h-3.5 w-3.5" />}
                  ביטול
                </button>
              )}
            </>
          )}

          {canJoin && (
            <button
              disabled={!!busy}
              onClick={joinAsSubstitute}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === 'join' ? spinner : <UserPlus className="h-4 w-4" />}
              הצטרף כמחליף
            </button>
          )}

          <span className="ms-auto flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            {spotsLabel(spotsLeft)}
          </span>
        </footer>
      )}

      {canReportCoach && (
        <div className="mt-1 border-t border-slate-100 pt-3">
          {!summaryOpen ? (
            <button
              onClick={() => setSummaryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              סיכום אימון
              {practice.has_coach === null ? (
                <span className="ms-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">ממתין לדיווח</span>
              ) : (
                <span className="ms-1 text-xs text-slate-500">מאמן: {practice.has_coach ? 'כן' : 'לא'}</span>
              )}
            </button>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">דיווח מאמן — האם היה מאמן באימון?</p>
              <div className="flex gap-2">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    disabled={!!busy}
                    onClick={() => reportCoach(value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60',
                      practice.has_coach === value
                        ? value
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-700 bg-slate-700 text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {busy === (value ? 'coach-yes' : 'coach-no') ? (
                      spinner
                    ) : value ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    {value ? 'כן' : 'לא'}
                  </button>
                ))}
                <button onClick={() => setSummaryOpen(false)} className="ms-auto text-sm text-slate-500 hover:text-slate-700">
                  סגירה
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
