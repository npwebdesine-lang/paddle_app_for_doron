import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import { AuthContext, type ProfileWithTeam } from './auth'

type ProfileResult = { profile: ProfileWithTeam | null; error: string | null }

/** Right after sign-up, retry a missing profile this many times, this far apart. */
const PROFILE_RETRIES = 3
const PROFILE_RETRY_MS = 500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Loads the user's profile: one attempt plus up to `retries` more, 500ms apart.
 * With email confirmation disabled, sign-up signs the user in immediately —
 * often before the database trigger has created the profile row.
 */
async function fetchProfile(userId: string, retries: number): Promise<ProfileResult> {
  let lastError: string | null = null
  for (let i = 0; i <= retries; i++) {
    if (i > 0) await sleep(PROFILE_RETRY_MS)
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

  const syncProfile = useCallback(async (userId: string | undefined, retries: number, force = false) => {
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
    const result = await fetchProfile(userId, retries)
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
        return syncProfile(data.session?.user.id, 1)
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
        // SIGNED_IN retries a missing profile — right after sign-up the trigger may lag.
        setTimeout(() => {
          syncProfile(next?.user.id, PROFILE_RETRIES, event === 'USER_UPDATED').catch((err) => {
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
    () => syncProfile(session?.user.id, PROFILE_RETRIES, true),
    [syncProfile, session?.user.id],
  )

  return (
    <AuthContext.Provider value={{ session, profile, profileError, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
