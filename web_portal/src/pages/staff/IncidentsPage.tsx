import { useQuickAction } from './dashboardQuickAction'
import type { QuickAction } from './dashboardQuickAction'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/backendApi'
import { usePortal } from './PortalContext'
import { Badge, csvDownload, includesSearch, Modal, Notice, Panel, Table } from './PortalUI'
import { downloadEvidence, printIncidents, uploadEvidence, validateEvidence } from './incidentRepository'
import type { IncidentOptions, LiveIncident } from './incidentRepository'
import './IncidentsPage.css'

const types = ['Fall', 'Medication', 'Maintenance', 'Complaint', 'Health Issue', 'Other']
const statuses = ['open', 'investigating', 'resolved', 'closed']
const label = (s: string) => s[0].toUpperCase() + s.slice(1)
const stamp = (s: string, zone: string) => new Date(s).toLocaleString('en-MY', { timeZone: zone })
function localNow(zone: string) { const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const v = (key: string) => p.find(x => x.type === key)!.value; return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}` }
type Dialog = { kind: 'detail' | 'followup' | 'family'; item: LiveIncident }
export default function IncidentsPage({ active = true, onAlerts, quick }: { active?: boolean; onAlerts?: () => void; quick?: QuickAction }) {
  const { search } = usePortal()
  const [items, setItems] = useState<LiveIncident[]>([]), [options, setOptions] = useState<IncidentOptions | null>(null)
  const [property, setProperty] = useState(''), [range, setRange] = useState('7'), [resident, setResident] = useState(''), [type, setType] = useState(''), [status, setStatus] = useState('')
  const [notice, setNotice] = useState(''), [error, setError] = useState(''), [loadError, setLoadError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<Dialog | null>(null), [familyText, setFamilyText] = useState(''), [shareConfirmed, setShareConfirmed] = useState(false)
  const attempts = useRef(new Map<string, string>()), uploads = useRef(new Map<string, string>()), lock = useRef(false), mounted = useRef(true), generation = useRef(0)
  const newForm = useRef<HTMLFormElement>(null), detailsFile = useRef<HTMLInputElement>(null)
  const zone = options?.properties.find(p => p.id === property)?.time_zone || 'Asia/Kuala_Lumpur'
  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++generation.current; setLoading(true)
    try { const [rows, choices] = await Promise.all([api<LiveIncident[]>('/incidents', { signal }), api<IncidentOptions>('/incidents/options', { signal })]); if (mounted.current && !signal?.aborted && version === generation.current) { setItems(rows); setOptions(choices); setProperty(p => choices.properties.some(x => x.id === p) ? p : choices.properties[0]?.id || ''); setLoadError('') } }
    catch (e) { if (mounted.current && !signal?.aborted && version === generation.current) { setLoadError((e as Error).message); setItems([]); setOptions(null) } }
    finally { if (mounted.current && version === generation.current) setLoading(false) }
  }, [])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++ } }, [])
  useEffect(() => { if (!active) return; const c = new AbortController(); void load(c.signal); const timer = setInterval(() => { if (!lock.current && !dialog && !document.hidden) void load(c.signal) }, 30000); return () => { c.abort(); generation.current++; clearInterval(timer) } }, [active, dialog, load])
  useQuickAction(quick, active, q => {
    if (!['Log Incident', 'Create Maintenance'].includes(q.action)) return true
    if (!options || loading || busy) return false
    const target = q.property || property || options.properties[0]?.id || ''
    if (!options.properties.some(p => p.id === target)) { setError('Selected property is unavailable.'); return true }
    if (property !== target) { setProperty(target); return false }
    const select = newForm.current?.elements.namedItem('type') as HTMLSelectElement | null
    if (select && q.action === 'Create Maintenance') select.value = 'Maintenance'
    newForm.current?.scrollIntoView({block:'center'})
    ;(newForm.current?.elements.namedItem('description') as HTMLTextAreaElement | null)?.focus()
    return true
  })
  async function command(body: Record<string, unknown>) {
    const key = JSON.stringify(body); let request = attempts.current.get(key)
    if (!request) { request = crypto.randomUUID(); attempts.current.set(key, request) }
    return api<{ id: string; revision: number }>('/incidents/commands', { method: 'POST', body: JSON.stringify({ ...body, request_id: request }) })
  }
  async function upload(id: string, file: File) { const key = `${id}:${file.name}:${file.size}:${file.lastModified}`; let request = uploads.current.get(key); if (!request) { request = crypto.randomUUID(); uploads.current.set(key, request) } await uploadEvidence(id, request, file) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return
    const data = new FormData(event.currentTarget), file = data.get('evidence') as File | null
    setError(''); setNotice(''); lock.current = true; setBusy(true)
    try {
      if (file?.size) validateEvidence(file)
      const result = await command({ action: 'create', property_id: property, elderly_id: data.get('resident') || null, membership_id: data.get('staff') || null, type: data.get('type'), local_time: data.get('date'), description: data.get('description'), location: data.get('location') })
      newForm.current?.reset(); setRange('all'); setResident(''); setType(''); setStatus(''); setNotice(`Incident ${result.id} saved.`)
      if (file?.size) { try { await upload(result.id, file) } catch (e) { setNotice(`Incident ${result.id} was saved, but the attachment was not completed. Open its Details to retry.`); setError((e as Error).message) } }
      attempts.current.clear(); await load()
    } catch (e) { setError((e as Error).message) } finally { lock.current = false; setBusy(false) }
  }
  async function change(action: 'followup' | 'publish' | 'unpublish', form?: HTMLFormElement) {
    if (!dialog || lock.current) return; const item = dialog.item; const f = form ? new FormData(form) : null
    lock.current = true; setBusy(true); setError('')
    try {
      await command({ action, id: item.id, revision: item.revision, ...(action === 'followup' ? { action_taken: f?.get('action'), status: item.alert_id || ['resolved', 'closed'].includes(item.status) ? item.status : f?.get('status'), membership_id: item.alert_id ? item.assigned_membership_id : f?.get('staff') || null } : action === 'publish' ? { summary: familyText } : {}) })
      setDialog(null); setNotice(action === 'publish' ? 'Summary published for this resident and their currently linked family.' : action === 'unpublish' ? 'Summary withdrawn from the mobile app.' : 'Follow-up saved.'); await load()
    } catch (e) { setError((e as Error).message) } finally { lock.current = false; setBusy(false) }
  }
  function open(kind: Dialog['kind'], item: LiveIncident) { setError(''); setFamilyText(item.family_summary || ''); setShareConfirmed(false); setDialog({ kind, item }) }
  const visible = items.filter(i => i.property_id === property && includesSearch(search, i.id, i.resident, i.unit || '', i.description, i.staff, i.incident_type) && (range === 'all' || Date.parse(i.incident_time) >= Date.now() - Number(range) * 86400000) && (!resident || i.elderly_id === resident) && (!type || i.incident_type === type) && (!status || i.status === status))
  const headings = ['ID', 'Resident', 'Current unit', 'Type', 'Incident time', 'Time zone', 'Status', 'Staff', 'Description', 'Follow-up actions']
  const rows = visible.map(i => [i.id, i.resident, i.unit || '—', i.incident_type, stamp(i.incident_time, i.time_zone), i.time_zone, label(i.status), i.staff, i.description, i.followups.map(f => `${stamp(f.created_at, i.time_zone)} · ${f.author}: ${f.action}`).join('\n')])
  function print() { try { printIncidents('Incident Management Report', headings, rows) } catch (e) { setError((e as Error).message) } }
  const selected = dialog?.item
  const stale = !!selected && !!items.find(i => i.id === selected.id && i.revision !== selected.revision)
  return <div className="pp-main incident-live"><Notice>{notice}</Notice>{loadError && <p role="alert" className="incident-error">{loadError} <button onClick={() => void load()}>Retry</button></p>}
    <div className="incident-property"><label>Property<select value={property} disabled={busy || !!dialog} onChange={e => { setProperty(e.target.value); setResident('') }}>{options?.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><span>{zone}</span>{loading && <span role="status">Loading…</span>}</div>
    {!property && !loading && !loadError && <p>No accessible property.</p>}
    <div className="pp-incident-layout"><Panel title="＋ Log New Incident"><form key={property} ref={newForm} onSubmit={save}><fieldset disabled={busy || !property || !!loadError}>
      <label>Incident Type<select name="type" required defaultValue=""><option value="">Select type…</option>{types.map(t => <option key={t}>{t}</option>)}</select></label>
      <label>Resident / Current Unit<select name="resident" defaultValue=""><option value="">No resident · Property incident</option>{options?.residents.filter(r => r.property_id === property).map(r => <option key={r.id} value={r.id}>{r.name} · {r.unit}</option>)}</select></label>
      <label>Date &amp; Time<input type="datetime-local" name="date" required defaultValue={localNow(zone)} max={localNow(zone)} /></label><p className="pp-muted">Time zone: {zone}</p>
      <label>Location<input name="location" maxLength={200} placeholder="e.g. Dining hall" /></label><label>Description<textarea name="description" required maxLength={4000} placeholder="Provide a detailed account of the incident…" /></label>
      <label>Assigned Staff<select name="staff" defaultValue=""><option value="">Unassigned</option>{options?.staff.filter(s => s.property_id === property).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="pp-file">Attach Photo or Evidence<input type="file" name="evidence" accept="image/png,image/jpeg,application/pdf" /><span className="pp-muted">PNG, JPEG, PDF · up to 10 MB · Staff only.</span></label>
      {error && !dialog && <p role="alert" className="incident-error">{error}</p>}<div className="pp-actions"><button type="reset" onClick={() => setError('')}>Cancel</button><button className="sd-primary">{busy ? 'Saving…' : 'Save Incident'}</button></div>
    </fieldset></form></Panel><div className="pp-stack">
      <Panel title="Follow-Up Actions"><Table label="Incident follow-up list"><thead><tr>{['ID / Type', 'Resident', 'Assigned Staff', 'Action Taken', 'Status', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(i => <tr key={i.id}><th title={i.id}>{i.id.slice(0, 8)}<br /><span className="pp-muted">{i.incident_type}</span>{i.alert_id && <small className="incident-linked">Linked alert</small>}</th><td>{i.resident}<br />{i.unit || '—'}</td><td>{i.staff}</td><td className="incident-wrap">{i.followups.at(-1)?.action || i.resolution || 'Awaiting follow-up.'}</td><td><Badge value={label(i.status)} /></td><td><div className="incident-row-actions"><button onClick={() => open('detail', i)}>Details</button><button onClick={() => open('followup', i)}>Add follow-up</button></div></td></tr>)}{!visible.length && <tr><td colSpan={6}>No incidents match this view.</td></tr>}</tbody></Table><p className="pp-muted">{visible.length} incidents · Filters below apply to this list and exports.</p></Panel>
      <Panel title="Incident Reports & Analytics" actions={<><button disabled={!visible.length} onClick={print}>Print / Save PDF</button><button disabled={!visible.length} onClick={() => csvDownload('communitycare-incidents.csv', [headings, ...rows])}>CSV</button></>}>
        <div className="pp-filter"><label>Date Range<select value={range} onChange={e => setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All dates</option></select></label><label>Resident<select value={resident} onChange={e => setResident(e.target.value)}><option value="">All residents / property</option>{[...new Map(items.filter(i => i.property_id === property && i.elderly_id).map(i => [i.elderly_id!, i.resident])).entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Incident Type<select value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{[...new Set([...types, ...items.map(i => i.incident_type)])].map(t => <option key={t}>{t}</option>)}</select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option value={s} key={s}>{label(s)}</option>)}</select></label></div>
        <p className="pp-muted">Date filters use the last 7 or 30 × 24 hours. Unit is the current unit, not the unit at the time of the incident.</p>
        <div className="pp-report-options"><article><h3>Family Communication</h3><p>Publish a reviewed summary for the resident and their linked family. Internal notes and evidence stay private.</p><button disabled={!visible.some(i => i.elderly_id)} onClick={() => open('family', visible.find(i => i.elderly_id)!)}>Prepare Family Summary</button></article><article><h3>Internal Management</h3><p>Export incident records and follow-up actions for management review.</p><button className="sd-primary" disabled={!visible.length} onClick={print}>Print Management Report</button></article></div>
      </Panel>
    </div></div>
    {dialog && selected && <Modal title={dialog.kind === 'detail' ? 'Incident Details' : dialog.kind === 'followup' ? 'Add Follow-Up' : 'Family Summary'} blockClose={busy} onClose={() => { setDialog(null); setError('') }}>
      <p className="incident-wrap"><strong>{selected.resident}</strong> · {selected.incident_type}<br />{selected.property_name} · {stamp(selected.incident_time, selected.time_zone)}<br /><small>{selected.id}</small></p>
      {error && <p className="incident-error" role="alert">{error}</p>}{stale && <p className="incident-error">This incident changed. Close and reopen it before saving.</p>}
      {dialog.kind === 'detail' ? <><h3>Description</h3><p className="incident-wrap">{selected.description}</p><p>Location: {selected.location || 'Not recorded'}</p><p>Status: {label(selected.status)} · Assigned: {selected.staff}</p>
        {selected.alert_id && <button onClick={() => { setDialog(null); onAlerts?.() }}>Open Alerts to manage linked alert</button>}
        <h3>Follow-Up History</h3>{selected.followups.map(f => <article className="incident-followup" key={f.id}><small>{stamp(f.created_at, selected.time_zone)} · {f.author}</small><p>{f.action}</p></article>)}{!selected.followups.length && <p>No additional follow-ups.</p>}
        <h3>Evidence · Staff only</h3>{selected.evidence.map(e => <p key={e.id}><button disabled={busy} onClick={() => { void downloadEvidence(selected.id, e.id).catch(e => setError((e as Error).message)) }}>{e.filename}</button></p>)}
        <label>Add evidence<input ref={detailsFile} type="file" disabled={busy} accept="image/png,image/jpeg,application/pdf" /></label><button disabled={busy} onClick={async () => { const file = detailsFile.current?.files?.[0]; if (!file || lock.current) return; lock.current = true; setBusy(true); setError(''); try { await upload(selected.id, file); setDialog(null); setNotice('Evidence saved.'); await load() } catch (e) { setError((e as Error).message) } finally { lock.current = false; setBusy(false) } }}>Upload evidence</button>
        {selected.elderly_id && <p><button disabled={busy} onClick={() => open('family', selected)}>{selected.summary_published_at ? 'Manage Published Summary' : 'Prepare Family Summary'}</button></p>}
      </> : dialog.kind === 'followup' ? <form onSubmit={e => { e.preventDefault(); void change('followup', e.currentTarget) }}><fieldset disabled={busy || stale}>
        <label>Assigned Staff<select name="staff" defaultValue={selected.assigned_membership_id || ''} disabled={!!selected.alert_id}><option value="">Unassigned</option>{selected.assigned_membership_id && !options?.staff.some(s => s.id === selected.assigned_membership_id) && <option value={selected.assigned_membership_id}>{selected.staff} (inactive)</option>}{options?.staff.filter(s => s.property_id === selected.property_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Action Taken<textarea name="action" required maxLength={4000} /></label><label>Status<select name="status" defaultValue={selected.status} disabled={!!selected.alert_id || ['resolved', 'closed'].includes(selected.status)}>{statuses.map(s => <option value={s} key={s}>{label(s)}</option>)}</select></label>
        {selected.alert_id && <p className="pp-muted">Linked alert: change status and responder on the Alerts page. Additional follow-up notes are saved here.</p>}
        <button className="sd-primary">{busy ? 'Saving…' : 'Save Follow-Up'}</button>
      </fieldset></form> : <><label>Incident<select disabled={busy} value={selected.id} onChange={e => open('family', items.find(i => i.id === e.target.value)!)}>{items.filter(i => i.property_id === property && i.elderly_id).map(i => <option key={i.id} value={i.id}>{i.id.slice(0, 8)} · {i.resident} · {i.incident_type}</option>)}</select></label><label>Resident / family-facing summary<textarea value={familyText} disabled={busy} onChange={e => { setFamilyText(e.target.value); setShareConfirmed(false) }} maxLength={1500} /></label>
        <p className="pp-muted">Publishing makes this summary available in the mobile app to this resident and their currently linked family. Internal descriptions, follow-up notes and attachments are not shared.</p><label className="incident-check"><input type="checkbox" checked={shareConfirmed} disabled={busy} onChange={e => setShareConfirmed(e.target.checked)} />I have reviewed this summary for sharing.</label>
        <div className="sd-dialog-actions">{selected.summary_published_at && <button disabled={busy || stale} onClick={() => void change('unpublish')}>Withdraw summary</button>}<button className="sd-primary" disabled={busy || stale || !familyText.trim() || !shareConfirmed} onClick={() => void change('publish')}>{busy ? 'Saving…' : 'Publish Summary'}</button></div>
      </>}
    </Modal>}
  </div>
}
