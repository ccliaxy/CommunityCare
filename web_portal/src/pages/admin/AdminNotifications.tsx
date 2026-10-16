import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { api } from '../../lib/backendApi'
import StaffIcon from '../staff/StaffIcon'
import './AdminNotifications.css'

type Item = { id: string; title: string; body: string; kind: 'account' | 'system'; created_at: string; read_at: string | null; cursor: string; destination: 'profile' | 'properties' | 'subscriptions' | 'configuration' | 'audit' }
type Inbox = { items: Item[]; unread_count: number; next_cursor: string | null }
const when = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AdminNotifications({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<Item[]>([])
  const [count, setCount] = useState<number | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null), bell = useRef<HTMLButtonElement>(null), first = useRef<HTMLButtonElement>(null)
  const version = useRef(0), actionLock = useRef(false), mounted = useRef(true)
  const id = useId()
  const load = useCallback(async (before?: string, signal?: AbortSignal) => {
    const request = ++version.current; setLoading(true)
    try {
      const data = await api<Inbox>(`/admin/notifications?filter=${filter}${before ? `&before=${encodeURIComponent(before)}` : ''}`, { signal })
      if (!mounted.current || signal?.aborted || request !== version.current) return
      setItems(old => before ? [...old, ...data.items.filter(n => !old.some(x => x.id === n.id))] : data.items)
      setCount(data.unread_count); setCursor(data.next_cursor); setError('')
    } catch (e) {
      if (mounted.current && !signal?.aborted && request === version.current) { setError((e as Error).message); setItems([]); setCursor(null); setCount(null) }
    } finally { if (mounted.current && request === version.current) setLoading(false) }
  }, [filter])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; version.current++ } }, [])
  useEffect(() => {
    const controller = new AbortController()
    void load(undefined, controller.signal)
    // Poll when closed. While open, preserve the user's pagination and scroll position.
    const timer = window.setInterval(() => { if (!open && !document.hidden && !actionLock.current) void load(undefined, controller.signal) }, 15000)
    const focus = () => { if (!open && !actionLock.current) void load(undefined, controller.signal) }
    window.addEventListener('focus', focus)
    return () => { controller.abort(); version.current++; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [open, load])
  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); bell.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  async function read(item: Item, navigate: boolean) {
    if (actionLock.current) return
    actionLock.current = true; setBusy(item.id); setError(''); version.current++
    try {
      await api(`/admin/notifications/${item.id}/read`, { method: 'POST' })
      if (!mounted.current) return
      if (!item.read_at) setCount(old => old === null ? null : Math.max(0, old - 1))
      setItems(old => filter === 'unread' ? old.filter(x => x.id !== item.id) : old.map(x => x.id === item.id ? { ...x, read_at: new Date().toISOString() } : x))
      if (navigate) { setOpen(false); onNavigate(item.destination) }
    } catch (e) { if (mounted.current) setError((e as Error).message) }
    finally { actionLock.current = false; if (mounted.current) { setBusy(null); setLoading(false) } }
  }
  return <div className="an-root" ref={root} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false) }}>
    <button ref={bell} type="button" className={`ad-icon an-bell${open ? ' an-selected' : ''}`} aria-label={count === null ? 'Notifications' : `Notifications, ${count} unread`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}><StaffIcon name="alerts" />{count !== null && count > 0 && <span className="an-count">{count > 99 ? '99+' : count}</span>}</button>
    {open && <section className="an-panel" id={id} aria-label="Notifications">
      <div className="an-heading"><h2>Notifications</h2><div className="an-filters" role="group" aria-label="Filter notifications"><button ref={first} type="button" aria-pressed={filter === 'all'} disabled={!!busy} onClick={() => { if (filter !== 'all') { setItems([]); setFilter('all') } }}>All</button><button type="button" aria-pressed={filter === 'unread'} disabled={!!busy} onClick={() => { if (filter !== 'unread') { setItems([]); setFilter('unread') } }}>Unread</button></div><button className="an-close" type="button" aria-label="Close notifications" onClick={() => { setOpen(false); bell.current?.focus() }}>×</button></div>
      <div className="an-toolbar"><span>{count === null ? 'Notifications unavailable' : `${count} unread`}</span><button type="button" disabled={loading || !!busy} onClick={() => void load()}>Check for new</button></div>
      <div className="an-list" aria-busy={loading}>
        {error && <p className="an-error" role="alert">{error}</p>}
        {!error && !loading && items.length === 0 && <div className="an-empty"><StaffIcon name="alerts" /><strong>{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</strong><p>Your administrator account and system management updates will appear here.</p></div>}
        {items.map(item => <article key={item.id} className={`an-item${item.read_at ? '' : ' an-unread'}`}>
          <div className={`an-type an-${item.kind}`} aria-hidden="true"><StaffIcon name={item.kind === 'account' ? 'user' : 'settings'} /></div>
          <div className="an-content"><button type="button" className="an-open" disabled={!!busy || loading} onClick={() => void read(item, true)}><strong>{item.title}</strong><span>{item.body}</span><time dateTime={item.created_at}>{when(item.created_at)} MYT</time></button><div className="an-item-actions"><span>{item.kind === 'account' ? 'Your account' : 'System management'}</span>{!item.read_at && <button type="button" disabled={!!busy || loading} onClick={() => void read(item, false)}>{busy === item.id ? 'Saving…' : 'Mark as read'}</button>}</div></div>
          {!item.read_at && <span className="an-dot" aria-label="Unread" />}
        </article>)}
        {loading && <p className="an-loading" role="status">Loading notifications…</p>}
        {cursor && <button className="an-more" type="button" disabled={loading || !!busy} onClick={() => void load(cursor)}>Load older notifications</button>}
      </div>
      <div className="an-footer">Only account and system management updates. Events start after notification setup.</div>
    </section>}
  </div>
}

