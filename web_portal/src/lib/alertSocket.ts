import { supabase } from './supabase'
import { backendUrl } from './backendApi'
type Socket = { on(event: string, handler: () => void): void; disconnect(): void; connect(): void }
type IO = (url: string, options: { auth: (cb: (value: { token: string }) => void) => void }) => Socket
let loading: Promise<IO> | undefined
function loadClient() {
  if (!loading) loading = new Promise<IO>((resolve, reject) => {
    // Served by the installed Socket.IO server, avoiding an extra frontend package.
    const script = document.createElement('script'); script.src = `${backendUrl}/socket.io/socket.io.js`; script.async = true
    script.onload = () => {
      const io = (window as unknown as { io?: IO }).io
      if (io) resolve(io); else { loading = undefined; reject(new Error('Socket.IO client unavailable.')) }
    }
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error('Socket.IO server unavailable.')) }
    document.head.appendChild(script)
  })
  return loading
}
export async function subscribeAlerts(refresh: () => void): Promise<() => void> {
  const io = await loadClient()
  const socket = io(backendUrl, { auth: cb => {
    void supabase?.auth.getSession().then(({ data }) => cb({ token: data.session?.access_token ?? '' }))
  } })
  socket.on('connect', refresh)
  socket.on('alerts:changed', refresh)
  let closed = false
  const listener = supabase?.auth.onAuthStateChange(event => {
    if (event === 'TOKEN_REFRESHED') setTimeout(() => { if (!closed) { socket.disconnect(); socket.connect() } }, 0)
    if (event === 'SIGNED_OUT') socket.disconnect()
  })
  return () => { closed = true; listener?.data.subscription.unsubscribe(); socket.disconnect() }
}
