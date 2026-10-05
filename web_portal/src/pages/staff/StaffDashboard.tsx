import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import StaffIcon from './StaffIcon'
import type { StaffIconName } from './StaffIcon'
import { usePortal } from './PortalContext'
import { initialAlerts, initialTasks, residents, incidentWeek, incidentCategories, incidentColors, categoryTotals, weekTotal } from './staffDemoData'
import type { Task } from './staffDemoData'
import './StaffDashboard.css'

type Modal = { kind: 'info'; title: string; message: string } | { kind: 'task' } | { kind: 'logout' } | null
const quickActions: { label: string; icon: StaffIconName }[] = [
  { label: 'New Task', icon: 'tasks' }, { label: 'Register Staff', icon: 'staff' },
  { label: 'Add Resident', icon: 'residents' }, { label: 'Log Incident', icon: 'incidents' },
  { label: 'Generate Report', icon: 'reports' }, { label: 'Send Alert', icon: 'alerts' },
  { label: 'Assign Shift', icon: 'shift' }, { label: 'Create Maintenance', icon: 'maintenance' },
]

function DashboardDialog({ modal, onClose, onCreate, onLogout }: {
  modal: NonNullable<Modal>; onClose: () => void; onCreate: (task: Task) => void; onLogout: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [error, setError] = useState('')
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close() }, [])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const description = String(form.get('description') ?? '').trim()
    const location = String(form.get('location') ?? '').trim()
    if (!description || !location) { setError('Enter a task description and location.'); return }
    onCreate({ id: crypto.randomUUID(), description, location, assignee: String(form.get('assignee') || 'Unassigned'), status: 'Pending' })
    onClose()
  }
  return <dialog ref={ref} className="sd-dialog" aria-labelledby={titleId} onCancel={onClose}>
    <h2 id={titleId}>{modal.kind === 'task' ? 'Create Task' : modal.kind === 'logout' ? 'Leave staff preview?' : modal.title}</h2>
    {modal.kind === 'task' ? <form onSubmit={submit}>
      <p>Saved only for this preview session.</p>
      <label>Task description<input name="description" required maxLength={160} autoFocus /></label>
      <label>Assignee<select name="assignee" defaultValue="Unassigned"><option>Unassigned</option><option>Nurse Joy</option><option>Bob Builder</option></select></label>
      <label>Location<input name="location" required maxLength={100} /></label>
      {error && <p role="alert" className="sd-error">{error}</p>}
      <div className="sd-dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className="sd-primary" type="submit">Create task</button></div>
    </form> : <>
      <p>{modal.kind === 'logout' ? 'Your sample task changes and alert acknowledgements will be reset.' : modal.message}</p>
      <div className="sd-dialog-actions"><button type="button" autoFocus onClick={onClose}>{modal.kind === 'logout' ? 'Stay' : 'Close'}</button>
        {modal.kind === 'logout' && <button type="button" className="sd-primary" onClick={onLogout}>Leave preview</button>}</div>
    </>}
  </dialog>
}

export default function StaffDashboard({ onLogout, onResidents, onTasks, onPage }: { onLogout: () => void; onResidents?: () => void; onTasks?: () => void; onPage?: (page: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks.map((task) => ({ ...task })))
  const [alerts, setAlerts] = useState(() => initialAlerts.map((alert) => ({ ...alert })))
  const { search, setSearch } = usePortal()
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const visibleResidents = residents.filter((resident) => [resident.name, resident.unit, resident.careLevel, resident.status].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const newAlerts = alerts.filter((alert) => !alert.acknowledged).length

  function planned(title: string) {
    const destination: Record<string, string> = { 'Register Staff': 'staff', 'Log Incident': 'incidents', 'Send Alert': 'alerts', 'Assign Shift': 'staff', 'Create Maintenance': 'tasks', 'Staff': 'staff' };
    if (destination[title] && onPage) { onPage(destination[title]); return }
    setModal({ kind: 'info', title, message: `${title} is planned for a separate module. This dashboard preview does not create accounts, send messages or change real records.` })
  }
  function report() {
    const lines = ['CommunityCare Staff Preview Report', 'Sample data only - not a live operational report',
      `Residents,${residents.length}`, `Tasks,${tasks.length}`, `Completed tasks,${tasks.filter((task) => task.status === 'Completed').length}`,
      `Unacknowledged sample alerts,${newAlerts}`, `Sample week incidents,${weekTotal}`,
      ...incidentCategories.map((category, index) => `${category},${categoryTotals[index]}`)]
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'communitycare-sample-report.csv'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Sample summary exported as CSV. It contains demonstration data only.')
  }
  function quick(label: string) { if (label === 'New Task') { if (onTasks) onTasks(); else setModal({ kind: 'task' }) } else if (label === 'Generate Report') report(); else if (label === 'Add Resident' && onResidents) onResidents(); else planned(label) }

  return <div id="staff-top" tabIndex={-1}>
      {notice && <div className="sd-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
      <main id="staff-main" tabIndex={-1} className="sd-dashboard">
        <div className="sd-left-column">
          <section className="sd-card sd-alert-card" id="staff-alerts" tabIndex={-1} aria-labelledby="sd-alert-title">
            <div className="sd-card-heading"><h2 id="sd-alert-title"><StaffIcon name="alerts" />Urgent Alerts</h2><span className="sd-badge sd-missed">{newAlerts} New</span></div>
            {alerts.map((alert) => <article className="sd-alert-item" key={alert.id}>
              <h3>{alert.title}</h3><p>{alert.detail}</p><p className="sd-event-time">{alert.time}</p>
              <div className="sd-alert-actions"><button type="button" onClick={() => setModal({ kind: 'info', title: alert.title, message: `${alert.detail}. ${alert.time}. This is a sample event; no real emergency response has been initiated.` })}>View details</button>
                <button type="button" disabled={alert.acknowledged} onClick={() => { setAlerts((old) => old.map((item) => item.id === alert.id ? { ...item, acknowledged: true } : item)); setNotice('Alert acknowledged in this preview. It is not resolved and nobody was notified.') }}>{alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}</button></div>
            </article>)}
          </section>
          <section className="sd-card"><h2>Quick Actions</h2><div className="sd-quick-grid">{quickActions.map((action) => <button type="button" key={action.label} onClick={() => quick(action.label)}><StaffIcon name={action.icon} /><span>{action.label}</span></button>)}</div></section>
        </div>
        <div className="sd-right-column">
          <section className="sd-card" id="staff-tasks" tabIndex={-1} aria-labelledby="sd-task-title">
            <div className="sd-card-heading"><h2 id="sd-task-title" className="sd-heading-accent">Daily Tasks</h2><button type="button" className="sd-primary" onClick={() => setModal({ kind: 'task' })}><StaffIcon name="plus" />Create Task</button></div>
            <div className="sd-table-wrap" role="region" aria-label="Daily tasks table" tabIndex={0}><table><thead><tr><th>Task Description</th><th>Assignee</th><th>Location</th><th>Status</th></tr></thead><tbody>
              {tasks.map((task) => <tr key={task.id} className={task.status === 'Missed' ? 'sd-missed-row' : ''}><th scope="row">{task.description}</th><td>{task.assignee}</td><td>{task.location}</td><td><span className={`sd-badge sd-${task.status.toLowerCase()}`}>{task.status}</span>
                {task.status === 'Pending' && <button type="button" className="sd-complete" aria-label={`Complete ${task.description}`} onClick={() => { setTasks((old) => old.map((item) => item.id === task.id ? { ...item, status: 'Completed' } : item)); setNotice('Task completed in this demo session.') }}>Complete</button>}
              </td></tr>)}
            </tbody></table></div>
          </section>
          <section className="sd-card" id="staff-residents" tabIndex={-1} aria-labelledby="sd-resident-title">
            <div className="sd-card-heading"><h2 id="sd-resident-title" className="sd-heading-accent">Residents Overview</h2><label className="sd-search"><StaffIcon name="search" /><input ref={searchInput} type="search" aria-label="Filter residents" placeholder="Search residents..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
            <div className="sd-table-wrap" role="region" aria-label="Residents table" tabIndex={0}><table><thead><tr><th>Name</th><th>Unit</th><th>Care Level</th><th>Status</th></tr></thead><tbody>
              {visibleResidents.map((resident) => <tr key={resident.id}><th scope="row"><span className="sd-resident-name"><span className={`sd-avatar ${resident.status === 'Monitoring' ? 'sd-avatar-alert' : ''}`}>{resident.initials}</span>{resident.name}</span></th><td>{resident.unit}</td><td>{resident.careLevel}</td><td><span className={`sd-badge ${resident.status === 'Monitoring' ? 'sd-missed' : 'sd-active'}`}>{resident.status}</span></td></tr>)}
              {visibleResidents.length === 0 && <tr><td colSpan={4} className="sd-empty">No residents found. Try a name, unit or care level.</td></tr>}
            </tbody></table></div>
            <p className="sd-results" aria-live="polite">{visibleResidents.length} of {residents.length} sample residents</p>
          </section>
          <section className="sd-card" id="staff-trends" tabIndex={-1} aria-labelledby="sd-trend-title">
            <div className="sd-heading-accent"><h2 id="sd-trend-title">Weekly Incident Trends</h2><p className="sd-chart-description">Sample week: {weekTotal} incidents · <span>↓ {Math.round((17 - weekTotal) / 17 * 100)}% from previous sample week (17)</span></p></div>
            <div className="sd-chart-frame"><div className="sd-chart" role="img" aria-label={`Sample incidents from Monday to Sunday: ${incidentWeek.map((day) => `${day.day} ${day.counts.reduce((a, b) => a + b, 0)}`).join(', ')}. Total ${weekTotal}.`}>
              <div className="sd-chart-y" aria-hidden="true">{[5, 4, 3, 2, 1, 0].map((n) => <span key={n}>{n}</span>)}</div>
              <div className="sd-chart-bars" aria-hidden="true">{incidentWeek.map((day) => <div className="sd-bar-column" key={day.day}><div className="sd-bar-stack">{day.counts.map((value, i) => <div key={i} style={{ height: `${value / 5 * 100}%`, backgroundColor: incidentColors[i] }} />)}</div><span>{day.day}</span></div>)}</div>
            </div><div className="sd-chart-legend">{incidentCategories.map((category, i) => <span key={category}><i style={{ backgroundColor: incidentColors[i] }} />{category} ({categoryTotals[i]})</span>)}</div></div>
            <details className="sd-chart-data"><summary>View chart data</summary><div className="sd-table-wrap"><table><thead><tr><th>Day</th>{incidentCategories.map((category) => <th key={category}>{category}</th>)}</tr></thead><tbody>{incidentWeek.map((day) => <tr key={day.day}><th scope="row">{day.day}</th>{day.counts.map((count, i) => <td key={i}>{count}</td>)}</tr>)}</tbody></table></div></details>
          </section>
          <section className="sd-card" id="staff-incidents" tabIndex={-1} aria-labelledby="sd-incident-title"><h2 id="sd-incident-title">Recent Incidents</h2><p className="sd-muted">Sample events matching the alert panel. Acknowledging an alert does not resolve an incident.</p>
            {alerts.map((alert) => <div className="sd-recent-incident" key={alert.id}><div><strong>{alert.title}</strong><p>{alert.detail}</p></div><span className="sd-badge sd-pending">Open</span></div>)}
          </section>
        </div>
      </main>
    {modal && <DashboardDialog modal={modal} onClose={() => setModal(null)} onCreate={(task) => { setTasks((old) => [...old, task]); setNotice('Task created for this demo session.'); }} onLogout={onLogout} />}
  </div>
}



