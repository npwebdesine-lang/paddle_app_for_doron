import { Loader2, LogIn, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage, inputClass } from '../lib/utils'

export default function Auth() {
  const [registering, setRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (registering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw error
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
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
          <h1 className="text-2xl font-semibold">Padel League</h1>
          <p className="text-sm text-slate-500">
            {registering ? 'Create your player account' : 'Sign in to see your practices'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {registering && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Full name</span>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
            <input
              type="password"
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
            {registering ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-slate-500">
            {registering ? 'Already have an account?' : 'New to the league?'}{' '}
            <button
              type="button"
              onClick={() => {
                setRegistering(!registering)
                setError(null)
                setNotice(null)
              }}
              className="font-medium text-emerald-700 hover:underline"
            >
              {registering ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
