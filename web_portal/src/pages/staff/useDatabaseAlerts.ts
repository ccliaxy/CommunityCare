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
    setLoading(true); setError(''); setAlerts([]); setUpdatedAt('')
    try {
      const data = await readAlerts(current.signal)
      if (current.signal.aborted) return
      setAlerts(data); setUpdatedAt(new Date().toISOString())
    } catch (error) {
      if (current.signal.aborted) return
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Could not load alerts.'
      setError(message)
    } finally {
      if (!current.signal.aborted) setLoading(false)
    }
  }, [])
  useEffect(() => { void refreshAlerts(); return () => request.current?.abort() }, [refreshAlerts])
  return { alerts, alertsLoading, alertsError, alertsUpdatedAt, refreshAlerts }
}
