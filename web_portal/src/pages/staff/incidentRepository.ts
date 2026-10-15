import { api, backendUrl } from '../../lib/backendApi'
import { supabase } from '../../lib/supabase'
export type IncidentOptions = { properties: { id: string; name: string; time_zone: string; today: string }[]; residents: { id: string; name: string; unit: string; property_id: string }[]; staff: { id: string; name: string; property_id: string }[] }
export type LiveIncident = { id: string; property_id: string; property_name: string; time_zone: string; elderly_id: string | null; resident: string; unit: string | null; incident_type: string; incident_time: string; location: string | null; description: string; status: string; assigned_membership_id: string | null; staff: string; resolution: string | null; alert_id: string | null; revision: number; family_summary: string | null; summary_published_at: string | null; followups: { id: string; action: string; author: string; created_at: string; status: string }[]; evidence: { id: string; filename: string; byte_size: number; created_at: string }[] }
export function validateEvidence(file: File) { if (!file.size || file.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) throw new Error('Choose a PNG, JPEG or PDF file up to 10 MB.') }
export async function uploadEvidence(incident: string, request: string, file: File) {
  validateEvidence(file)
  const session = await supabase?.auth.getSession()
  if (!session?.data.session) throw new Error('Please sign in again.')
  const response = await fetch(`${backendUrl}/api/incidents/${incident}/evidence/${request}?filename=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { Authorization: `Bearer ${session.data.session.access_token}`, 'Content-Type': 'application/octet-stream' }, body: file, signal: AbortSignal.timeout(60000) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Evidence upload failed.')
}
export async function downloadEvidence(incident: string, evidence: string) {
  const { url } = await api<{ url: string }>(`/incidents/${incident}/evidence/${evidence}`)
  const parsed = new URL(url), base = new URL(import.meta.env.VITE_SUPABASE_URL)
  if (parsed.origin !== base.origin || !parsed.pathname.startsWith('/storage/v1/object/sign/incident-evidence/')) throw new Error('Unexpected evidence link.')
  const a = document.createElement('a'); a.href = url; a.rel = 'noopener noreferrer'; a.target = '_blank'; a.click()
}
export function printIncidents(title: string, headings: string[], rows: string[][]) {
  const popup = window.open('', '_blank', 'width=1050,height=750')
  if (!popup) throw new Error('Allow the report window to open, then try again.')
  popup.opener = null
  const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:12px Arial;padding:25px;color:#263d37}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:8px;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}tr{break-inside:avoid}@media print{button{display:none}}</style></head><body><h1>CommunityCare · ${escape(title)}</h1><p>Generated ${escape(new Date().toLocaleString())} · Internal staff report</p><button onclick="window.print()">Print / Save PDF</button><table><thead><tr>${headings.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`)
  popup.document.close()
}
