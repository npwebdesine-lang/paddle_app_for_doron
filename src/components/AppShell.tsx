import { LayoutDashboard, LogOut, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { supabase } from '../lib/supabase'
import { cn, LEVEL_LABELS, LEVEL_STYLES, ROLE_LABELS } from '../lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50',
  )

export default function AppShell({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function signOut() {
    setSignOutError(null)
    const { error } = await supabase.auth.signOut()
    if (error) setSignOutError('ההתנתקות נכשלה. נסו שוב.')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
              P
            </div>
            <h1 className="hidden text-base font-semibold sm:block">ליגת פאדל</h1>
            {profile?.role === 'admin' && (
              <nav className="flex items-center gap-1">
                <NavLink to="/admin" className={navClass}>
                  <LayoutDashboard className="h-4 w-4" />
                  ניהול
                </NavLink>
                <NavLink to="/practices" className={navClass}>
                  <Trophy className="h-4 w-4" />
                  תצוגת שחקן
                </NavLink>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden text-end sm:block">
                <p className="text-sm font-medium">{profile.full_name || session?.user.email}</p>
                <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                  <span>{ROLE_LABELS[profile.role]}</span>
                  <span>·</span>
                  <span>{profile.teams?.name ?? 'ללא קבוצה'}</span>
                  {profile.level && (
                    <span className={cn('rounded-full px-2 py-0.5 font-medium', LEVEL_STYLES[profile.level])}>
                      {LEVEL_LABELS[profile.level]}
                    </span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">התנתקות</span>
            </button>
          </div>
        </div>
        {signOutError && (
          <p className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">{signOutError}</p>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
