import { subscribeAlerts } from '../../lib/alertSocket'
import { useCallback, useEffect, useRef, useState } from 'react'
import { readAlerts } from './alertRepository'
import type { LiveAlert } from './alertData'

export function useDatabaseAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([])
  const [alertsLoading, setLoading] = useState(true)
  const [alertsError, setError] = useState('')
  const [alertsUpdatedAt, setUpdatedAt] = useState('')
  const request = useRef<AbortController | null>(null)
  const refreshAlerts = useCallback(async () => {
    request.current?.abort()
    const current = new AbortController()
    request.current = current
    setLoading(true); setError('')
    try {
      const data = await readAlerts(current.signal)
      if (current.signal.aborted) return
      setAlerts(data); setUpdatedAt(new Date().toISOString()); window.dispatchEvent(new Event('communitycare:alerts-changed'))
    } catch (error) {
      if (current.signal.aborted) return
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Could not load alerts.'
      setError(message); setAlerts([]); setUpdatedAt('')
    } finally {
      if (!current.signal.aborted) setLoading(false)
    }
  }, [])
  useEffect(() => { void refreshAlerts(); return () => request.current?.abort() }, [refreshAlerts])
  useEffect(() => {
    let closed = false
    let cleanup: (() => void) | undefined
    void subscribeAlerts(() => { void refreshAlerts() }).then(stop => { if (closed) stop(); else cleanup = stop })
      .catch(() => { /* Manual Refresh remains available when Socket.IO is unavailable. */ })
    return () => { closed = true; cleanup?.() }
  }, [refreshAlerts])
  useEffect(() => {
    const tick = () => { if (!document.hidden) void refreshAlerts() }
    const timer = window.setInterval(tick, 30000)
    window.addEventListener('focus', tick)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick) }
  }, [refreshAlerts])
  return { alerts, alertsLoading, alertsError, alertsUpdatedAt, refreshAlerts }
}
