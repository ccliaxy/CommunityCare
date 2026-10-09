import { useEffect, useRef, useState } from 'react'
import StaffIcon from './StaffIcon'
import type { StaffIconName } from './StaffIcon'
import { usePortal } from './PortalContext'
import { readDashboard } from './dashboardRepository'
import { currentResidents, dayKey, incidentTrend, zone } from './dashboardData'
import type { DashboardData } from './dashboardData'
import './StaffDashboard.css'

type Props = { onLogout: () => void; onResidents?: () => void; onTasks?: () => void; onPage?: (page: string) => void }
const quickActions: { label: string; icon: StaffIconName }[] = [
  { label: 'New Task', icon: 'tasks' }, { label: 'Register Staff', icon: 'staff' },
  { label: 'Add Resident', icon: 'residents' }, { label: 'Log Incident', icon: 'incidents' },
  { label: 'Generate Report', icon: 'reports' }, { label: 'Send Alert', icon: 'alerts' },
  { label: 'Assign Shift', icon: 'shift' }, { label: 'Create Maintenance', icon: 'maintenance' },
]
const badge = (status: string) => status === 'completed' || status === 'resolved' || status === 'closed' ? 'sd-completed' : status === 'active' ? 'sd-active' : status === 'missed' ? 'sd-missed' : 'sd-pending'
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const formatTime = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: zone })
export default function StaffDashboard({ onPage }: Props) {
  const { search, setSearch } = usePortal()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState('')
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [taskRevision, setTaskRevision] = useState(0)
  useEffect(() => {
    const reload = () => setTaskRevision(v => v + 1)
    window.addEventListener('communitycare:tasks-changed', reload)
    return () => window.removeEventListener('communitycare:tasks-changed', reload)
  }, [])
  const request = useRef(0)
  useEffect(() => {
    const controller = new AbortController()
    const id = ++request.current
    setLoading(true); setError(''); setData(null)
    readDashboard(controller.signal).then(next => {
      if (id !== request.current || controller.signal.aborted) return
      setData(next); setLoadedAt(new Date())
      setProperty(old => next.properties.some(p => p.id === old) ? old : '')
    }).catch(reason => {
      if (!controller.signal.aborted && id === request.current) setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.')
    }).finally(() => { if (!controller.signal.aborted && id === request.current) setLoading(false) })
    return () => controller.abort()
  }, [taskRevision])
  const now = loadedAt ?? new Date()
  const scope = <T extends { property_id: string }>(rows: T[]) => rows.filter(row => !property || row.property_id === property)
  const tasks = data ? scope(data.tasks).filter(t => dayKey(t.due_at) === dayKey(now)).sort((a, b) => a.due_at.localeCompare(b.due_at)) : []
  const residents = data ? currentResidents(data, property, now) : []
  const filtered = residents.filter(r => `${r.name} ${r.unit} ${r.property} ${r.status}`.toLowerCase().includes(search.trim().toLowerCase()))
  const alerts = data ? scope(data.alerts).filter(a => ['open', 'acknowledged'].includes(a.status)).sort((a, b) => b.alert_time.localeCompare(a.alert_time)) : []
  const incidents = data ? scope(data.incidents).sort((a, b) => b.incident_time.localeCompare(a.incident_time)) : []
  const trend = incidentTrend(incidents, now)
  const maximum = Math.max(5, ...trend.current.map(d => d.count))
  function exportSummary() {
    if (!data) return
    const rows = [['Metric', 'Value'], ['Residents', String(residents.length)], ['Tasks due today', String(tasks.length)], ['Unresolved alerts', String(alerts.length)], ['Incidents in last 7 calendar days', String(trend.total)], ['Previous 7 calendar days', String(trend.previousTotal)], ['Timezone', zone], ['Snapshot', now.toISOString()], ...trend.current.map(d => [d.day, String(d.count)])]
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'communitycare-dashboard.csv'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div id="staff-top" className="sd-live-dashboard">
    {error && <p className="sd-error" role="alert">Could not load dashboard: {error}. Reload the browser page to retry.</p>}
    {loading && <p role="status">Loading records…</p>}
    {data && !loading && <>
      <label className="sd-db-filter">Property <select value={property} onChange={e => setProperty(e.target.value)}><option value="">All accessible properties</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {!data.properties.length && <p className="sd-notice">No accessible properties. Check your active staff membership.</p>}
      <main className="sd-dashboard" id="staff-main">
        <div className="sd-left-column">
          <section className="sd-card sd-alert-card"><div className="sd-card-heading"><h2><StaffIcon name="alerts" />Urgent Alerts</h2><span className="sd-badge sd-missed">{alerts.length} Unresolved</span></div>
            {!alerts.length && <p>No unresolved alerts.</p>}
            {alerts.slice(0, 10).map(a => <article className="sd-alert-item" key={a.id}><h3>{label(a.alert_type)} · {data.users.find(u => u.id === a.elderly_id)?.full_name ?? 'Name unavailable'}</h3><p>{formatTime(a.alert_time)}</p><p className="sd-event-time">{label(a.status)}</p><div className="sd-alert-actions"><button disabled={!onPage} onClick={() => onPage?.('alerts')}>View alerts</button><button disabled title="Acknowledgement is not connected yet">{a.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</button></div></article>)}
            {alerts.length > 10 && <p>Showing the latest 10 of {alerts.length} unresolved alerts.</p>}
            
            <p className="sd-muted">Acknowledgement is not available here yet.</p>
          </section>
          <section className="sd-card"><h2>Quick Actions</h2><div className="sd-quick-grid">{quickActions.map(action => <button key={action.label} disabled={action.label !== 'Generate Report'} title={action.label === 'Generate Report' ? 'Export current dashboard summary' : 'Not available yet'} onClick={exportSummary}><StaffIcon name={action.icon} /><span>{action.label}</span></button>)}</div><p className="sd-muted">Greyed-out actions are not available yet.</p></section>
        </div>
        <div className="sd-right-column">
          <section className="sd-card"><div className="sd-card-heading"><h2 className="sd-heading-accent">Daily Tasks</h2><button className="sd-primary" disabled title="Task creation is not connected yet"><StaffIcon name="plus" />Create Task</button></div><p>Due {dayKey(now)} · {zone}</p>
            <div className="sd-table-wrap"><table><thead><tr><th>Task</th><th>Assignee</th><th>Property</th><th>Due</th><th>Status</th></tr></thead><tbody>{tasks.map(t => {
              const member = data.memberships.find(m => m.id === t.assigned_membership_id)
              const assignee = member && data.users.find(u => u.id === member.staff_id)
              return <tr key={t.id}><th scope="row">{t.title}</th><td>{t.assigned_membership_id ? t.staff_name ?? assignee?.full_name ?? 'Name unavailable' : 'Unassigned'}</td><td>{data.properties.find(p => p.id === t.property_id)?.name ?? 'Unavailable'}</td><td>{formatTime(t.due_at)}</td><td><span className={`sd-badge ${badge(t.status)}`}>{label(t.status)}</span></td></tr>
            })}{!tasks.length && <tr><td colSpan={5}>No tasks due today.</td></tr>}</tbody></table></div>
          </section>
          <section className="sd-card"><div className="sd-card-heading"><h2 className="sd-heading-accent">Residents Overview</h2><label className="sd-search"><StaffIcon name="search" /><input aria-label="Search residents" placeholder="Search residents…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
            <div className="sd-table-wrap"><table><thead><tr><th>Name</th><th>Unit</th><th>Property</th><th>Account status</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><th scope="row"><span className="sd-resident-name"><span className="sd-avatar">{r.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>{r.name}</span></th><td>{r.unit}</td><td>{r.property}</td><td><span className={`sd-badge ${badge(r.status)}`}>{label(r.status)}</span></td></tr>)}{!filtered.length && <tr><td colSpan={4}>No matching current residents.</td></tr>}</tbody></table></div><p className="sd-results">{filtered.length} of {residents.length} current residents</p>
          </section>
          <section className="sd-card"><div className="sd-heading-accent"><h2>Weekly Incident Trends</h2><p className="sd-chart-description">{trend.total} incidents · Previous 7 days: {trend.previousTotal}. Today is a partial day.</p></div><p className="sd-muted">Counts use incident records, not emergency alerts.</p>
            <div className="sd-chart-frame"><div className="sd-chart" role="img" aria-label={trend.current.map(d => `${d.day}: ${d.count}`).join(', ')}>
              <div className="sd-chart-y" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i}>{Math.ceil(maximum / 5) * (5 - i)}</span>)}</div>
              <div className="sd-chart-bars" aria-hidden="true">{trend.current.map(d => <div className="sd-bar-column" key={d.day}><div className="sd-bar-stack"><div style={{ height: `${d.count / (Math.ceil(maximum / 5) * 5) * 100}%`, backgroundColor: '#42a5f5' }} /></div><span>{d.day.slice(5)}</span></div>)}</div>
            </div><div className="sd-chart-legend"><span><i style={{ backgroundColor: '#42a5f5' }} />Recorded incidents ({trend.total})</span></div></div>
            <details className="sd-chart-data"><summary>View chart data</summary><table><thead><tr><th>Date ({zone})</th><th>Incidents</th></tr></thead><tbody>{trend.current.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.count}</td></tr>)}</tbody></table></details>
          </section>
          <section className="sd-card"><h2>Recent Incidents</h2><p className="sd-muted">Latest 10 records in the selected scope.</p>{!incidents.length && <p>No incidents recorded.</p>}{incidents.slice(0, 10).map(i => <article className="sd-recent-incident" key={i.id}><div><strong>{i.incident_type}</strong><p>{i.description}</p><p>{i.location ?? 'Location not recorded'} · {formatTime(i.incident_time)}</p></div><span className={`sd-badge ${badge(i.status)}`}>{label(i.status)}</span></article>)}</section>
        </div>
      </main>
    </>}
  </div>
}
