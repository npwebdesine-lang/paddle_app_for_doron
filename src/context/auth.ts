import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Profile } from '../types/database.types'

export type ProfileWithTeam = Profile & { teams: { id: string; name: string } | null }

export type AuthState = {
  session: Session | null
  profile: ProfileWithTeam | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
