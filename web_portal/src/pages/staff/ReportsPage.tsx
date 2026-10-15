import { useQuickAction } from './dashboardQuickAction'
import type { QuickAction } from './dashboardQuickAction'
import { useEffect, useState } from 'react'
import { api } from '../../lib/backendApi'
import { usePortal } from './PortalContext'
import { csvDownload, includesSearch, Panel, Table } from './PortalUI'
import { printIncidents } from './incidentRepository'
import './ReportsPage.css'

type Property = { id: string; name: string; time_zone: string; today: string }
type Day = { day: string; alerts: number; responded: number; fastest: number | null; average: number | null; longest: number | null }
type Staff = { id: string; name: string; tasks: number; responded: number; average: number | null; shifts: number; attended: number }
type Report = { property_id: string; property_name: string; time_zone: string; start: string; end: string; generated_at: string; can_manage: boolean; summary: Omit<Day, 'day'> & { cancelled: number }; days: Day[]; usage: { type: string; count: number }[]; staff: Staff[] }
const types: Record<string, string> = { sos: 'SOS', fall: 'Fall', geofence: 'Geofence', missed_check_in: 'Missed Check-in', other: 'Other' }
function duration(value: number | null) {
 if (value === null || !Number.isFinite(value) || value < 0) return '—'
 const total = Math.round(value)
 const days = Math.floor(total / 86400)
 const hours = Math.floor(total % 86400 / 3600)
 const minutes = Math.floor(total % 3600 / 60)
 const seconds = total % 60
 return [days > 0 ? `${days}d` : '', total >= 3600 ? `${hours}h` : '', total >= 60 ? `${minutes}m` : '', `${seconds}s`].filter(Boolean).join(' ')
}
const attendance = (s: Staff) => s.shifts ? `${Math.round(100 * s.attended / s.shifts)}% (${s.attended}/${s.shifts})` : '— (no ended shifts)'
const definition = 'Response = alert occurrence to first acknowledgement, excluding cancelled alerts. Unacknowledged alerts have no response duration. Tasks are counted by completion time and completed-by staff. Attendance = ended, non-cancelled shifts with any overlapping clock-in / all ended shifts starting in the period; it is not punctuality or full-shift coverage.'
export default function ReportsPage({ active = true, quick }: { active?: boolean; quick?: QuickAction }) {
 const { search } = usePortal()
 const [properties, setProperties] = useState<Property[]>([])
 const [property, setProperty] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('')
 const [data, setData] = useState<Report | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0)
 function choose(p: Property) { setProperty(p.id); setEnd(p.today); const day = new Date(`${p.today}T00:00:00Z`); day.setUTCDate(day.getUTCDate() - 6); setStart(day.toISOString().slice(0, 10)); setData(null) }
 useEffect(() => {
  if (!active) return
  const controller = new AbortController()
  setError(''); setLoading(true)
  api<{ properties: Property[] }>('/reports/options', { signal: controller.signal }).then(result => {
   if (controller.signal.aborted) return
   setProperties(result.properties)
   if (!result.properties.some(p => p.id === property)) { if (result.properties[0]) choose(result.properties[0]); else { setProperty(''); setData(null) } }
  }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setProperties([]); setData(null) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
  return () => controller.abort()
 // Reload accessible properties on page entry and explicit retry.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [active, retry])
 useEffect(() => {
  if (!active || !property || !start || !end || !properties.some(p => p.id === property)) return
  const controller = new AbortController()
  setData(null); setError(''); setLoading(true)
  api<Report>(`/reports?${new URLSearchParams({ property_id: property, start, end })}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value) }).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
  return () => controller.abort()
 }, [active, property, start, end, properties, retry])
 useQuickAction(quick, active, q => {
  if (q.action !== 'Generate Report') return true
  if (!properties.length || loading) return false
  const target = properties.find(p => p.id === q.property) || (!q.property ? properties[0] : undefined)
  if (!target) { setError('Selected property is unavailable.'); return true }
  choose(target); setRetry(n => n + 1); return true
 })
 const selected = properties.find(p => p.id === property)
 const staff = data?.staff.filter(s => includesSearch(search, s.name)) ?? []
 const dailyHeadings = ['Date', 'Fastest', 'Average', 'Longest', 'All alerts', 'Acknowledged (non-cancelled)']
 const staffHeadings = ['Staff', 'Tasks completed', 'Alerts acknowledged', 'Average response', 'Attendance overlap']
 const dailyRows = data?.days.map(d => [d.day, duration(d.fastest), duration(d.average), duration(d.longest), String(d.alerts), String(d.responded)]) ?? []
 const staffRows = staff.map(s => [s.name, String(s.tasks), String(s.responded), duration(s.average), attendance(s)])
 const note = data ? `${data.property_name} · ${data.start} to ${data.end} · ${data.time_zone} · Generated ${new Date(data.generated_at).toLocaleString()} · ${data.can_manage ? 'Property staff performance' : 'Your performance only'} · Staff search: ${search || 'All'}` : ''
 function exportRows() { return [['CommunityCare Reports & Analytics'], [note], [definition], ['Alert volume includes cancellations. Response statistics use eligible acknowledgements at generation time.'], ['Metric', 'Value'], ['All alerts', String(data!.summary.alerts)], ['Cancelled alerts', String(data!.summary.cancelled)], ['Fastest', duration(data!.summary.fastest)], ['Average', duration(data!.summary.average)], ['Longest', duration(data!.summary.longest)], [], dailyHeadings, ...dailyRows, [], ['Alert type', 'Count'], ...data!.usage.map(u => [types[u.type] || u.type, String(u.count)]), [], staffHeadings, ...staffRows] }
 function print() { if (!data) return; try { printIncidents('Reports & Analytics', ['Metric / Section', 'Value', 'Details', 'Details', 'Details', 'Details'], exportRows().map(r => [...r, ...Array(Math.max(0, 6 - r.length)).fill('')])) } catch (e) { setError((e as Error).message) } }
 const maxSeconds = Math.max(60, ...(data?.days.map(d => d.longest ?? 0) ?? []))
 const x = (i: number) => 55 + i * 480 / Math.max((data?.days.length ?? 1) - 1, 1)
 const y = (s: number) => 270 - s / maxSeconds * 230
 return <div className="pp-main pp-live-reports">
  <Panel title="Reports & Analytics" actions={<><button disabled={!data || loading} className="sd-primary" onClick={print}>Print / Save PDF</button><button disabled={!data || loading} onClick={() => csvDownload('communitycare-analytics.csv', exportRows())}>Export as CSV</button></>}>
   <div className="report-filters"><label>Property<select value={property} onChange={e => { const p = properties.find(p => p.id === e.target.value); if (p) choose(p) }}><option value="" disabled>Select property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>From<input type="date" min="2000-01-01" max={end || selected?.today} value={start} onChange={e => { setData(null); setStart(e.target.value) }} /></label><label>To<input type="date" min={start} max={selected?.today} value={end} onChange={e => { setData(null); setEnd(e.target.value) }} /></label><button onClick={() => setRetry(n => n + 1)} disabled={loading}>Refresh report</button></div>
   <p className="pp-muted">Choose up to 93 calendar days. Dates use the property's time zone. Header search filters staff rows and their exports.</p>
   {error && <p role="alert" className="report-error">{error}</p>}{loading && <p role="status">Loading report…</p>}{!loading && !error && !properties.length && <p>No accessible properties.</p>}
   {data && <p className="pp-muted">{note}</p>}
  </Panel>
  {data && <><div className="pp-report-grid"><Panel title="Response Times"><div className="pp-metrics">{(['fastest', 'average', 'longest'] as const).map(k => <div key={k}>{k.charAt(0).toUpperCase() + k.slice(1)} response<strong>{duration(data.summary[k])}</strong></div>)}</div><p>{data.summary.responded} eligible acknowledged alerts out of {data.summary.alerts} alerts ({data.summary.cancelled} cancelled).</p>
   <div className="pp-legend"><span>🟢 Fastest</span><span>🟠 Average</span><span>🔴 Longest</span></div>
   <svg className="pp-chart" viewBox="0 0 580 325" role="img" aria-label="Daily response times in minutes; exact values in the following table.">{[0, 1, 2, 3, 4].map(n => <g key={n}><line x1="55" x2="535" y1={y(maxSeconds * n / 4)} y2={y(maxSeconds * n / 4)} stroke="#dbe6de" /><text x="5" y={y(maxSeconds * n / 4) + 4}>{(maxSeconds * n / 240).toFixed(1)}</text></g>)}<text x="5" y="18">Minutes</text>{(['fastest', 'average', 'longest'] as const).map((k, index) => <g key={k} stroke={['#388c42', '#c96f00', '#d84242'][index]} fill={['#388c42', '#c96f00', '#d84242'][index]}>{data.days.map((d, i) => d[k] !== null && <g key={d.day}>{i > 0 && data.days[i - 1][k] !== null && <line x1={x(i - 1)} y1={y(data.days[i - 1][k]!)} x2={x(i)} y2={y(d[k]!)} strokeWidth="2" />}<circle cx={x(i)} cy={y(d[k]!)} r="3" /></g>)}</g>)}<text x="55" y="306">{data.start}</text><text x="535" y="306" textAnchor="end">{data.end}</text></svg>
   {!data.summary.responded && <p>No eligible acknowledgements in this period.</p>}<details><summary>View daily data</summary><Table label="Daily response data"><thead><tr>{dailyHeadings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{dailyRows.map(r => <tr key={r[0]}>{r.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></Table></details>
  </Panel><Panel title="Alert & Service Usage"><div className="report-usage">{data.usage.map(u => <div key={u.type}><span>{types[u.type] || u.type}</span><strong>{u.count}</strong><progress max={Math.max(1, ...data.usage.map(v => v.count))} value={u.count} /></div>)}</div>{!data.usage.length && <p>No alerts in this period.</p>}<h3>Daily Alert Volume</h3><svg className="pp-chart" viewBox="0 0 580 180" role="img" aria-label="Daily alert volume; exact counts in the daily data table.">{data.days.map((d, i) => <rect key={d.day} x={x(i) - 2} y={140 - d.alerts / Math.max(1, ...data.days.map(v => v.alerts)) * 120} width="4" height={d.alerts / Math.max(1, ...data.days.map(v => v.alerts)) * 120} fill="#007f78"><title>{d.day}: {d.alerts}</title></rect>)}<text x="55" y="165">{data.start}</text><text x="535" y="165" textAnchor="end">{data.end}</text></svg><p className="pp-muted">Counts include cancelled alerts. Response statistics exclude them. All five alert types are included when present.</p></Panel></div>
  <Panel title={data.can_manage ? 'Staff Performance' : 'My Performance'} actions={<button onClick={() => csvDownload('communitycare-staff-performance.csv', [[note], [definition], staffHeadings, ...staffRows])}>Download Staff CSV</button>}><Table label="Staff performance"><thead><tr>{staffHeadings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{staffRows.map((r, index) => <tr key={staff[index].id}>{r.map((v, i) => <td key={i}>{v}</td>)}</tr>)}{!staffRows.length && <tr><td colSpan={5}>No staff match your search.</td></tr>}</tbody></Table><p className="pp-muted">{definition}</p><p className="pp-muted">Historical records without a completed-by or acknowledged-by user contribute to property totals where applicable but cannot be attributed to staff. An open clock-in overlaps time up to report generation.</p></Panel></>}
 </div>
}

