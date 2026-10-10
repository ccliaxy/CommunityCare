import ResidentPasswordPage from './pages/ResidentPasswordPage'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import LoginPage from './pages/LoginPage'
import StaffPortal from './pages/staff/StaffPortal'
import AdminPortal from './pages/admin/AdminPortal'
import { supabase, configurationError } from './lib/supabase'
import { createPortalAuth } from './lib/portalAuth'
import type { SupabaseClient } from '@supabase/supabase-js'
import './AuthStatus.css'

function ConnectedApp({ client }: { client: SupabaseClient }) {
  const auth = useMemo(() => createPortalAuth(client), [client])
  const state = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  useEffect(() => auth.start(), [auth])
  if (state.status === 'loading') return <main className="cc-auth-status" role="status"><h1>CommunityCare</h1><p>Checking your session…</p></main>
  if (state.status === 'blocked') return <main className="cc-auth-status"><h1>Account access</h1><p role="alert">{state.error}</p><div><button onClick={auth.retry}>Retry verification</button><button onClick={() => void auth.signOut()}>Sign out</button></div></main>
  if (state.status === 'signed_out') return <LoginPage onSignIn={auth.signIn} busy={state.busy} authError={state.error} />
  const logout = () => { void auth.signOut(); window.scrollTo(0, 0) }
  return <><div className="cc-session-banner"><span>Signed in as <strong>{state.profile.full_name}</strong> · {state.profile.role === 'system_admin' ? 'System Admin' : 'Property Staff'} · Signed in securely.</span><button onClick={logout}>Sign out</button></div>
    {state.profile.role === 'system_admin' ? <AdminPortal key={state.profile.id} onLogout={logout} /> : <StaffPortal key={state.profile.id} onLogout={logout} />}
  </>
}
export default function App() {
  if (['resident','staff'].includes(new URLSearchParams(window.location.search).get('setup')??'')) return <ResidentPasswordPage />
  return supabase ? <ConnectedApp client={supabase} /> : <main className="cc-auth-status"><h1>Supabase configuration needed</h1><p role="alert">{configurationError}</p><p>Keep server secret keys out of this web application.</p></main>
}
