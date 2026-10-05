import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import StaffIcon from './StaffIcon'
import { usePortal } from './PortalContext'
import './StaffDashboard.css'
import './TaskPage.css'

type Task = { id: string; title: string; resident: string; unit: string; staff: string; due: string; status: 'Completed' | 'Pending' | 'Missed' }
const people = [{ name: 'Eleanor Vance', unit: 'A-102' }, { name: 'Arthur Pendleton', unit: 'B-205' }, { name: 'Martha Higgins', unit: 'C-310' }]
const employees = ['John S.', 'Maria R.', 'Nurse Joy']
const initial: Task[] = [
  { id: 'TSK-082', title: 'Morning wellness check', resident: 'Eleanor Vance', unit: 'A-102', staff: 'John S.', due: '09:00', status: 'Completed' },
  { id: 'TSK-083', title: 'Medication reminder', resident: 'Arthur Pendleton', unit: 'B-205', staff: 'Maria R.', due: '11:30', status: 'Pending' },
  { id: 'TSK-084', title: 'Daily check-in follow-up', resident: 'Martha Higgins', unit: 'C-310', staff: '', due: '08:15', status: 'Missed' },
]
type Modal = { kind: 'create' } | { kind: 'assign'; id: string } | { kind: 'info'; title: string } | { kind: 'logout' } | null
export default function TaskPage({ onLogout }: { onLogout: () => void }) {
  const [tasks, setTasks] = useState(initial)
  const { search, setSearch } = usePortal()
  const [filter, setFilter] = useState('All statuses')
  const [acknowledged, setAcknowledged] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close() }, [modal])
  const missed = tasks.filter(t => t.status === 'Missed')
  const visible = tasks.filter(t => (filter === 'All statuses' || t.status === filter) && [t.id, t.title, t.resident, t.unit, t.staff || 'Unassigned'].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const selected = modal?.kind === 'assign' ? tasks.find(t => t.id === modal.id) : undefined
  function open(next: Modal) { setError(''); setModal(next) }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const staff = String(data.get('staff') || '')
    if (modal?.kind === 'create') {
      const title = String(data.get('title') || '').trim()
      const resident = people.find(p => p.name === data.get('resident'))
      const due = String(data.get('due') || '')
      if (!title || !resident || !due) { setError('Enter a task description, resident and due time.'); return }
      const id = `TSK-${Math.max(...tasks.map(t => Number(t.id.split('-')[1]))) + 1}`
      setTasks(list => [...list, { id, title, ...{ resident: resident.name, unit: resident.unit }, staff, due, status: due < '10:00' ? 'Missed' : 'Pending' }])
      if (due < '10:00') setAcknowledged(false)
      setSearch(''); setFilter('All statuses'); setNotice(`${id} created in this preview only.`)
    } else if (selected) {
      if (!employees.includes(staff)) { setError('Select an employee.'); return }
      setTasks(list => list.map(t => t.id === selected.id ? { ...t, staff } : t))
      setNotice(`${selected.id} assigned to ${staff}. Its due time and status are unchanged.`)
    }
    setModal(null)
  }
  return <div className="tk-app">
      <main className="tk-main" id="task-main" tabIndex={-1}>
        {notice && <div className="sd-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
        {missed.length > 0 ? <section className="tk-warning" aria-label="Missed tasks"><StaffIcon name="incidents" /><div><h2>{missed.length} Missed Task{missed.length > 1 ? 's' : ''} Detected</h2><p>{acknowledged ? 'Acknowledged — these tasks still need attention.' : 'Review and reassign immediately.'}</p></div><div className="tk-actions"><button disabled={acknowledged} onClick={() => setAcknowledged(true)}>{acknowledged ? 'Acknowledged' : 'Acknowledge'}</button><button className="tk-danger" onClick={() => { setFilter('Missed'); setSearch(''); open({ kind: 'assign', id: missed[0].id }) }}>Reassign</button></div></section> : <div className="tk-clear">No missed tasks in this sample day.</div>}
        <section className="tk-panel"><div className="tk-toolbar"><div><h2>Daily Tasks</h2><p>Manage assignments for the sample day.</p></div><div className="tk-actions"><button className="sd-primary" onClick={() => open({ kind: 'create' })}><StaffIcon name="plus" />Create Task</button><select aria-label="Filter tasks by status" value={filter} onChange={e => setFilter(e.target.value)}>{['All statuses', 'Pending', 'Completed', 'Missed'].map(v => <option key={v}>{v}</option>)}</select></div></div>
          <div className="sd-table-wrap" role="region" aria-label="Daily task table" tabIndex={0}><table><thead><tr>{['Task ID / Description', 'Resident', 'Unit', 'Staff', 'Due Time', 'Status', 'Actions'].map(v => <th key={v} scope="col">{v}</th>)}</tr></thead><tbody>{visible.map(t => <tr key={t.id}><th scope="row">#{t.id}<small className="tk-description">{t.title}</small></th><td><strong>{t.resident}</strong></td><td>{t.unit}</td><td className={!t.staff ? 'tk-unassigned' : ''}>{t.staff || 'Unassigned'}</td><td className={t.status === 'Missed' ? 'tk-unassigned' : ''}>{t.due}</td><td><span className={`sd-badge sd-${t.status.toLowerCase()}`}>{t.status}</span></td><td><div className="tk-row-actions">{t.status !== 'Completed' ? <><button onClick={() => open({ kind: 'assign', id: t.id })}>{t.staff ? 'Reassign' : 'Assign Staff'}</button><button disabled={!t.staff} title={!t.staff ? 'Assign staff before completing' : undefined} onClick={() => { setTasks(list => list.map(item => item.id === t.id ? { ...item, status: 'Completed' } : item)); setNotice(`${t.id} marked completed in this preview.`) }}>Complete</button></> : <span className="sd-muted">Done</span>}</div></td></tr>)}{!visible.length && <tr><td colSpan={7} className="sd-empty">No tasks match your search and filter.</td></tr>}</tbody></table></div><p className="tk-count">{visible.length} of {tasks.length} tasks · Sample data only</p>
        </section>
      </main>
    <dialog ref={dialog} className="sd-dialog" aria-labelledby="task-dialog-heading" onCancel={() => setModal(null)}><h2 id="task-dialog-heading">{modal?.kind === 'create' ? 'Create Task' : modal?.kind === 'assign' ? `Assign staff · ${selected?.id}` : modal?.kind === 'logout' ? 'Leave staff preview?' : modal?.kind === 'info' ? modal.title : ''}</h2>
      {(modal?.kind === 'create' || modal?.kind === 'assign') ? <form key={modal.kind + (selected?.id || '')} onSubmit={submit}>
        {modal.kind === 'create' ? <><label>Task description<input name="title" required maxLength={160} autoFocus /></label><label>Resident<select name="resident" required defaultValue=""><option value="">Select resident...</option>{people.map(p => <option key={p.name} value={p.name}>{p.name} · {p.unit}</option>)}</select></label><label>Due time<input name="due" type="time" required defaultValue="11:00" /></label><p>Times before 10:00 are missed in this fixed sample day.</p></> : <p>{selected?.title} — {selected?.resident}. Reassignment does not clear an overdue task.</p>}
        <label>Staff<select name="staff" required={modal.kind === 'assign'} defaultValue={selected?.staff || ''}><option value="">{modal.kind === 'create' ? 'Unassigned' : 'Select staff...'}</option>{employees.map(e => <option key={e}>{e}</option>)}</select></label>{error && <p role="alert" className="sd-error">{error}</p>}<div className="sd-dialog-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="sd-primary" type="submit">{modal.kind === 'create' ? 'Create task' : 'Save assignment'}</button></div>
      </form> : <><p>{modal?.kind === 'logout' ? 'All preview changes will reset.' : 'This module is not connected yet. No real records or notifications are changed.'}</p><div className="sd-dialog-actions"><button onClick={() => setModal(null)}>Close</button>{modal?.kind === 'logout' && <button className="sd-primary" onClick={onLogout}>Leave preview</button>}</div></>}
    </dialog>
  </div>
}
