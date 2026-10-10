const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad=message=>Object.assign(new Error(message),{status:400});
function id(value){if(typeof value!=='string'||!uuid.test(value))throw bad('Invalid identifier.');return value;}
function object(body){if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid request.');return body;}
function text(value,max,required=true){const s=typeof value==='string'?value.trim():'';if((required&&!s)||Array.from(s).length>max||s.includes('\0'))throw bad(`Enter valid text, up to ${max} characters.`);return s;}
async function rpc(db,name,args){try{return await db.rpc(name,args);}catch(e){if(e.code==='40001')e.status=409;else if(e.code==='42501')e.status=403;else if(['22023','22003','22P02','23514','23503'].includes(e.code))e.status=400;throw e;}}
function createDetails(body,mobile=false){
 object(body);const details={request_id:id(body.request_id),latitude:null,longitude:null};
 if(body.latitude!=null||body.longitude!=null){
  if(typeof body.latitude!=='number'||typeof body.longitude!=='number'||!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude)||Math.abs(body.latitude)>90||Math.abs(body.longitude)>180)throw bad('Provide both valid latitude and longitude, or neither.');
  details.latitude=body.latitude;details.longitude=body.longitude;
 }
 if(!mobile){details.property_id=id(body.property_id);details.elderly_id=id(body.elderly_id);if(!['sos','fall','geofence','missed_check_in','other'].includes(body.alert_type))throw bad('Invalid alert type.');details.alert_type=body.alert_type;}
 return details;
}
async function rows(db,actor,mobile=false){
 const all=[];let after=null;
 while(all.length<20000){const page=await rpc(db,mobile?'node_mobile_alerts':'node_staff_alerts',{p_actor:actor.id,p_after:after,p_limit:200});
  if(!Array.isArray(page))throw Object.assign(new Error('Invalid alert response.'),{status:502});all.push(...page);if(page.length<200)return all;
  if(page.at(-1).id===after)throw Object.assign(new Error('Invalid alert cursor.'),{status:502});after=page.at(-1).id;
 }throw Object.assign(new Error('Too many alerts. Server-side archive filtering is required.'),{status:413});
}
function mapAlert(a){
 const lat=Number(a.latitude),lon=Number(a.longitude);
 const coordinates=a.latitude!==null&&a.longitude!==null&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=85.05112878&&Math.abs(lon)<=180?[lat,lon]:null;
 return {id:a.id,name:a.resident,unit:a.unit??'Unavailable',type:({sos:'SOS',fall:'Fall',geofence:'Geofence',missed_check_in:'Missed Check-in',other:'Other'})[a.alert_type]??a.alert_type,
 time:a.alert_time,status:({open:'Active',acknowledged:'Pending',resolved:'Resolved',cancelled:'Cancelled'})[a.status],responder:a.responder??'Unassigned',actions:a.report?.actions??'',notes:a.report?.notes??'',coordinates,
 propertyId:a.property_id,propertyName:a.property_name,source:a.source,revision:a.revision,assignedMembershipId:a.assigned_membership_id,report:a.report,acknowledgedAt:a.acknowledged_at,resolvedAt:a.resolved_at,cancelledAt:a.cancelled_at,cancellationReason:a.cancellation_reason};
}
function createAlertService(db){return {
 async list(actor){return (await rows(db,actor)).sort((a,b)=>Number(['resolved','cancelled'].includes(a.status))-Number(['resolved','cancelled'].includes(b.status))||b.alert_time.localeCompare(a.alert_time)||b.id.localeCompare(a.id)).map(mapAlert);},
 async options(actor){return rpc(db,'node_task_options',{p_actor:actor.id});},
 async mobile(actor){return {alerts:(await rows(db,actor,true)).sort((a,b)=>b.alert_time.localeCompare(a.alert_time)||b.id.localeCompare(a.id))};},
 async create(actor,body,mobile=false){return rpc(db,'node_create_alert',{p_actor:actor.id,p_details:createDetails(body,mobile),p_mobile:mobile});},
 async update(actor,alertId,body){
  object(body);if(!Number.isInteger(body.revision)||body.revision<1)throw bad('Invalid alert version.');let details={};
  if(body.action==='assign')details={membership_id:id(body.membership_id)};
  else if(body.action==='cancel')details={reason:text(body.reason,1000)};
  else if(body.action==='report'){if(!['pending','resolved'].includes(body.outcome))throw bad('Invalid report outcome.');details={actions:text(body.actions,4000),notes:text(body.notes,4000,false),outcome:body.outcome};}
  else if(body.action!=='acknowledge')throw bad('Invalid alert action.');
  return rpc(db,'node_update_alert',{p_actor:actor.id,p_id:id(alertId),p_revision:body.revision,p_action:body.action,p_details:details});
 }
};}
module.exports={createAlertService,createDetails,mapAlert};
