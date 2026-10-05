import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import StaffIcon from './StaffIcon'
import { usePortal } from './PortalContext'
import './StaffDashboard.css'
import './ResidentPage.css'

type Resident = { id: string; name: string; age: string; gender: string; unit: string; blood: string; device: string; status: 'Online' | 'Active Alert' | 'Offline'; checkIn: string }
const seed: Resident[] = [
  { id: 'r1', name: 'Eleanor Shellstrop', age: '75', gender: 'Female', unit: 'A-101', blood: 'O+', device: 'Watch #9912', status: 'Online', checkIn: '10:00 · Sample' },
  { id: 'r2', name: 'Chidi Anagonye', age: '72', gender: 'Male', unit: 'B-204', blood: 'Unknown', device: 'Pendant #4928', status: 'Active Alert', checkIn: '09:58 · Sample' },
  { id: 'r3', name: 'Tahani Al-Jamil', age: '68', gender: 'Female', unit: 'P-001', blood: 'Unknown', device: 'Watch #1122', status: 'Online', checkIn: '10:00 · Sample' },
  { id: 'r4', name: 'Jason Mendoza', age: '70', gender: 'Male', unit: 'C-310', blood: 'Unknown', device: 'Pendant #7810', status: 'Offline', checkIn: '06:00 · Sample' },
]
const blank = { name: '', age: '', gender: '', unit: '', blood: 'Unknown', device: '' }
const devices = ['Watch #9912', 'Pendant #4928', 'Watch #1122', 'Pendant #7810', 'Watch #2201', 'Pendant #6300']
const week = [2, 3, 1, 5, 2, 1, 3]
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() }
function statusClass(status: string) { return status === 'Online' ? 'rm-online' : status === 'Active Alert' ? 'rm-alert' : 'rm-offline' }

export default function ResidentPage({ onLogout }: { onLogout: () => void }) {
  const [residents, setResidents] = useState<Resident[]>(seed)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<string | null>(null)
  const { search, setSearch } = usePortal()
  const [status, setStatus] = useState('All Statuses')
  const [unit, setUnit] = useState('All Units')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ title: string; resident?: Resident; message?: string; logout?: boolean } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close() }, [modal])
  const visible = residents.filter(r => [r.name, r.unit, r.device].join(' ').toLowerCase().includes(search.trim().toLowerCase()) && (status === 'All Statuses' || r.status === status) && (unit === 'All Units' || r.unit === unit))
  function reset() { setForm(blank); setEditing(null); setError('') }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.unit.trim() || !form.gender || !form.age || !Number.isInteger(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120) { setError('Enter a name, unit, gender and a whole-number age from 1 to 120.'); return }
    if (form.device && residents.some(r => r.id !== editing && r.device === form.device)) { setError('This device is already assigned to another resident.'); return }
    const old = residents.find(r => r.id === editing)
    const next: Resident = { ...form, name: form.name.trim(), unit: form.unit.trim().toUpperCase(), id: editing ?? crypto.randomUUID(), status: old && old.device === form.device ? old.status : 'Offline', checkIn: old?.checkIn ?? 'No check-in yet' }
    setResidents(list => editing ? list.map(r => r.id === editing ? next : r) : [...list, next])
    setSearch(''); setStatus('All Statuses'); setUnit('All Units')
    setNotice(`${next.name} ${editing ? 'updated' : 'added'} in this preview only. No account was created.`)
    reset()
  }
  function edit(r: Resident) { setEditing(r.id); setForm({ name: r.name, age: r.age, gender: r.gender, unit: r.unit, blood: r.blood, device: r.device }); setError(''); nameInput.current?.focus(); nameInput.current?.scrollIntoView({ block: 'center' }) }
  function exportCsv() {
    const cell = (value: string) => '"' + (/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"'
    const rows = [['Resident', 'Unit', 'Device', 'Status'], ...visible.map(r => [r.name, r.unit, r.device || 'Unassigned', r.status])]
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'communitycare-demo-residents.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${visible.length} filtered demo residents.`)
  }
  return <div className="rm-app">
      <main id="resident-main" className="rm-main" tabIndex={-1}>
        {notice && <div className="rm-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
        <div className="rm-top">
          <section className="rm-panel rm-register"><h2><StaffIcon name="residents" />{editing ? 'Edit Resident' : 'Register New Resident'}</h2>
            <form onSubmit={submit}>
              <label>Full Name<input ref={nameInput} value={form.name} maxLength={100} required placeholder="Jane Doe" onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              <div className="rm-fields"><label>Age<input type="number" min="1" max="120" step="1" required placeholder="75" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></label><label>Gender<select required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Select...</option>{['Female', 'Male', 'Other', 'Prefer not to say'].map(v => <option key={v}>{v}</option>)}</select></label></div>
              <div className="rm-fields"><label>Unit Number<input required maxLength={30} placeholder="A-101" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></label><label>Blood Type<select value={form.blood} onChange={e => setForm({ ...form, blood: e.target.value })}>{['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => <option key={v}>{v}</option>)}</select></label></div>
              <label>Assigned Device<select value={form.device} onChange={e => setForm({ ...form, device: e.target.value })}><option value="">No device assigned</option>{devices.map(d => <option key={d} disabled={residents.some(r => r.id !== editing && r.device === d)}>{d}</option>)}</select></label>
              {error && <p className="sd-error" role="alert">{error}</p>}
              <div className="rm-form-actions"><button className="sd-primary" type="submit">{editing ? 'Save Changes' : 'Register Resident'}</button><button type="button" onClick={reset}>Cancel</button></div>
              <p className="sd-muted">Preview record only. New devices stay offline until connected.</p>
            </form>
          </section>
          <section className="rm-panel rm-directory"><div className="rm-panel-heading"><h2><StaffIcon name="residents" />Resident Directory</h2><button className="rm-link" onClick={exportCsv}>↓ Export</button></div><div className="sd-table-wrap" tabIndex={0} role="region" aria-label="Resident directory table"><table><thead><tr>{['Resident', 'Unit', 'Device', 'Status', 'Actions'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map(r => <tr key={r.id}><th scope="row"><span className="sd-resident-name"><span className="sd-avatar">{initials(r.name)}</span>{r.name}</span></th><td>{r.unit}</td><td>{r.device || 'Unassigned'}</td><td><span className={`rm-badge ${statusClass(r.status)}`}>● {r.status}</span></td><td><div className="rm-row-actions"><button aria-label={`View ${r.name}`} onClick={() => setModal({ title: 'Resident Details', resident: r })}>View</button><button aria-label={`Edit ${r.name}`} onClick={() => edit(r)}>Edit</button></div></td></tr>)}{visible.length === 0 && <tr><td colSpan={5} className="sd-empty">No residents match these filters.</td></tr>}</tbody></table></div><p className="rm-count">{visible.length} of {residents.length} demo residents</p></section>
        </div>
        <section className="rm-overview"><div className="rm-overview-heading"><h2>Resident Status Overview</h2><div className="rm-filters"><select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>{['All Statuses', 'Online', 'Active Alert', 'Offline'].map(v => <option key={v}>{v}</option>)}</select><select aria-label="Filter by unit" value={unit} onChange={e => setUnit(e.target.value)}><option>All Units</option>{[...new Set(residents.map(r => r.unit))].sort().map(v => <option key={v}>{v}</option>)}</select><button className="rm-link" onClick={() => { setSearch(''); setStatus('All Statuses'); setUnit('All Units') }}>Clear</button></div></div><div className="rm-status-layout"><div className="rm-status-cards">{visible.map(r => <article className="rm-panel rm-status-card" key={r.id}><div className="sd-resident-name"><span className="sd-avatar">{initials(r.name)}</span><div><h3>{r.name}</h3><p>Unit: {r.unit}</p></div></div><dl><div><dt>Status:</dt><dd className={statusClass(r.status)}>{r.status}</dd></div><div><dt>Last Check-in:</dt><dd>{r.checkIn}</dd></div></dl></article>)}{!visible.length && <p>No matching status cards.</p>}</div><article className="rm-panel rm-week"><h3>Weekly Alert Volume</h3><p>Sample week · All residents</p><div className="rm-bars" role="img" aria-label="Sample alerts Monday 2, Tuesday 3, Wednesday 1, Thursday 5, Friday 2, Saturday 1, Sunday 3.">{week.map((value, i) => <div key={i}><span>{value}</span><i style={{ height: value * 12, background: i === 3 ? '#dd7b7b' : '#77aaa7' }} /><small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</small></div>)}</div><p>{week.reduce((a, b) => a + b, 0)} sample alerts · Not live</p></article></div></section>
      </main>
    <dialog className="sd-dialog" ref={dialog} aria-labelledby="rm-dialog-title" onCancel={() => setModal(null)}><h2 id="rm-dialog-title">{modal?.title}</h2>{modal?.resident ? <dl className="rm-detail">{Object.entries({ Name: modal.resident.name, Age: modal.resident.age, Gender: modal.resident.gender, Unit: modal.resident.unit, 'Blood type': modal.resident.blood, Device: modal.resident.device || 'Unassigned', Status: modal.resident.status }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>{modal?.message}</p>}<div className="sd-dialog-actions"><button onClick={() => setModal(null)}>Close</button>{modal?.logout && <button className="sd-primary" onClick={onLogout}>Leave preview</button>}</div></dialog>
  </div>
}

