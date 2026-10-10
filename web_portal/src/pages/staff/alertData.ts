export type DatabaseAlert = {
  id: string; property_id: string; elderly_id: string; assigned_membership_id: string | null;
  alert_type: string; source: string; alert_time: string; status: string;
  latitude: number | string | null; longitude: number | string | null;
}
export type LiveAlert = {
  id: string; name: string; unit: string; type: string; time: string;
  status: 'Active' | 'Pending' | 'Resolved' | 'Cancelled';
  responder: string; actions: string; notes: string;
  revision: number; propertyName: string; assignedMembershipId: string | null;
  acknowledgedAt: string | null; resolvedAt: string | null; cancelledAt: string | null; cancellationReason: string | null;
  report: {incident_id: string; actions: string; notes: string; outcome: 'pending' | 'resolved'; updated_at: string} | null;
  coordinates: [number, number] | null; propertyId: string; source: string;
}
export function eventCoordinates(lat: DatabaseAlert['latitude'], lon: DatabaseAlert['longitude']): [number, number] | null {
  if (lat === null || lon === null || lat === '' || lon === '') return null
  const a = Number(lat), b = Number(lon)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 85.05112878 && Math.abs(b) <= 180 ? [a, b] : null
}
export function alertStatus(value: string): LiveAlert['status'] {
  switch (value) {
    case 'open': return 'Active'
    case 'acknowledged': return 'Pending'
    case 'resolved': return 'Resolved'
    case 'cancelled': return 'Cancelled'
    default: throw new Error('Unrecognized alert status. Check the database schema.')
  }
}
export function alertType(value: string) {
  return ({ sos: 'SOS', fall: 'Fall Detection', geofence: 'Geofence', missed_check_in: 'Missed Check-in', other: 'Other' } as Record<string, string>)[value] ?? value
}
export function displayAlertTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short',
  }).format(date)
}
