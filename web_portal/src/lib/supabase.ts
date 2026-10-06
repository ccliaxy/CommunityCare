import { createClient } from '@supabase/supabase-js'

export let configurationError = ''
function createPortalClient() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  try {
    if (!url || !key) throw new Error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in web_portal/.env.local, then restart npm run dev.')
    if (new URL(url).protocol !== 'https:') throw new Error('Use your hosted Supabase Project URL beginning with https://.')
    if (key.startsWith('sb_secret_')) throw new Error('Use the publishable key, not a server secret key.')
    if (key.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.role === 'service_role') throw new Error('A service_role key cannot be used in the browser.')
      } catch (error) {
        if (error instanceof Error && error.message.includes('service_role')) throw error
      }
    }
    return createClient(url, key, {
      auth: {
        storage: window.sessionStorage,
        storageKey: 'communitycare-portal-auth-v1',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  } catch (error) {
    configurationError = error instanceof Error ? error.message : 'Supabase configuration could not be loaded.'
    return null
  }
}
// This version deliberately uses tab-scoped session storage, not permanent remember-me.
export const supabase = createPortalClient()
