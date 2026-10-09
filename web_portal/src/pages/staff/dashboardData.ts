export type DashboardData = {
  properties: { id: string; name: string }[]
  units: { id: string; property_id: string; unit_number: string }[]
  residencies: { id: string; elderly_id: string; unit_id: string; starts_at: string; ends_at: string | null }[]
  users: { id: string; full_name: string; status: string }[]
  memberships: { id: string; staff_id: string; property_id: string }[]
  tasks: { id: string; property_id: string; title: string; due_at: string; status: string; assigned_membership_id: string | null; staff_name?: string | null }[]
  incidents: { id: string; property_id: string; incident_type: string; description: string; location: string | null; incident_time: string; status: string }[]
  alerts: { id: string; property_id: string; elderly_id: string; alert_type: string; alert_time: string; status: string }[]
}
export const zone = 'Asia/Kuala_Lumpur'
export function dayKey(value: string | Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}
export function recentDays(now: Date) {
  const date = new Date(`${dayKey(now)}T12:00:00+08:00`)
  return Array.from({ length: 14 }, (_, i) => dayKey(new Date(date.getTime() - (13 - i) * 86400000)))
}
export function incidentTrend(incidents: DashboardData['incidents'], now: Date) {
  const days = recentDays(now)
  const counts = days.map(day => ({ day, count: incidents.filter(item => dayKey(item.incident_time) === day && new Date(item.incident_time) <= now).length }))
  return { current: counts.slice(7), previousTotal: counts.slice(0, 7).reduce((sum, row) => sum + row.count, 0), total: counts.slice(7).reduce((sum, row) => sum + row.count, 0) }
}
export function currentResidents(data: DashboardData, property: string, now: Date) {
  return data.residencies.filter(r => new Date(r.starts_at) <= now && (!r.ends_at || new Date(r.ends_at) > now)).flatMap(r => {
    const unit = data.units.find(u => u.id === r.unit_id)
    if (!unit || (property && unit.property_id !== property)) return []
    const user = data.users.find(u => u.id === r.elderly_id)
    return [{ id: r.id, name: user?.full_name ?? 'Name unavailable', unit: unit.unit_number, property: data.properties.find(p => p.id === unit.property_id)?.name ?? 'Unavailable', status: user?.status ?? 'Unavailable' }]
  })
}
