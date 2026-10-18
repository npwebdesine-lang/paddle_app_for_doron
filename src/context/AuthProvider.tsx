import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, type ProfileWithTeam } from './auth'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileWithTeam | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*, teams(id, name)')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: supabase-js warns against awaiting other calls inside this callback.
        setTimeout(() => {
          setLoading(true)
          loadProfile(next?.user.id).finally(() => setLoading(false))
        }, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(
    () => loadProfile(session?.user.id),
    [loadProfile, session?.user.id],
  )

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
