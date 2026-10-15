const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad=message=>Object.assign(new Error(message),{status:400});
function validate(query={}){
 if(typeof query.property_id!=='string'||!uuid.test(query.property_id))throw bad('Select a property.');
 for(const key of ['start','end']){const v=query[key];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw bad('Enter valid report dates.');}
 const days=(Date.parse(query.end)-Date.parse(query.start))/86400000;
 if(days<0||days>92||query.start<'2000-01-01')throw bad('Choose up to 93 calendar days.');
 return {p_property:query.property_id,p_start:query.start,p_end:query.end};
}
function createReportService(db){
 async function call(actor,name,params={}){
  if(actor.role!=='property_staff')throw Object.assign(new Error('Staff account required.'),{status:403});
  try{return await db.rpc(name,{...params,p_actor:actor.id});}catch(e){if(e.code==='42501')e.status=403;else if(['22023','22007','22008','22P02'].includes(e.code))e.status=400;throw e;}
 }
 return {options:actor=>call(actor,'node_staff_options'),read:(actor,query)=>call(actor,'node_staff_reports',validate(query))};
}
module.exports={createReportService,validate};
