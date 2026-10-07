import { configurationError, supabase } from '../../lib/supabase'
import { alertStatus, alertType, eventCoordinates } from './alertData'
import type { DatabaseAlert, LiveAlert } from './alertData'

export async function readAlerts(signal: AbortSignal): Promise<LiveAlert[]> {
  if (!supabase) throw new Error(configurationError || 'Supabase is not configured.')
  const { data: session, error: authError } = await supabase.auth.getUser()
  if (authError || !session.user) throw new Error('Your session could not be verified. Please sign in again.')
  const profile = await supabase.from('app_users').select('role,status').eq('id', session.user.id).abortSignal(signal).single()
  if (profile.error) throw profile.error
  if (profile.data.status !== 'active' || !['property_staff', 'system_admin'].includes(profile.data.role)) throw new Error('An active staff account is required.')
  const result = await supabase.from('emergency_alerts')
    .select('id,property_id,elderly_id,assigned_membership_id,alert_type,source,alert_time,status,latitude,longitude')
    .order('alert_time', { ascending: false }).order('id', { ascending: false }).limit(100).abortSignal(signal)
  if (result.error) throw result.error
  const events = (result.data ?? []) as DatabaseAlert[]
  if (!events.length) return []
  const residents = [...new Set(events.map(a => a.elderly_id))]
  // Ordinary browser queries remain subject to RLS. Hidden names never bypass it.
  const names = await supabase.from('app_users').select('id,full_name').in('id', residents).abortSignal(signal)
  if (names.error) throw names.error
  const nameById = new Map((names.data ?? []).map(u => [u.id, u.full_name]))
  const now = new Date().toISOString()
  const residences = await supabase.from('residencies').select('elderly_id,unit_id')
    .in('elderly_id', residents).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`).abortSignal(signal)
  if (residences.error) throw residences.error
  const unitIds = [...new Set((residences.data ?? []).map(r => r.unit_id))]
  const units = unitIds.length ? await supabase.from('property_units').select('id,unit_number,property_id').in('id', unitIds).abortSignal(signal) : { data: [], error: null }
  if (units.error) throw units.error
  const unitById = new Map((units.data ?? []).map(u => [u.id, u]))
  return events.map(a => {
    const residence = residences.data?.find(r => r.elderly_id === a.elderly_id)
    const unit = residence ? unitById.get(residence.unit_id) : undefined
    return {
      id: a.id, name: nameById.get(a.elderly_id) ?? 'Resident name unavailable',
      unit: unit?.property_id === a.property_id ? unit.unit_number : 'Unavailable',
      type: alertType(a.alert_type), time: a.alert_time, status: alertStatus(a.status),
      responder: a.assigned_membership_id ? `Assigned · membership ${a.assigned_membership_id}` : 'Unassigned',
      actions: '', notes: '', coordinates: eventCoordinates(a.latitude, a.longitude), propertyId: a.property_id, source: a.source,
    }
  })
}
