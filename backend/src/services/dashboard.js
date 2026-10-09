const {readTaskRows}=require('./tasks');
const columns={properties:['properties','id,name'],units:['property_units','id,property_id,unit_number'],residencies:['residencies','id,elderly_id,unit_id,starts_at,ends_at'],users:['app_users','id,full_name,status'],memberships:['staff_memberships','id,staff_id,property_id'],tasks:['staff_tasks','id,property_id,title,due_at,status,assigned_membership_id'],incidents:['incidents','id,property_id,incident_type,description,location,incident_time,status'],alerts:['emergency_alerts','id,property_id,elderly_id,alert_type,alert_time,status']};
async function readDashboard(db,actor){
 const result=Object.fromEntries(await Promise.all(Object.entries(columns).map(async([key,[table,select]])=>[key,key==='tasks'&&actor.role==='property_staff'?(await readTaskRows(db,actor)).map(t=>({...t,status:t.effective_status,staff_name:t.staff})):await db.table(table,select,actor.token)])));
 return result;
}
async function readAlerts(db,actor){
 const [events,users,residencies,units]=await Promise.all([
  db.table('emergency_alerts','id,property_id,elderly_id,assigned_membership_id,alert_type,source,alert_time,status,latitude,longitude',actor.token),
  db.table('app_users','id,full_name',actor.token),db.table('residencies','id,elderly_id,unit_id,starts_at,ends_at',actor.token),db.table('property_units','id,property_id,unit_number',actor.token)]);
 const now=new Date();
 return events.sort((a,b)=>b.alert_time.localeCompare(a.alert_time)||b.id.localeCompare(a.id)).slice(0,100).map(a=>{
  const r=residencies.find(r=>r.elderly_id===a.elderly_id && new Date(r.starts_at)<=now && (!r.ends_at||new Date(r.ends_at)>now));
  const u=units.find(u=>u.id===r?.unit_id && u.property_id===a.property_id);
  const lat=Number(a.latitude),lon=Number(a.longitude);
  const coordinates=a.latitude!==null && a.longitude!==null && a.latitude!=='' && a.longitude!=='' && Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85.05112878&&Math.abs(lon)<=180?[lat,lon]:null;
  return {id:a.id,name:users.find(u=>u.id===a.elderly_id)?.full_name??'Resident name unavailable',unit:u?.unit_number??'Unavailable',type:({sos:'SOS',fall:'Fall Detection',geofence:'Geofence',missed_check_in:'Missed Check-in',other:'Other'})[a.alert_type]??a.alert_type,time:a.alert_time,status:({open:'Active',acknowledged:'Pending',resolved:'Resolved',cancelled:'Cancelled'})[a.status],responder:a.assigned_membership_id?`Assigned · membership ${a.assigned_membership_id}`:'Unassigned',actions:'',notes:'',coordinates,propertyId:a.property_id,source:a.source};
 });
}
module.exports={readDashboard,readAlerts};
