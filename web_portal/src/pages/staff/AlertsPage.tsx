import { useState } from 'react'
import type { FormEvent } from 'react'
import { staffNames, usePortal } from './PortalContext'
import { Badge, includesSearch, Notice, Panel, Table } from './PortalUI'

export default function AlertsPage() {
  const { alerts, setAlerts, setIncidents, search, print } = usePortal()
  const [selectedId, setSelectedId] = useState('ALT-102')
  const [filter, setFilter] = useState('All statuses')
  const [notice, setNotice] = useState('')
  const selected = alerts.find(a => a.id === selectedId)!
  const visible = alerts.filter(a => includesSearch(search, a.id, a.name, a.unit, a.type) && (filter === 'All statuses' || a.status === filter))
  function assign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const staff = String(new FormData(e.currentTarget).get('staff') || '')
    if (!staffNames.includes(staff)) return
    setAlerts(list => list.map(a => a.id === selected.id ? { ...a, responder: staff } : a))
    setIncidents(list => list.map(i => i.alertId === selected.id ? { ...i, staff } : i))
    setNotice(`${selected.id} assigned to ${staff} in this demo. No notification was sent.`)
  }
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); const actions = String(form.get('actions') || '').trim(); const notes = String(form.get('notes') || '').trim()
    if (!actions) { setNotice('Enter the actions taken before saving.'); return }
    const resolved = form.get('outcome') === 'Resolved'
    setAlerts(list => list.map(a => a.id === selected.id ? { ...a, actions, notes, status: resolved ? 'Resolved' : 'Pending' } : a))
    setIncidents(list => {
      const existing = list.find(i => i.alertId === selected.id)
      const change = { action: actions, status: resolved ? 'Completed' as const : 'Pending' as const, staff: selected.responder }
      if (existing) return list.map(i => i.id === existing.id ? { ...i, ...change } : i)
      return [{ id: `INC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, alertId: selected.id, type: selected.type, name: selected.name, unit: selected.unit, date: selected.time, location: `Unit ${selected.unit}`, description: `${selected.type} alert received.`, evidence: '', ...change }, ...list]
    })
    setNotice('Demo report saved. The linked record in Incidents is updated. Additional notes stay in this alert record.')
  }
  return <div className="pp-main">
    <Notice>{notice}</Notice>
    <Panel title="Emergency Alerts" className="pp-critical" actions={<select aria-label="Filter alert status" value={filter} onChange={e => setFilter(e.target.value)}>{['All statuses', 'Active', 'Pending', 'Resolved'].map(s => <option key={s}>{s}</option>)}</select>}>
      <Table label="Emergency alert list"><thead><tr>{['Alert ID', 'Resident', 'Unit', 'Type', 'Time', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(a => <tr key={a.id} className={a.id === selectedId ? 'pp-selected' : ''}><th scope="row">#{a.id}</th><td>{a.name}</td><td>{a.unit}</td><td>{a.type}</td><td>{a.time.slice(11)}</td><td><Badge value={a.status} /></td><td><button aria-pressed={a.id === selectedId} onClick={() => { setSelectedId(a.id); setNotice('') }}>Review {a.id}</button></td></tr>)}{!visible.length && <tr><td colSpan={7}>No alerts match your search.</td></tr>}</tbody></Table>
      <p className="pp-muted">Sample events · 6 October 2026. Review a row to change the selected alert below.</p>
    </Panel>
    <div className="pp-alert-grid"><div className="pp-stack">
      <Panel title="Responder Assignment" className="pp-responder"><p><strong>Selected: {selected.id}</strong> · {selected.name}</p><div className="pp-inset">Responder: <strong>{selected.responder || 'Unassigned'}</strong><p className="pp-muted">Response time: not measured in this preview.</p></div><form key={`assign-${selected.id}-${selected.responder}`} onSubmit={assign}><label>Reassign responder<select name="staff" defaultValue={selected.responder} required disabled={selected.status === 'Resolved'}><option value="">Select available staff...</option>{staffNames.map(s => <option key={s}>{s}</option>)}</select></label><button className="sd-primary" disabled={selected.status === 'Resolved'}>Assign Responder</button></form></Panel>
      <Panel title="Incident Documentation"><form key={`report-${selected.id}-${selected.actions}-${selected.notes}-${selected.status}`} onSubmit={save}><label>Actions Taken<textarea name="actions" defaultValue={selected.actions} required maxLength={1200} placeholder="Detail immediate actions..." /></label><label>Outcome<select name="outcome" defaultValue={selected.status === 'Resolved' ? 'Resolved' : 'Pending'}><option value="Pending">Pending Resolution</option><option value="Resolved">Resolved</option></select></label><label>Additional Notes<textarea name="notes" defaultValue={selected.notes} maxLength={1200} placeholder="Optional internal notes..." /></label><div className="pp-actions"><button type="button" onClick={() => print({ title: `Saved Alert ${selected.id}`, headings: ['Resident', 'Unit', 'Type', 'Status', 'Responder', 'Actions', 'Notes'], rows: [[selected.name, selected.unit, selected.type, selected.status, selected.responder || 'Unassigned', selected.actions || 'Not saved', selected.notes]], note: 'Exports saved fields; save your form changes first.' })}>Print / Save PDF</button><button className="sd-primary">Save Report</button></div></form></Panel>
    </div><Panel title="Incident Location Preview" actions={<Badge value={selected.status} />}>
      <p><strong>{selected.name} · Unit {selected.unit}</strong></p><p className="pp-muted">Illustrative site plan only. No GPS, map service or camera is connected.</p>
      <div className="pp-map"><svg viewBox="0 0 560 400" role="img" aria-label={`Illustrative community site plan for unit ${selected.unit}; not a real location.`}><rect width="560" height="400" fill="#eaf0e9" /><path d="M-20 340 L590 55" stroke="#fff" strokeWidth="100" /><path d="M-20 340 L590 55" stroke="#e8d5b7" strokeWidth="62" /><path d="M-20 340 L590 55" stroke="#fff" strokeWidth="2" strokeDasharray="12 12" /><g fill="#c1d4c7" stroke="#a4bcae" strokeWidth="2"><rect x="30" y="40" width="130" height="95" rx="10" /><rect x="200" y="30" width="110" height="95" rx="10" /><rect x="330" y="240" width="160" height="115" rx="10" /><rect x="80" y="320" width="90" height="55" rx="8" /></g><g fill="#4b6a58" fontSize="15"><text x="52" y="93">Residence A</text><text x="214" y="86">Garden</text><text x="355" y="300">Residence B</text></g><circle cx={selected.unit.startsWith('A') ? 100 : 410} cy={selected.unit.startsWith('A') ? 155 : 220} r="25" fill="#dc4f4f44" /><circle cx={selected.unit.startsWith('A') ? 100 : 410} cy={selected.unit.startsWith('A') ? 155 : 220} r="12" fill="#c92e37" /></svg><div className="pp-map-caption"><strong>Unit {selected.unit} · Location placeholder</strong>No live position is being displayed.</div></div>
      <div className="pp-camera"><div><strong>Camera feed not connected</strong><p>A live view can be added after device integration.</p></div></div>
    </Panel></div>
  </div>
}

