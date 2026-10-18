import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import { AuthContext, type ProfileWithTeam } from './auth'

type ProfileResult = { profile: ProfileWithTeam | null; error: string | null }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Loads the user's profile, retrying with backoff. Right after sign-up the
 * profile row is created by a database trigger, so the first read can race it.
 */
async function fetchProfile(userId: string, attempts: number): Promise<ProfileResult> {
  let lastError: string | null = null
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(400 * i)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(id, name)')
        .eq('id', userId)
        .maybeSingle()
      if (error) lastError = errorMessage(error)
      else if (data) return { profile: data, error: null }
      else lastError = 'הפרופיל שלך עדיין לא נוצר.'
    } catch (err) {
      lastError = errorMessage(err)
    }
  }
  return { profile: null, error: lastError }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileWithTeam | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /** User id whose profile is currently loaded (skip refetch on token refresh). */
  const loadedFor = useRef<string | null>(null)
  /** Latest requested user id — results for any other user are stale and dropped. */
  const latestUser = useRef<string | null>(null)

  const syncProfile = useCallback(async (userId: string | undefined, attempts: number, force = false) => {
    latestUser.current = userId ?? null
    if (!userId) {
      loadedFor.current = null
      setProfile(null)
      setProfileError(null)
      setLoading(false)
      return
    }
    if (!force && loadedFor.current === userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await fetchProfile(userId, attempts)
    if (latestUser.current !== userId) return

    loadedFor.current = result.profile ? userId : null
    setProfile(result.profile)
    setProfileError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setProfileError(errorMessage(error))
        setSession(data.session)
        return syncProfile(data.session?.user.id, 2)
      })
      .catch((err) => {
        if (!active) return
        setProfileError(errorMessage(err))
        setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Deferred: supabase-js warns against awaiting other calls inside this callback.
        // SIGNED_IN gets extra retries — right after sign-up the profile trigger may lag.
        setTimeout(() => {
          syncProfile(next?.user.id, 5, event === 'USER_UPDATED').catch((err) => {
            setProfileError(errorMessage(err))
            setLoading(false)
          })
        }, 0)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [syncProfile])

  const refreshProfile = useCallback(
    () => syncProfile(session?.user.id, 3, true),
    [syncProfile, session?.user.id],
  )

  return (
    <AuthContext.Provider value={{ session, profile, profileError, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
