import { AlertTriangle, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/auth'
import { supabase } from '../lib/supabase'

/**
 * Shown while a signed-in user's profile is loading (e.g. right after sign-up),
 * or when it couldn't be loaded — never a blank screen.
 */
export default function ProfileStatus() {
  const { loading, profileError, refreshProfile } = useAuth()

  if (loading || !profileError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm">מגדיר את הפרופיל שלך...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
        <h2 className="mb-1 text-lg font-semibold">לא הצלחנו לטעון את הפרופיל שלך</h2>
        <p className="mb-4 text-sm text-slate-500">{profileError}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => void refreshProfile()}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            נסו שוב
          </button>
          <button
            onClick={() => void supabase.auth.signOut()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            התנתקות
          </button>
        </div>
      </div>
    </div>
  )
}
