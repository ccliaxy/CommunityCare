import { supabase } from './supabase'
export const backendUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/$/, '')
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase login is not configured.')
  const session = await supabase.auth.getSession()
  if (session.error || !session.data.session) throw new Error('Please sign in again.')
  const response = await fetch(`${backendUrl}/api${path}`, {
    ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session.access_token}` },
  })
  let body
  try { body = await response.json() } catch { throw new Error('Backend response is invalid. Check VITE_API_URL and start the Node server.') }
  if (!response.ok) throw new Error(body.error || 'Backend request failed.')
  return body as T
}
