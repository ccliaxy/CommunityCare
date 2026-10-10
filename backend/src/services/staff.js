const bad=message=>Object.assign(new Error(message),{status:400});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(v){if(typeof v!=='string'||!uuid.test(v))throw bad('Invalid identifier.');return v;}
function text(v,max){if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\x00-\x1f\x7f]/.test(v))throw bad(`Enter text of 1–${max} characters.`);return v.trim();}
function day(v,local=false){
 const pattern=local?/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/:/^\d{4}-\d{2}-\d{2}$/;
 if(typeof v!=='string'||!pattern.test(v))throw bad('Invalid date/time.');
 const d=new Date(v+(local?':00Z':'T00:00:00Z'));
 if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,local?16:10)!==v||v<'2000'||v>'2101')throw bad('Invalid date/time.');return v;
}
function revision(v){if(!Number.isInteger(v)||v<1)throw bad('Reopen the form to get the latest record.');return v;}
function validateCommand(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid staff command.');
 const b={property_id:id(body.property_id),membership_id:id(body.membership_id),action:body.action};
 switch(b.action){
 case 'create_shift':Object.assign(b,{start_local:day(body.start_local,true),end_local:day(body.end_local,true),coverage_area:text(body.coverage_area,120)});break;
 case 'coverage':
 if(!Array.isArray(body.shifts)||body.shifts.length<1||body.shifts.length>100)throw bad('Select 1–100 shifts.');
 Object.assign(b,{coverage_area:text(body.coverage_area,120),shifts:body.shifts.map(s=>({id:id(s?.id),revision:revision(s?.revision)}))});
 if(new Set(b.shifts.map(s=>s.id)).size!==b.shifts.length)throw bad('Duplicate shift.');break;
 case 'cancel_shift':case 'approve_leave':case 'decline_leave':case 'cancel_leave':Object.assign(b,{id:id(body.id),revision:revision(body.revision)});break;
 case 'request_leave':Object.assign(b,{starts_on:day(body.starts_on),ends_on:day(body.ends_on),reason:text(body.reason,500)});break;
 case 'clock_out':b.id=id(body.id);break;
 case 'clock_in':break;
 default:throw bad('Invalid staff action.');
 }
 return {request:id(body.request_id),details:b};
}
async function rpc(db,name,params){try{return await db.rpc(name,params);}catch(e){
 if(e.code==='42501')e.status=403;
 else if(['40001','23505','55000'].includes(e.code))e.status=409;
 else if(['22023','22007','22008','22P02','23514','23503','23502'].includes(e.code))e.status=400;
 throw e;
}}
function createStaffService(db,env){return {
 options:actor=>rpc(db,'node_staff_options',{p_actor:actor.id}),
 snapshot:(actor,q)=>rpc(db,'node_staff_snapshot',{p_actor:actor.id,p_property:id(q.property_id),p_day:day(q.day)}),
 command:(actor,body)=>{const v=validateCommand(body);return rpc(db,'node_staff_command',{p_actor:actor.id,p_request:v.request,p_details:v.details});},
 async invite(actor,body={}){
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid invitation details.');
 const email=text(body.email,254).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw bad('Enter a valid email.');
 const form={property_id:id(body.property_id),name:text(body.name,120),email}; const request=id(body.request_id);
 const redirect=env.STAFF_INVITE_REDIRECT_URL;
 if(!redirect||!/^https?:\/\//.test(redirect))throw Object.assign(new Error('Configure STAFF_INVITE_REDIRECT_URL in backend/.env.'),{status:503});
 const job=await rpc(db,'begin_staff_invite',{p_actor:actor.id,p_request:request,p_details:form});
 if(job.completed)return {user_id:job.user_id,message:'Staff registration already completed. No additional email sent.'};
 try{
 let user=job.existing_user_id;
 if(!user){const invited=await db.call(`/auth/v1/invite?redirect_to=${encodeURIComponent(redirect)}`,{server:true,method:'POST',body:{email:job.email,data:{cc_staff_request:job.request_id}}});user=invited.data.id;if(!user)throw new Error('No account returned.');}
 const saved=await rpc(db,'finish_staff_invite',{p_actor:actor.id,p_request:job.request_id,p_claim:job.claim,p_user:user});
 return {user_id:saved,message:'Staff registered. Invitation requested; check the inbox. Email delivery is not confirmed by this screen.'};
 }catch(e){await db.rpc('release_staff_invite',{p_actor:actor.id,p_request:job.request_id,p_claim:job.claim}).catch(()=>{});
 throw Object.assign(new Error(`Registration incomplete. Retry the same details. ${e.message}`),{status:e.status||400});}
 }
};}
module.exports={createStaffService,validateCommand};
