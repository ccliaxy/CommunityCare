import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/backendApi'
import type { Unit } from './residentRepository'
type Property = { id: string; name: string }
type DatabaseUnit = { id: string; property_id: string; unit_number: string }
type Listing = { properties: Property[]; units: DatabaseUnit[] }
export default function UnitManager({ onClose, onSaved }: { onClose: () => void; onSaved: (unit: Unit) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [data, setData] = useState<Listing | null>(null)
  const [property, setProperty] = useState('')
  const [number, setNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const inFlight = useRef(false)
  const alive = useRef(false)
  useEffect(() => { alive.current = true; const node = dialog.current; node?.showModal(); return () => { alive.current = false; node?.close() } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    api<Listing>('/units', { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return
      setData(value); setProperty(old => value.properties.some(p => p.id === old) ? old : value.properties[0]?.id ?? '')
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load units.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || !data || !property) return
    inFlight.current = true; setSaving(true); setError('')
    try {
      const result = await api<{ unit: DatabaseUnit; created: boolean }>('/units', { method: 'POST', body: JSON.stringify({ property_id: property, unit_number: number.trim() }) })
      if (!alive.current) return
      const name = data.properties.find(p => p.id === result.unit.property_id)?.name ?? 'Property'
      onSaved({ ...result.unit, label: `${name} · ${result.unit.unit_number}` })
      onClose()
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not save unit. Retry the same number safely.') }
    finally { inFlight.current = false; if (alive.current) setSaving(false) }
  }
  const visible = (data?.units ?? []).filter(u => u.property_id === property).sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
  return <dialog className="sd-dialog" ref={dialog} aria-labelledby={titleId} onCancel={e => { if (saving) e.preventDefault(); else onClose() }}>
    <h2 id={titleId}>Manage Units</h2>
    <p>Add units for a property you manage. Existing residents and their units are kept.</p>
    {loading && <p role="status">Loading units…</p>}
    {error && <p role="alert" className="sd-error">{error}</p>}
    {!loading && !data && <button onClick={() => setRevision(v => v + 1)}>Retry</button>}
    {data && <form onSubmit={submit}>
      <label>Property<select value={property} disabled={saving} onChange={e => setProperty(e.target.value)} required><option value="">Select property…</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {!data.properties.length && <p>No accessible properties. Ask the administrator to check your staff membership.</p>}
      <label>Unit Number<input required maxLength={30} disabled={saving} value={number} placeholder="e.g. A-02" onChange={e => setNumber(e.target.value)} /></label>
      <p className="sd-muted">Unit numbers are trimmed and saved in uppercase. An existing number is selected without creating a duplicate.</p>
      <div className="sd-table-wrap" style={{ maxHeight: 220, overflow: 'auto' }}><table><thead><tr><th>Existing units ({visible.length})</th></tr></thead><tbody>{visible.map(u => <tr key={u.id}><td>{u.unit_number}</td></tr>)}{!visible.length && <tr><td>No units in this property.</td></tr>}</tbody></table></div>
      <div className="sd-dialog-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="sd-primary" disabled={saving || !property}>{saving ? 'Saving…' : 'Save & Select Unit'}</button></div>
    </form>}
    {!data && <div className="sd-dialog-actions"><button onClick={onClose}>Close</button></div>}
  </dialog>
}
