import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import '../AuthStatus.css'

let invitationClient: SupabaseClient | null = null
export default function ResidentPasswordPage() {
  const [staffInvite] = useState(() => new URLSearchParams(window.location.search).get('setup') === 'staff')
  // Separate nonpersistent client: accepting an invitation must not replace staff login.
  const client = useMemo(() => {
    if (invitationClient) return invitationClient
    const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    invitationClient = url && key ? createClient(url, key, { auth: { storageKey: 'cc-resident-invite', persistSession: false, autoRefreshToken: false, detectSessionInUrl: true } }) : null
    return invitationClient
  }, [])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => {
    let active = true
    if (!client) { setError('Supabase is not configured.'); return }
    client.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return
      if (authError || !data.user) setError('Invitation link is missing, expired or already used. Request a fresh link from the administrator.')
      else { setEmail(data.user.email ?? ''); setReady(true) }
      // Auth has consumed the fragment. Never retain tokens in address-bar history.
      window.history.replaceState(null, '', `${window.location.pathname}?setup=${staffInvite ? 'staff' : 'resident'}`)
    }).catch(() => { if (active) setError('Could not verify invitation. Check your connection.') })
    return () => { active = false }
  }, [client, staffInvite])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!client || busy || !ready) return
    if (password.length < 12 || password !== confirmation) { setError('Use at least 12 characters and matching passwords.'); return }
    setBusy(true); setError('')
    try {
      const result = await client.auth.updateUser({ password })
      if (result.error) throw result.error
      setDone(true); setPassword(''); setConfirmation('')
      await client.auth.signOut({ scope: 'local' })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password could not be saved.') }
    finally { setBusy(false) }
  }
  return <main className="cc-auth-status"><h1>CommunityCare · Set your password</h1>{done ? <p>{staffInvite ? <>Password saved. <a href="/">Open the web portal</a> and sign in with your email and new password.</> : <>Password saved. Open the CommunityCare mobile app and sign in with your email and new password.</>}</p> : <><p>{email || 'Checking invitation…'}</p>{error && <p role="alert">{error}</p>}{ready && <form onSubmit={submit}><p><label>New password <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /></label></p><p><label>Confirm password <input type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></p><button disabled={busy}>{busy ? 'Saving…' : 'Set password'}</button></form>}</>}</main>
}
