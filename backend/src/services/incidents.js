const crypto=require('node:crypto');
const bad=message=>Object.assign(new Error(message),{status:400});
function id(v){if(typeof v!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v))throw bad('Invalid identifier.');return v;}
function text(v,max,required=true){const s=typeof v==='string'?v.trim():'';if((required&&!s)||[...s].length>max||/[\x00]/.test(s))throw bad(`Enter valid text (up to ${max} characters).`);return s;}
function details(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid incident command.');
 const base={p_request:id(body.request_id),p_action:body.action,p_id:null,p_revision:null,p_data:{}};
 if(body.action==='create'){
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.local_time||''))throw bad('Enter the incident date and time.');
  base.p_data={property_id:id(body.property_id),elderly_id:body.elderly_id?id(body.elderly_id):null,membership_id:body.membership_id?id(body.membership_id):null,type:text(body.type,40),description:text(body.description,4000),location:text(body.location,200,false),local_time:body.local_time};
 }else{
  base.p_id=id(body.id);if(!Number.isInteger(body.revision)||body.revision<1)throw bad('Reload this incident before saving.');base.p_revision=body.revision;
  if(body.action==='followup')base.p_data={action:text(body.action_taken,4000),status:text(body.status,30),membership_id:body.membership_id?id(body.membership_id):null};
  else if(body.action==='publish')base.p_data={summary:text(body.summary,1500)};
  else if(body.action!=='unpublish')throw bad('Unknown incident action.');
 }
 return base;
}
function fileType(bytes){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>10485760)throw bad('Choose a file up to 10 MB.');
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
 throw bad('Only PNG, JPEG or PDF evidence is accepted.');
}
function createIncidentService(db,env,transport=fetch){
 async function rpc(name,args){try{return await db.rpc(name,args);}catch(e){if(e.code==='42501')e.status=403;else if(e.code==='40001')e.status=409;else if(['22023','22007','22008','22P02','23514','23503'].includes(e.code))e.status=400;throw e;}}
 async function list(actor,mobile=false){const out=[];let after=null;while(out.length<20000){const batch=await rpc(mobile?'node_mobile_incidents':'node_staff_incidents',{p_actor:actor.id,p_after:after});if(!Array.isArray(batch))throw Object.assign(new Error('Invalid incident response.'),{status:502});out.push(...batch);if(batch.length<200)return out.sort((a,b)=>b.incident_time.localeCompare(a.incident_time)||b.id.localeCompare(a.id));if(after===batch.at(-1).id)throw new Error('Invalid incident cursor');after=batch.at(-1).id;}throw Object.assign(new Error('Too many incidents. Archive filtering is required.'),{status:413});}
 async function storage(path,body,mime){
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Object.assign(new Error('Evidence storage is not configured.'),{status:503});
  const response=await transport(env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+path,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':mime||'application/json',...(mime?{'x-upsert':'true'}:{})},body:mime?body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Object.assign(new Error('Evidence storage request failed. Check private bucket setup, then retry.'),{status:502});return response.json();
 }
 const evidence=(actor,incident,file,action,data={})=>rpc('node_incident_evidence',{p_actor:actor.id,p_incident:id(incident),p_id:id(file),p_action:action,p_data:data});
 return {
  list:actor=>list(actor),mobile:actor=>list(actor,true),options:actor=>rpc('node_task_options',{p_actor:actor.id}),
  command:(actor,body)=>rpc('node_incident_command',{p_actor:actor.id,...details(body)}),
  async upload(actor,incident,file,filename,bytes){
   const mime=fileType(bytes),name=text(filename,180);if(/[\r\n\\/]/.test(name))throw bad('Invalid filename.');
   const reserved=await evidence(actor,incident,file,'reserve',{filename:name,mime_type:mime,byte_size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
   if(!reserved.ready){await storage('/object/incident-evidence/'+reserved.object_path,bytes,mime);await evidence(actor,incident,reserved.id,'finish');}
   return {id:reserved.id,filename:name};
  },
  async download(actor,incident,file){const e=await evidence(actor,incident,file,'read');const signed=await storage('/object/sign/incident-evidence/'+e.object_path,{expiresIn:60});if(typeof signed.signedURL!=='string'||!signed.signedURL.startsWith('/object/sign/incident-evidence/'))throw new Error('Invalid storage response');return {url:env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+signed.signedURL+'&download='+encodeURIComponent(e.filename)};}
 };
}
module.exports={createIncidentService,details,fileType};
