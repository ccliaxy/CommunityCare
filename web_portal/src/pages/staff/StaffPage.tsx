import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/backendApi'
import { usePortal } from './PortalContext'
import { Badge, includesSearch, Modal, Notice, Panel, Table } from './PortalUI'

type Property = { id: string; name: string; time_zone: string; today: string; can_manage: boolean }
type Member = { id: string; staff_id: string; name: string; kind: string; active: boolean }
type Shift = { id: string; membership_id: string; start_local: string; end_local: string; coverage_area: string; status: string; revision: number }
type Attendance = { id: string; membership_id: string; clocked_in_at: string; clocked_out_at: string | null }
type Leave = { id: string; membership_id: string; starts_on: string; ends_on: string; reason: string; status: string; revision: number }
type Snapshot = { actor_id: string; can_manage: boolean; time_zone: string; today: string; week_start: string; members: Member[]; shifts: Shift[]; attendance: Attendance[]; leaves: Leave[] }
type Options = { actor_id: string; properties: Property[] }
type Command = Record<string, unknown>
type Dialog = { kind: string; title: string; command?: Command; shifts?: Shift[] }
const plus = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const message = (e: unknown) => e instanceof Error ? e.message : 'Could not complete the request.'
const label = (v: string) => v[0].toUpperCase() + v.slice(1)

export default function StaffPage({ active = true }: { active?: boolean }) {
  const { search } = usePortal()
  const [options, setOptions] = useState<Options | null>(null)
  const [property, setProperty] = useState(''), [day, setDay] = useState('')
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState(''), [formError, setFormError] = useState(''), [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null), [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0), [loading, setLoading] = useState(false)
  const busyRef = useRef(false), attempts = useRef(new Map<string, string>())
  useEffect(() => {
    if (!active) return
    const c = new AbortController()
    api<Options>('/staff/options', { signal: c.signal }).then(o => {
      if (c.signal.aborted) return
      setOptions(o)
      if (!o.properties.some(p => p.id === property)) { setProperty(o.properties[0]?.id ?? ''); setDay(o.properties[0]?.today ?? ''); setData(null) }
    }).catch(e => { if (!c.signal.aborted) setError(message(e)) })
    return () => c.abort()
  }, [active, property, tick])
  useEffect(() => {
    if (!active || !property || !day) return
    const c = new AbortController(); setLoading(true)
    api<Snapshot>(`/staff?property_id=${encodeURIComponent(property)}&day=${encodeURIComponent(day)}`, { signal: c.signal })
      .then(v => { if (!c.signal.aborted) { setData(v); setError('') } })
      .catch(e => { if (!c.signal.aborted) { setError(message(e)); setData(null) } })
      .finally(() => { if (!c.signal.aborted) setLoading(false) })
    return () => c.abort()
  }, [active, property, day, tick])
  useEffect(() => {
    if (!active) return
    const refresh = () => { if (!busyRef.current && !dialog) setTick(v => v + 1) }
    const timer = window.setInterval(refresh, 30000); window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [active, dialog])
  const manager = data?.can_manage ?? false
  const people = data?.members.filter(m => includesSearch(search, m.name)) ?? []
  const current = data?.members.filter(m => m.active) ?? []
  const own = current.find(m => m.staff_id === data?.actor_id)
  const name = (id: string) => data?.members.find(m => m.id === id)?.name ?? 'Former staff'
  const self = (id: string) => data?.members.find(m => m.id === id)?.staff_id === data?.actor_id
  const days = data ? Array.from({ length: 7 }, (_, i) => plus(data.week_start, i)) : []
  const localDay = (v: string) => new Intl.DateTimeFormat('en-CA', { timeZone: data?.time_zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(v))
  const stamp = (v: string | null) => v ? new Intl.DateTimeFormat('en-GB', { timeZone: data?.time_zone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '—'
  const todayAttendance = data?.attendance.filter(a => !a.clocked_out_at || localDay(a.clocked_in_at) === data.today) ?? []
  const openAttendance = data?.attendance.find(a => self(a.membership_id) && !a.clocked_out_at)
  function open(d: Dialog) { setFormError(''); setDialog(d) }
  async function save(body: Command, invite = false) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setFormError(''); setError('')
    const payload = { ...body, property_id: property }
    const signature = JSON.stringify({ invite, ...payload })
    let request = attempts.current.get(signature)
    if (!request) { request = crypto.randomUUID(); attempts.current.set(signature, request) }
    try {
      const result = await api<{ message: string }>(invite ? '/staff/invitations' : '/staff/commands', { method: 'POST', body: JSON.stringify({ ...payload, request_id: request }) })
      attempts.current.delete(signature); setNotice(result.message); setDialog(null); setTick(v => v + 1)
      window.dispatchEvent(new Event('communitycare:staff-changed'))
    } catch (e) { setFormError(message(e)); if (!dialog) setError(message(e)) }
    finally { busyRef.current = false; setBusy(false) }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dialog) return
    if (dialog.command) { void save(dialog.command); return }
    const f = new FormData(e.currentTarget), value = (k: string) => String(f.get(k) ?? '')
    if (dialog.kind === 'invite') { void save({ name: value('name'), email: value('email') }, true); return }
    if (dialog.kind === 'leave') { if (own) void save({ action: 'request_leave', membership_id: own.id, starts_on: value('starts_on'), ends_on: value('ends_on'), reason: value('reason') }); return }
    const common = { membership_id: value('membership_id'), coverage_area: value('coverage_area') }
    if (dialog.kind === 'shift') void save({ ...common, action: 'create_shift', start_local: value('start_local'), end_local: value('end_local') })
    else if (dialog.kind === 'coverage') void save({ ...common, action: 'coverage', shifts: dialog.shifts?.filter(s => s.membership_id === common.membership_id && s.status === 'scheduled').map(s => ({ id: s.id, revision: s.revision })) ?? [] })
  }
  const attendanceTable = (rows: Attendance[]) => <Table label="Staff attendance"><thead><tr><th>Name</th><th>In</th><th>Out</th></tr></thead><tbody>{rows.filter(a => includesSearch(search, name(a.membership_id))).map(a => <tr key={a.id}><th>{name(a.membership_id)}</th><td>{stamp(a.clocked_in_at)}</td><td>{stamp(a.clocked_out_at)}</td></tr>)}{!rows.length && <tr><td colSpan={3}>No attendance recorded.</td></tr>}</tbody></Table>
  return <div className="pp-main">
    <div className="pp-heading"><label>Property <select aria-label="Staff property" disabled={busy || !!dialog} value={property} onChange={e => { setProperty(e.target.value); setDay(options?.properties.find(p => p.id === e.target.value)?.today ?? ''); setData(null); setNotice('') }}>{options?.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{manager && <button className="sd-primary" disabled={busy} onClick={() => open({ kind: 'invite', title: 'Invite Staff' })}>Invite Staff</button>}</div>
    {error && <p className="sd-error" role="alert">{error}</p>}<Notice>{notice}</Notice>
    {!data && <p role="status">{loading ? 'Loading staff records…' : options?.properties.length === 0 ? 'No active property membership.' : 'Staff records are unavailable. Reopen this page after checking the backend.'}</p>}
    {data && <><p className="pp-muted">Times use {data.time_zone}. {manager ? 'Manager access.' : 'Your attendance and leave are private. Managers manage schedules and review leave.'}</p>
    <div className="pp-grid pp-staff-grid"><Panel title="Staff Shifts & Coverage" actions={manager && <><button disabled={busy} onClick={() => open({ kind: 'coverage', title: 'Assign Coverage Area', shifts: data.shifts.filter(s => s.start_local.slice(0, 10) >= days[0] && s.start_local.slice(0, 10) <= days[6]) })}>Assign Coverage Area</button><button disabled={busy || !current.length} className="sd-primary" onClick={() => open({ kind: 'shift', title: 'Create Shift' })}>＋ Create Shift</button></>}>
      <p className="pp-muted">Overnight shifts appear on every day they cover.</p><div className="pp-heading"><button aria-label="Previous week" disabled={busy} onClick={() => { setData(null); setDay(plus(data.week_start, -7)) }}>‹</button><strong>{days[0]} — {days[6]}</strong><button aria-label="Next week" disabled={busy} onClick={() => { setData(null); setDay(plus(data.week_start, 7)) }}>›</button><button onClick={() => { setDay(data.today); setTick(v => v + 1) }}>This week</button></div>
      <Table label="Weekly staff schedule"><thead><tr><th>Staff</th>{days.map((d, i) => <th key={d}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}<br />{d.slice(5)}</th>)}</tr></thead><tbody>{people.map(m => <tr className="pp-schedule" key={m.id}><th scope="row">{m.name}{!m.active && <small> (inactive membership)</small>}</th>{days.map(d => { const shifts = data.shifts.filter(s => s.membership_id === m.id && s.start_local < `${plus(d, 1)}T00:00` && s.end_local > `${d}T00:00`); return <td key={d}>{shifts.map(s => <span className="pp-shift" key={s.id}>{s.start_local.slice(5).replace('T', ' ')}–{s.end_local.slice(5).replace('T', ' ')}<small>{s.coverage_area || 'No coverage area'}</small>{manager && s.status === 'scheduled' && <button disabled={busy} aria-label={`Cancel shift for ${m.name} at ${s.start_local}`} onClick={() => open({ kind: 'confirm', title: 'Cancel Shift', command: { action: 'cancel_shift', id: s.id, membership_id: m.id, revision: s.revision } })}>Cancel</button>}</span>)}{!shifts.length && <span className="pp-muted">No shift</span>}</td> })}</tr>)}{!people.length && <tr><td colSpan={8}>No staff match your search.</td></tr>}</tbody></Table>
    </Panel><Panel title="Today's Attendance"><p className="pp-muted">{data.today} · {manager ? 'Property attendance' : 'Your attendance'}</p><div className="pp-kpi">Currently clocked in<strong>{new Set(todayAttendance.filter(a => !a.clocked_out_at).map(a => a.membership_id)).size}</strong></div>
      {attendanceTable(todayAttendance)}<div className="pp-actions">{openAttendance ? <button disabled={busy} onClick={() => open({ kind: 'confirm', title: 'Clock Out', command: { action: 'clock_out', membership_id: openAttendance.membership_id, id: openAttendance.id } })}>Clock out</button> : own && <button disabled={busy} onClick={() => open({ kind: 'confirm', title: 'Clock In', command: { action: 'clock_in', membership_id: own.id } })}>Clock in</button>}<button onClick={() => open({ kind: 'attendance', title: 'Attendance Details' })}>View Detailed Attendance</button></div>
    </Panel></div>
    <Panel title="Leave Requests" actions={<><Badge value={`${data.leaves.filter(l => l.status === 'pending').length} awaiting review`} />{own && <button disabled={busy} onClick={() => open({ kind: 'leave', title: 'Request Leave' })}>Request Leave</button>}</>}><p className="pp-muted">Pending requests and requests overlapping the selected week. Approved leave does not reassign existing tasks or alerts.</p><Table label="Leave requests"><thead><tr>{['Name', 'Date Range', 'Reason', 'Status', 'Actions'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{data.leaves.filter(l => includesSearch(search, name(l.membership_id))).map(l => <tr key={l.id}><th>{name(l.membership_id)}</th><td>{l.starts_on} — {l.ends_on}</td><td>{l.reason}</td><td><Badge value={label(l.status)} /></td><td>{l.status === 'pending' && <div className="pp-leave-actions">{(self(l.membership_id) ? ['cancel'] : manager ? ['approve', 'decline'] : []).map(action => <button key={action} disabled={busy} onClick={() => open({ kind: 'confirm', title: `${label(action)} Leave`, command: { action: `${action}_leave`, membership_id: l.membership_id, id: l.id, revision: l.revision } })}>{label(action)}</button>)}</div>}</td></tr>)}{!data.leaves.length && <tr><td colSpan={5}>No leave requests in this view.</td></tr>}</tbody></Table></Panel>
    <Panel title="Staff Directory"><Table label="Staff directory"><thead><tr><th>Name</th><th>Property role</th></tr></thead><tbody>{people.filter(m => m.active).map(m => <tr key={m.id}><th>{m.name}{m.staff_id === data.actor_id ? ' (you)' : ''}</th><td>{label(m.kind)}</td></tr>)}</tbody></Table></Panel></>}
    {dialog && <Modal title={dialog.title} blockClose={busy} onClose={() => setDialog(null)}>{dialog.kind === 'attendance' ? <><p>{days[0]} — {days[6]} · Includes today's and still-open records.</p>{attendanceTable(data?.attendance ?? [])}</> : <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      {dialog.kind === 'confirm' && <p>Confirm {dialog.title.toLowerCase()}? This updates the saved record.</p>}
      {dialog.kind === 'invite' && <><p>The new employee receives an invitation to set a password. They join this property as ordinary staff.</p><label>Full name<input name="name" maxLength={120} required /></label><label>Email<input name="email" type="email" maxLength={254} required /></label></>}
      {['shift', 'coverage'].includes(dialog.kind) && <><label>Staff<select name="membership_id" required defaultValue=""><option value="" disabled>Select staff…</option>{current.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>{dialog.kind === 'shift' && <><label>Start ({data?.time_zone})<input name="start_local" type="datetime-local" required /></label><label>End<input name="end_local" type="datetime-local" required /></label></>}<label>Coverage area<input name="coverage_area" maxLength={120} required placeholder="e.g. East Wing" /></label>{dialog.kind === 'coverage' && <p>Updates this employee's scheduled shifts starting in {days[0]} — {days[6]}.</p>}</>}
      {dialog.kind === 'leave' && <><label>First day<input name="starts_on" type="date" min={data?.today} required /></label><label>Last day<input name="ends_on" type="date" min={data?.today} required /></label><label>Reason<textarea name="reason" maxLength={500} required /></label></>}
      {formError && <p className="sd-error" role="alert">{formError}</p>}<div className="sd-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Cancel</button><button className="sd-primary">{busy ? 'Saving…' : dialog.kind === 'invite' ? 'Send invitation' : 'Confirm'}</button></div></fieldset></form>}</Modal>}
  </div>
}
