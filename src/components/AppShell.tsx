import { LayoutDashboard, LogOut, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
              P
            </div>
            <h1 className="hidden text-base font-semibold sm:block">Padel League</h1>
            {profile?.role === 'admin' && (
              <nav className="flex items-center gap-1">
                <NavLink to="/admin" className={navClass}>
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </NavLink>
                <NavLink to="/practices" className={navClass}>
                  <Trophy className="h-4 w-4" />
                  Player view
                </NavLink>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{profile.full_name || session?.user.email}</p>
                <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
                  <span>{ROLE_LABELS[profile.role]}</span>
                  <span>·</span>
                  <span>{profile.teams?.name ?? 'No team'}</span>
                  {profile.level && (
                    <span className={cn('rounded-full px-2 py-0.5 font-medium', LEVEL_STYLES[profile.level])}>
                      {LEVEL_LABELS[profile.level]}
                    </span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
