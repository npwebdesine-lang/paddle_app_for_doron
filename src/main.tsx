import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AuthProvider from './context/AuthProvider.tsx'
import { supabaseConfigured } from './lib/supabase.ts'

function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-red-700">App not configured</h1>
        <p className="text-sm text-slate-600">
          This build is missing <code className="font-mono">VITE_SUPABASE_URL</code> and/or{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>. Set them in your <code>.env</code> file locally,
          or in your hosting provider's environment variables, then rebuild / redeploy.
        </p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <MissingConfig />
    )}
  </StrictMode>,
)
