import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage, inputClass, LEVEL_LABELS } from '../lib/utils'
import type { Team } from '../types/database.types'

async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('level').order('name')
  if (error) throw error
  return data ?? []
}

export default function Auth() {
  const [registering, setRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (registering) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), team_id: teamId || null } },
        })
        if (error) throw error
        if (!data.session) setNotice('שלחנו לך אימייל לאימות החשבון. אחרי האימות אפשר להתחבר.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white">
            P
          </div>
          <h1 className="text-2xl font-semibold">ליגת פאדל</h1>
          <p className="text-sm text-slate-500">
            {registering ? 'יצירת חשבון שחקן' : 'התחברו כדי לראות את האימונים שלכם'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {registering && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">שם מלא</span>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">קבוצה</span>
                <select
                  required={teams.length > 0}
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled={teams.length > 0}>
                    {teams.length > 0 ? 'בחרו קבוצה' : 'אין קבוצות זמינות — הרכז ישבץ אתכם'}
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {LEVEL_LABELS[t.level]}
                    </option>
                  ))}
                </select>
                {teamsError && (
                  <span className="mt-1 block text-xs text-amber-700">
                    לא הצלחנו לטעון את רשימת הקבוצות. אפשר להירשם, והרכז ישבץ אתכם לקבוצה.
                  </span>
                )}
              </label>
            </>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">אימייל</span>
            <input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">סיסמה</span>
            <input
              type="password"
              dir="ltr"
              required
              minLength={6}
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : registering ? (
              <UserPlus className="h-4 w-4" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {registering ? 'יצירת חשבון' : 'התחברות'}
          </button>

          <p className="text-center text-xs text-slate-500">
            {registering ? 'כבר יש לך חשבון?' : 'חדשים בליגה?'}{' '}
            <button
              type="button"
              onClick={() => {
                setRegistering(!registering)
                setError(null)
                setNotice(null)
              }}
              className="font-medium text-emerald-700 hover:underline"
            >
              {registering ? 'התחברות' : 'יצירת חשבון'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
