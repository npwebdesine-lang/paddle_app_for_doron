import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import MissingConfig from './components/MissingConfig.tsx'
import AuthProvider from './context/AuthProvider.tsx'
import { supabaseConfigured } from './lib/supabase.ts'

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
