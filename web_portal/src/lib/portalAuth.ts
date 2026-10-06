import type { SupabaseClient } from '@supabase/supabase-js'

export type PortalProfile = { id: string; full_name: string; role: 'system_admin' | 'property_staff'; status: 'active' }
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out'; error: string; busy: boolean }
  | { status: 'signed_in'; profile: PortalProfile }
  | { status: 'blocked'; error: string }

export function validateProfile(value: unknown, userId: string): PortalProfile {
  const profile = value as Partial<PortalProfile> | null
  if (!profile || profile.id !== userId) throw new Error('Your login exists, but its app_users profile is missing. Ask your administrator to provision the account.')
  if (profile.status !== 'active') throw new Error('This account is inactive. Contact your administrator.')
  if (!['system_admin', 'property_staff'].includes(profile.role ?? '')) throw new Error('Elderly and Family accounts use the mobile app. This portal is for Staff and Admin accounts.')
  return profile as PortalProfile
}

export function createPortalAuth(client: SupabaseClient) {
  let state: AuthState = { status: 'loading' }
  let revision = 0
  let active = false
  const listeners = new Set<() => void>()
  const set = (next: AuthState) => { state = next; listeners.forEach(fn => fn()) }
  const current = (version: number) => active && version === revision

  async function verify() {
    const version = ++revision
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession()
      if (!current(version)) return
      if (sessionError) throw new Error('Unable to restore your session. Check your connection and try again.')
      if (!sessionData.session) { set({ status: 'signed_out', error: '', busy: false }); return }
      const { data, error } = await client.auth.getUser()
      if (!current(version)) return
      if (error || !data.user) throw new Error('Your session could not be verified. Retry, or sign out and log in again.')
      const { data: profile, error: profileError } = await client.from('app_users')
        .select('id,full_name,role,status').eq('id', data.user.id).maybeSingle()
      if (!current(version)) return
      if (profileError) throw new Error('Unable to read your account role. Check the database setup and connection, then retry.')
      set({ status: 'signed_in', profile: validateProfile(profile, data.user.id) })
    } catch (error) {
      if (current(version)) set({ status: 'blocked', error: error instanceof Error ? error.message : 'Account verification failed.' })
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    start() {
      active = true
      const timers = new Set<ReturnType<typeof setTimeout>>()
      const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
        if (!active) return
        if (event === 'SIGNED_OUT') { ++revision; set({ status: 'signed_out', error: '', busy: false }); return }
        if (event === 'INITIAL_SESSION') return // Explicit restore below handles this.
        // Avoid calling Supabase asynchronously inside the Auth callback/lock.
        const timer = setTimeout(() => { timers.delete(timer); if (active) void verify() }, 0)
        timers.add(timer)
      })
      void verify()
      const onFocus = () => { if (state.status === 'signed_in') void verify() }
      window.addEventListener('focus', onFocus)
      return () => {
        active = false; ++revision; subscription.unsubscribe()
        timers.forEach(clearTimeout); window.removeEventListener('focus', onFocus)
      }
    },
    async signIn(email: string, password: string) {
      if (state.status !== 'signed_out' || state.busy) return
      const version = ++revision
      set({ status: 'signed_out', error: '', busy: true })
      try {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          if (!current(version)) return
          const message = error.code === 'email_not_confirmed' ? 'Please confirm your email before logging in.'
            : error.code === 'invalid_credentials' ? 'Incorrect email or password.'
            : 'Login failed. Check your connection and account details, then try again.'
          set({ status: 'signed_out', error: message, busy: false })
          return
        }
        // SIGNED_IN will also schedule verification. Revision guards discard stale results.
        if (active) await verify()
      } catch {
        if (current(version)) set({ status: 'signed_out', error: 'Unable to connect. Please try again.', busy: false })
      }
    },
    async signOut() {
      ++revision
      set({ status: 'loading' }) // Unmount all portal/demo state immediately.
      try {
        const { error } = await client.auth.signOut({ scope: 'local' })
        if (error) throw error
        if (active) set({ status: 'signed_out', error: '', busy: false })
      } catch {
        if (active) set({ status: 'blocked', error: 'Sign-out could not complete. Check your connection and retry Sign out.' })
      }
    },
    retry: () => { set({ status: 'loading' }); void verify() },
  }
}
