import { api } from '../../lib/backendApi'
export type MobileDevice = { manufacturer: string; model: string; os_version: string; last_registered_at: string }
export type ResidentRow = {
  mobile_device: MobileDevice | null;
  id: string; name: string; date_of_birth: string | null; gender: string | null; blood: string | null;
  unit_id: string; unit: string; property_id: string; property_name: string; residency_id: string;
  user_version: string; profile_version: string; account_status: string; active_alerts: number;
  last_check_in: string | null; week_counts: Record<string, number>;
}
export type Unit = { id: string; unit_number: string; property_id: string; label: string }
export type ResidentForm = { name: string; email: string; date_of_birth: string; gender: string; unit_id: string; blood: string }
export async function readResidents(signal: AbortSignal): Promise<{ residents: ResidentRow[]; units: Unit[] }> {
  return api('/residents', { signal })
}
export async function saveResident(row: ResidentRow, form: ResidentForm) {
  await api(`/residents/${row.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, residency_id: row.residency_id, user_version: row.user_version, profile_version: row.profile_version }) })
}
export async function inviteResident(requestId: string, form: ResidentForm) {
  const result = await api<{message: string}>('/residents', { method: 'POST', body: JSON.stringify({ ...form, request_id: requestId }) })
  return result.message
}
export function residentAge(birth: string | null, today: string) {
  if (!birth) return 'Not recorded'
  const b = birth.split('-').map(Number), t = today.split('-').map(Number)
  return String(t[0] - b[0] - (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2]) ? 1 : 0))
}
