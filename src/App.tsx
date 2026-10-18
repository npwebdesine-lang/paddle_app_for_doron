import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import AppShell from './components/AppShell'
import Auth from './components/Auth'
import PlayerDashboard from './components/PlayerDashboard'
import ProfileStatus from './components/ProfileStatus'
import { useAuth } from './context/auth'
import type { UserRole } from './types/database.types'

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  )
}

/** Signed-in users only; optionally restricted to some roles. */
function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading && !session) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  // Signed in but the profile isn't there yet (e.g. right after sign-up): never a blank screen.
  if (!profile) {
    return (
      <AppShell>
        <ProfileStatus />
      </AppShell>
    )
  }
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <AppShell>{children}</AppShell>
}

/** Sends each user to the home screen for their role. */
function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading && !session) return <FullScreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <AppShell>
        <ProfileStatus />
      </AppShell>
    )
  }
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/practices'} replace />
}

function LoginRoute() {
  const { session, loading } = useAuth()
  if (loading && !session) return <FullScreenSpinner />
  if (session) return <Navigate to="/" replace />
  return <Auth />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/practices"
        element={
          <RequireRole>
            <PlayerDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireRole roles={['admin']}>
            <AdminDashboard />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
