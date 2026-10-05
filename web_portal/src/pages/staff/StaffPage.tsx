import { useState } from 'react'
import type { FormEvent } from 'react'
import { staffNames, usePortal } from './PortalContext'
import { Badge, includesSearch, Modal, Notice, Panel, Table } from './PortalUI'

type Shift = { id: string; staff: string; start: string; end: string; area: string }
const initialShifts: Shift[] = staffNames.flatMap((staff, person) => [5, 6, 7, 8, 9].map(day => ({ id: `${person}-${day}`, staff, start: `2026-10-${String(day).padStart(2, '0')}T${person === 1 ? '15' : '07'}:00`, end: `2026-10-${String(day).padStart(2, '0')}T${person === 1 ? '23' : '15'}:00`, area: person === 1 ? 'West Wing' : 'East Wing' })))
const attendance = [{ name: 'Sarah Jenkins', in: '06:55', out: '—' }, { name: 'Marcus Chen', in: '—', out: '—' }, { name: 'Elena Rodriguez', in: '07:02', out: '—' }]
function datePlus(offset: number) { const date = new Date(Date.UTC(2026, 9, 5 + offset)); return date.toISOString().slice(0, 10) }
export default function StaffPage() {
  const { search } = usePortal()
  const [shifts, setShifts] = useState(initialShifts)
  const [week, setWeek] = useState(0)
  const [modal, setModal] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [leaves, setLeaves] = useState(staffNames.map((name, i) => ({ id: `LR-09${i + 2}`, name, dates: `2026-11-${12 + i} to 2026-11-${14 + i}`, reason: 'Personal / PTO', status: 'Pending' })))
  const days = Array.from({ length: 7 }, (_, i) => datePlus(week * 7 + i))
  const people = staffNames.filter(s => includesSearch(search, s))
  function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget); const next = { id: crypto.randomUUID(), staff: String(data.get('staff')), start: String(data.get('start')), end: String(data.get('end')), area: String(data.get('area')) }
    if (!next.start || !next.end || next.end <= next.start) { setError('End must be after start.'); return }
    if (shifts.some(s => s.staff === next.staff && next.start < s.end && next.end > s.start)) { setError('This staff member already has an overlapping shift.'); return }
    setShifts(list => [...list, next]); setNotice(`Shift added for ${next.staff}. Select its week to view it. No notification sent.`); setModal('')
  }
  return <div className="pp-main"><Notice>{notice}</Notice><div className="pp-grid pp-staff-grid">
    <Panel title="Staff Shifts & Coverage" actions={<><button onClick={() => { setModal('coverage'); setError('') }}>Assign Coverage Area</button><button className="sd-primary" onClick={() => { setModal('shift'); setError('') }}>＋ Create Shift</button></>}><p className="pp-muted">Demo schedule. Overnight shifts appear on their start date.</p><div className="pp-heading"><button aria-label="Previous week" onClick={() => setWeek(week - 1)}>‹</button><strong>{days[0]} — {days[6]}</strong><button aria-label="Next week" onClick={() => setWeek(week + 1)}>›</button><button onClick={() => setWeek(0)}>Sample week</button></div><Table label="Weekly staff schedule"><thead><tr><th>Staff</th>{days.map((day, i) => <th key={day}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}<br />{day.slice(5)}</th>)}</tr></thead><tbody>{people.map(staff => <tr className="pp-schedule" key={staff}><th scope="row">{staff}</th>{days.map(day => <td key={day}>{shifts.filter(s => s.staff === staff && s.start.startsWith(day)).map(s => <span className="pp-shift" key={s.id}>{s.start.slice(11)}–{s.end.slice(11)}{s.end.slice(0, 10) !== day ? ' (+day)' : ''}<small>{s.area}</small></span>)}{!shifts.some(s => s.staff === staff && s.start.startsWith(day)) && <span className="pp-muted">OFF</span>}</td>)}</tr>)}{!people.length && <tr><td colSpan={8}>No staff match your search.</td></tr>}</tbody></Table></Panel>
    <Panel title="Today's Attendance"><p className="pp-muted">Sample snapshot · 6 October 2026, 12:00</p><div className="pp-kpi">Clocked In<strong>{attendance.filter(a => a.in !== '—').length} / {attendance.length}</strong></div><Table label="Staff attendance"><thead><tr><th>Name</th><th>In</th><th>Out</th></tr></thead><tbody>{attendance.filter(a => includesSearch(search, a.name)).map(a => <tr key={a.name}><th>{a.name}</th><td>{a.in}</td><td>{a.out}</td></tr>)}</tbody></Table><button onClick={() => setModal('attendance')}>View Detailed Attendance</button></Panel>
    </div><Panel title="Pending Leave Requests" actions={<Badge value={`${leaves.filter(l => l.status === 'Pending').length} awaiting review`} />}><Table label="Leave requests"><thead><tr>{['Request ID', 'Name', 'Date Range', 'Reason', 'Status', 'Actions'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{leaves.filter(l => includesSearch(search, l.name)).map(l => <tr key={l.id}><th>{l.id}</th><td>{l.name}</td><td>{l.dates}</td><td>{l.reason}</td><td><Badge value={l.status} /></td><td>{l.status === 'Pending' ? <div className="pp-leave-actions">{['Approve', 'Decline'].map(action => <button key={action} aria-label={`${action} ${l.id}`} onClick={() => { setLeaves(list => list.map(item => item.id === l.id ? { ...item, status: action === 'Approve' ? 'Approved' : 'Declined' } : item)); setNotice(`${l.id} ${action.toLowerCase()}d in preview only. Schedule changes are not automatic.`) }}>{action}</button>)}</div> : 'Reviewed'}</td></tr>)}</tbody></Table></Panel>
    {modal && <Modal title={modal === 'shift' ? 'Create Shift' : modal === 'coverage' ? 'Assign Coverage Area' : 'Attendance Details'} onClose={() => setModal('')}>
      {modal === 'attendance' ? <><p>Demo snapshot: two staff have checked in; Marcus Chen starts at 15:00. Attendance is not being tracked live.</p><button onClick={() => setModal('')}>Close</button></> : <form onSubmit={modal === 'shift' ? create : e => { e.preventDefault(); const d = new FormData(e.currentTarget); const staff = String(d.get('staff')); const area = String(d.get('area')); const count = shifts.filter(s => s.staff === staff && days.includes(s.start.slice(0, 10))).length; setShifts(list => list.map(s => s.staff === staff && days.includes(s.start.slice(0, 10)) ? { ...s, area } : s)); setNotice(count ? `Updated coverage for ${count} shifts in the selected week.` : 'No shifts for that employee in this week. Create a shift first.'); setModal('') }}><label>Staff<select name="staff">{staffNames.map(s => <option key={s}>{s}</option>)}</select></label>{modal === 'shift' && <><label>Start<input name="start" type="datetime-local" required defaultValue={`${days[0]}T07:00`} /></label><label>End<input name="end" type="datetime-local" required defaultValue={`${days[0]}T15:00`} /></label></>}<label>Coverage Area<select name="area"><option>East Wing</option><option>West Wing</option><option>Common Area</option></select></label>{error && <p className="sd-error" role="alert">{error}</p>}<div className="sd-dialog-actions"><button type="button" onClick={() => setModal('')}>Cancel</button><button className="sd-primary">Save</button></div></form>}
    </Modal>}
  </div>
}

