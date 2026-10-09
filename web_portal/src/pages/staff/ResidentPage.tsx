import UnitManager from './UnitManager'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import StaffIcon from './StaffIcon'
import { usePortal } from './PortalContext'
import './StaffDashboard.css'
import './ResidentPage.css'

import { readResidents, saveResident, inviteResident, residentAge } from './residentRepository'
import type { ResidentRow, ResidentForm, Unit } from './residentRepository'
import { dayKey, recentDays } from './dashboardData'
type Resident = ResidentRow & { age: string; device: string; status: 'Active Alert' | 'No active alert'; checkIn: string }
const blank: ResidentForm = { name: '', email: '', date_of_birth: '', gender: '', unit_id: '', blood: 'unknown' }
const pretty = (v: string | null) => v ? v.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Not recorded'
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() }
function statusClass(status: string) { return status === 'No active alert' ? 'rm-online' : status === 'Active Alert' ? 'rm-alert' : 'rm-offline' }

export default function ResidentPage({ onLogout }: { onLogout: () => void }) {
  const [manageUnits, setManageUnits] = useState(false)
  const [residents, setResidents] = useState<Resident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [snapshotDay, setSnapshotDay] = useState(dayKey(new Date()))
  const pending = useRef<{ id: string; payload: string } | null>(null)
  const saving = useRef(false)
  const editingRow = useRef<ResidentRow | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadError(''); setResidents([])
    readResidents(controller.signal).then(data => {
      if (controller.signal.aborted) return
      const today = dayKey(new Date()); setSnapshotDay(today); setUnits(data.units)
      setResidents(data.residents.map(r => ({ ...r, age: residentAge(r.date_of_birth, today), device: r.mobile_device ? `${r.mobile_device.manufacturer} ${r.mobile_device.model}` : 'Not registered', status: Number(r.active_alerts) > 0 ? 'Active Alert' : 'No active alert', checkIn: r.last_check_in ? new Date(r.last_check_in).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : 'No completed check-in' })))
    }).catch(e => { if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : 'Unable to load residents.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
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
  function reset() { editingRow.current = null; setForm(blank); setEditing(null); setError('') }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current || loading || loadError) return
    if (!form.name.trim() || !form.unit_id || !form.date_of_birth || !form.gender) { setError('Enter name, birth date, gender and unit.'); return }
    saving.current = true; setBusy(true); setError(''); setNotice('')
    try {
      if (editing) {
        const row = editingRow.current
        if (!row) throw new Error('Reload the browser page and select the resident again.')
        await saveResident(row, form)
        setNotice(`${form.name.trim()} saved to the database.`)
      } else {
        const payload = JSON.stringify(form)
        if (!pending.current || pending.current.payload !== payload) pending.current = { id: crypto.randomUUID(), payload }
        setNotice(await inviteResident(pending.current.id, form))
        pending.current = null
      }
      reset(); setSearch(''); setStatus('All Statuses'); setUnit('All Units'); setRevision(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { saving.current = false; setBusy(false) }
  }
  function edit(r: Resident) { if (busy) return; editingRow.current = r; setEditing(r.id); setForm({ name: r.name, email: '', date_of_birth: r.date_of_birth ?? '', gender: r.gender ?? '', unit_id: r.unit_id, blood: r.blood ?? 'unknown' }); setError(''); nameInput.current?.focus(); nameInput.current?.scrollIntoView({ block: 'center' }) }
  function exportCsv() {
    const cell = (value: string) => '"' + (/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"'
    const rows = [['Resident', 'Unit', 'Mobile Device', 'Status'], ...visible.map(r => [r.name, r.unit, r.device || 'Unassigned', r.status])]
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'communitycare-residents.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${visible.length} filtered residents from the database.`)
  }
  const dates = recentDays(new Date(`${snapshotDay}T12:00:00+08:00`)).slice(7)
  const week = dates.map(day => visible.reduce((sum, r) => sum + Number(r.week_counts[day] ?? 0), 0))
  return <div className="rm-app">
      <main id="resident-main" className="rm-main" tabIndex={-1}>
        {notice && <div className="rm-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
        {loadError && <p className="sd-error" role="alert">{loadError} — Reload the browser page to retry.</p>}
        <div className="rm-top">
          <section className="rm-panel rm-register"><h2><StaffIcon name="residents" />{editing ? 'Edit Resident' : 'Register New Resident'}</h2>
            <form onSubmit={submit}><fieldset disabled={busy || loading || Boolean(loadError)} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
              <label>Full Name<input ref={nameInput} value={form.name} maxLength={100} required placeholder="Jane Doe" onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              {!editing && <label>Email<input type="email" required maxLength={254} autoComplete="off" value={form.email} placeholder="resident@example.com" onChange={e => setForm({ ...form, email: e.target.value })} /></label>}
              <div className="rm-fields"><label>Date of Birth<input type="date" min="1900-01-01" max={snapshotDay} required value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label><label>Gender<select required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Select...</option>{['female', 'male', 'other', 'unspecified'].map(v => <option key={v} value={v}>{pretty(v)}</option>)}</select></label></div>
              <div className="rm-fields"><label>Unit Number<button type="button" className="rm-link" disabled={busy || loading || Boolean(loadError)} onClick={() => setManageUnits(true)}>Manage units</button><select required value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })}><option value="">Select a unit…</option>{units.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label><label>Blood Type<select value={form.blood} onChange={e => setForm({ ...form, blood: e.target.value })}>{['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => <option key={v} value={v}>{v === 'unknown' ? 'Unknown' : v}</option>)}</select></label></div>
              <label>Mobile Device<input readOnly value={residents.find(r => r.id === editing)?.device ?? 'Not registered'} /></label>
              {error && <p className="sd-error" role="alert">{error}</p>}
              <div className="rm-form-actions"><button className="sd-primary" type="submit">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Register Resident'}</button><button type="button" onClick={reset}>Cancel</button></div>
              <p className="sd-muted">{editing ? 'Changes are saved to the database.' : 'Creates an elderly login account and requests an invitation email.'} Phone details are registered automatically when the elderly signs in on Android. Registration does not indicate online status.</p></fieldset>
            </form>
          </section>
          <section className="rm-panel rm-directory"><div className="rm-panel-heading"><h2><StaffIcon name="residents" />Resident Directory</h2><button className="rm-link" disabled={loading || Boolean(loadError)} onClick={exportCsv}>↓ Export</button></div><div className="sd-table-wrap" tabIndex={0} role="region" aria-label="Resident directory table"><table><thead><tr>{['Resident', 'Unit', 'Mobile Device', 'Status', 'Actions'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map(r => <tr key={r.id}><th scope="row"><span className="sd-resident-name"><span className="sd-avatar">{initials(r.name)}</span>{r.name}</span></th><td>{r.unit}<br /><small>{r.property_name}</small></td><td>{r.device || 'Unassigned'}</td><td><span className={`rm-badge ${statusClass(r.status)}`}>● {r.status}</span></td><td><div className="rm-row-actions"><button aria-label={`View ${r.name}`} onClick={() => setModal({ title: 'Resident Details', resident: r })}>View</button><button aria-label={`Edit ${r.name}`} disabled={busy} onClick={() => edit(r)}>Edit</button></div></td></tr>)}{visible.length === 0 && <tr><td colSpan={5} className="sd-empty">{loading ? 'Loading…' : loadError ? 'Data unavailable.' : 'No residents match these filters.'}</td></tr>}</tbody></table></div><p className="rm-count">{loading ? 'Loading…' : loadError ? 'Data unavailable' : `${visible.length} of ${residents.length} residents`}</p></section>
        </div>
        <section className="rm-overview"><div className="rm-overview-heading"><h2>Resident Status Overview</h2><div className="rm-filters"><select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>{['All Statuses', 'Active Alert', 'No active alert'].map(v => <option key={v}>{v}</option>)}</select><select aria-label="Filter by unit" value={unit} onChange={e => setUnit(e.target.value)}><option>All Units</option>{[...new Set(residents.map(r => r.unit))].sort().map(v => <option key={v}>{v}</option>)}</select><button className="rm-link" onClick={() => { setSearch(''); setStatus('All Statuses'); setUnit('All Units') }}>Clear</button></div></div><div className="rm-status-layout"><div className="rm-status-cards">{visible.map(r => <article className="rm-panel rm-status-card" key={r.id}><div className="sd-resident-name"><span className="sd-avatar">{initials(r.name)}</span><div><h3>{r.name}</h3><p>Unit: {r.unit}</p></div></div><dl><div><dt>Status:</dt><dd className={statusClass(r.status)}>{r.status}</dd></div><div><dt>Last Check-in:</dt><dd>{r.checkIn}</dd></div></dl></article>)}{!visible.length && <p>No matching status cards.</p>}</div><article className="rm-panel rm-week"><h3>Weekly Alert Volume</h3><p>Last 7 calendar days · Filtered current residents</p>{!loading && !loadError ? <><div className="rm-bars" role="img" aria-label={dates.map((d, i) => `${d}: ${week[i]}`).join(', ')}>{week.map((value, i) => <div key={i}><span>{value}</span><i style={{ height: value / Math.max(1, ...week) * 100, background: i === 3 ? '#dd7b7b' : '#77aaa7' }} /><small>{dates[i].slice(5)}</small></div>)}</div><p>{week.reduce((a, b) => a + b, 0)} recorded alerts · Includes today</p></> : <p>{loading ? 'Loading…' : 'Data unavailable'}</p>}</article></div></section>
      </main>
    {manageUnits && <UnitManager onClose={() => setManageUnits(false)} onSaved={saved => {
      setUnits(list => [...list.filter(u => u.id !== saved.id), saved])
      setForm(old => ({ ...old, unit_id: saved.id }))
      setNotice(`Unit ${saved.unit_number} is available and selected. Submit the resident form to save the resident's unit.`)
    }} />}
    <dialog className="sd-dialog" ref={dialog} aria-labelledby="rm-dialog-title" onCancel={() => setModal(null)}><h2 id="rm-dialog-title">{modal?.title}</h2>{modal?.resident ? <dl className="rm-detail">{Object.entries({ Name: modal.resident.name, Age: modal.resident.age, Gender: pretty(modal.resident.gender), Unit: modal.resident.unit, 'Blood type': modal.resident.blood ?? 'Not recorded', 'Mobile Device': modal.resident.device, 'Android version': modal.resident.mobile_device?.os_version ?? 'Not registered', 'Last registration': modal.resident.mobile_device ? new Date(modal.resident.mobile_device.last_registered_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }) : 'Not registered', Status: modal.resident.status }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>{modal?.message}</p>}<div className="sd-dialog-actions"><button onClick={() => setModal(null)}>Close</button>{modal?.logout && <button className="sd-primary" onClick={onLogout}>Leave preview</button>}</div></dialog>
  </div>
}

