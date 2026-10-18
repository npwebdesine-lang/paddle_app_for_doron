import { addWeeks, format } from 'date-fns'
import { Loader2, Trash2, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { errorMessage, inputClass, LEVEL_LABELS, STATUS_LABELS } from '../../lib/utils'
import type { PracticeStatus, PracticeWithDetails, Team } from '../../types/database.types'

type Props = {
  teams: Team[]
  /** Existing practice to edit; omit to create. */
  practice?: PracticeWithDetails
  onClose: () => void
  onSaved: () => void
}

const STATUSES: PracticeStatus[] = ['scheduled', 'at_risk', 'cancelled', 'completed']

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export default function PracticeForm({ teams, practice, onClose, onSaved }: Props) {
  const editing = !!practice
  const [teamId, setTeamId] = useState(practice?.team_id ?? teams[0]?.id ?? '')
  const [when, setWhen] = useState(practice ? format(new Date(practice.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '')
  const [duration, setDuration] = useState(practice?.duration_minutes ?? 90)
  const [location, setLocation] = useState(practice?.location ?? '')
  const [maxPlayers, setMaxPlayers] = useState(practice?.max_players ?? 6)
  const [notes, setNotes] = useState(practice?.notes ?? '')
  const [status, setStatus] = useState<PracticeStatus>(practice?.status ?? 'scheduled')
  const [hasCoach, setHasCoach] = useState<string>(practice?.has_coach == null ? '' : String(practice.has_coach))
  const [repeatWeeks, setRepeatWeeks] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const team = teams.find((t) => t.id === teamId)
    if (!team) return setError('יש לבחור קבוצה')
    const start = new Date(when)
    if (Number.isNaN(start.getTime())) return setError('יש לבחור תאריך ושעה')

    setBusy(true)
    setError(null)
    try {
      const base = {
        scheduled_at: start.toISOString(),
        duration_minutes: duration,
        location: location.trim() || null,
        max_players: maxPlayers,
        notes: notes.trim() || null,
      }

      const { error } = editing
        ? await supabase
            .from('practices')
            .update({ ...base, status, has_coach: hasCoach === '' ? null : hasCoach === 'true' })
            .eq('id', practice.id)
        : await supabase.from('practices').insert(
            Array.from({ length: Math.max(1, repeatWeeks) }, (_, i) => ({
              ...base,
              team_id: team.id,
              level: team.level,
              scheduled_at: addWeeks(start, i).toISOString(),
            })),
          )
      if (error) throw error

      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!practice || !confirm('למחוק את האימון ואת כל רישומי הנוכחות שלו?')) return
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.from('practices').delete().eq('id', practice.id)
      if (error) throw error
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? 'עריכת אימון' : 'הוספת אימון'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Field label="קבוצה">
          <select required disabled={editing} value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {LEVEL_LABELS[t.level]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="תאריך ושעה">
            <input
              type="datetime-local"
              dir="ltr"
              required
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="משך (דקות)">
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="מיקום">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="מגרש 3" className={inputClass} />
          </Field>
          <Field label="מקסימום שחקנים">
            <input
              type="number"
              min={1}
              max={12}
              required
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="סטטוס">
              <select value={status} onChange={(e) => setStatus(e.target.value as PracticeStatus)} className={inputClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="האם היה מאמן">
              <select value={hasCoach} onChange={(e) => setHasCoach(e.target.value)} className={inputClass}>
                <option value="">לא דווח</option>
                <option value="true">כן</option>
                <option value="false">לא</option>
              </select>
            </Field>
          </div>
        ) : (
          <Field label="חזרה שבועית (מספר אימונים)">
            <input
              type="number"
              min={1}
              max={26}
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        )}

        <Field label="הערות">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              מחיקה
            </button>
          )}
          <button type="button" onClick={onClose} className="ms-auto rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            ביטול
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'שמירה' : repeatWeeks > 1 ? `הוספת ${repeatWeeks} אימונים` : 'הוספת אימון'}
          </button>
        </div>
      </form>
    </div>
  )
}
