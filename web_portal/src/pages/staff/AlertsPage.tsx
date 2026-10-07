import { useState } from 'react'
import { usePortal } from './PortalContext'
import { Badge, includesSearch, Notice, Panel, Table } from './PortalUI'
import AlertLocationMap from './AlertLocationMap'
import { displayAlertTime } from './alertData'

export default function AlertsPage() {
  const { alerts, alertsLoading, alertsError, alertsUpdatedAt, refreshAlerts, search } = usePortal()
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState('All statuses')
  const visible = alerts.filter(a => includesSearch(search, a.id, a.name, a.unit, a.type) && (filter === 'All statuses' || a.status === filter))
  const selected = visible.find(a => a.id === selectedId) ?? visible[0]
  return <div className="pp-main">
    <Panel title="Emergency Alerts" className="pp-critical" actions={<>
      <select aria-label="Filter alert status" value={filter} onChange={e => setFilter(e.target.value)}>{['All statuses', 'Active', 'Pending', 'Resolved', 'Cancelled'].map(s => <option key={s}>{s}</option>)}</select>
      <button type="button" onClick={() => void refreshAlerts()} disabled={alertsLoading}>{alertsLoading ? 'Loading…' : 'Refresh alerts'}</button>
    </>}>
      <p className="pp-muted">Supabase records · Latest 100 accessible alerts. Times shown in Malaysia time. Use Refresh alerts to fetch changes.</p>
      {alertsLoading ? <Notice>Loading alerts from Supabase…</Notice> : alertsError ? <div role="alert"><strong>Could not load alerts</strong><p>{alertsError}</p><p>Check your connection and account permissions, then press Refresh alerts.</p></div> : <>
        <Table label="Emergency alert list"><thead><tr>{['Alert ID', 'Resident', 'Current unit', 'Type', 'Time (MYT)', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{visible.map(a => <tr key={a.id} className={a.id === selected?.id ? 'pp-selected' : ''}><th scope="row" title={a.id}>{a.id.slice(0, 8)}</th><td>{a.name}</td><td>{a.unit}</td><td>{a.type}</td><td>{displayAlertTime(a.time)}</td><td><Badge value={a.status} /></td><td><button aria-pressed={a.id === selected?.id} onClick={() => setSelectedId(a.id)}>Review</button></td></tr>)}
            {!visible.length && <tr><td colSpan={7}>{alerts.length ? 'No alerts match your search or filter.' : 'No accessible alerts yet. Alerts appear here after they are recorded for a property assigned to your account.'}</td></tr>}
          </tbody></Table>
        {alertsUpdatedAt && <p className="pp-muted">Last fetched: {displayAlertTime(alertsUpdatedAt)}. An empty result can also mean your account has no assigned property.</p>}
      </>}
    </Panel>
    {selected && !alertsLoading && !alertsError && <div className="pp-alert-grid"><div className="pp-stack">
      <Panel title="Responder Assignment" className="pp-responder"><p><strong>{selected.name}</strong></p><p style={{ overflowWrap: 'anywhere' }}>Alert ID: {selected.id}</p><div className="pp-inset" style={{ overflowWrap: 'anywhere' }}>Responder: <strong>{selected.responder}</strong></div><p className="pp-muted">Responder assignment is read-only in this version. Staff names are not inferred from demo data.</p><button type="button" disabled>Assign Responder</button></Panel>
      <Panel title="Incident Documentation"><p>This version connects alert reading and the map. Saving incident reports will be enabled after the database write workflow is connected.</p><button type="button" disabled>Save Report</button></Panel>
    </div><Panel title="Incident Location" actions={<Badge value={selected.status} />}>
      <AlertLocationMap key={`${selected.id}:${selected.coordinates?.join(',') ?? 'none'}`} alert={selected} />
      <p className="pp-muted">Source: {selected.source} · Current unit is not a snapshot of the unit at the time of the alert.</p>
      <div className="pp-camera"><div><strong>Camera feed not connected</strong><p>A live view can be added after device integration.</p></div></div>
    </Panel></div>}
  </div>
}
