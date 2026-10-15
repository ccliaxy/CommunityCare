const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=v=>{if(typeof v!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v))throw fail('Invalid identifier.');return v;};
const name=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>120||/[\x00-\x1f]/.test(v))throw fail('Enter a valid full name.');return v.trim();};
function createUserService(db,env){
 async function rpc(actor,fn,args={}){if(actor.role!=='system_admin')throw fail('System administrator required.',403);try{return await db.rpc(fn,{...args,p_actor:actor.id});}catch(e){if(e.code==='42501')e.status=403;else if(['40001','23505','55000'].includes(e.code))e.status=409;else if(['22023','22P02','23503','23514'].includes(e.code))e.status=400;throw e;}}
 function redirect(){const value=env.ADMIN_ACCOUNT_REDIRECT_URL;let url;try{url=new URL(value);}catch{throw fail('Configure ADMIN_ACCOUNT_REDIRECT_URL in the backend.',503);}if(!['http:','https:'].includes(url.protocol)||url.searchParams.get('setup')!=='account')throw fail('Account redirect must use ?setup=account.',503);return url.href;}
 return {
 list:actor=>rpc(actor,'node_admin_users'),
 update(actor,id,b={}){if(!['active','suspended'].includes(b.status)||typeof b.version!=='string'||!Number.isFinite(Date.parse(b.version)))throw fail('Refresh the account and check its status.');return rpc(actor,'node_admin_user_update',{p_id:uuid(id),p_version:b.version,p_name:name(b.name),p_status:b.status});},
 link(actor,id,b={}){const d=b.data||{};let data;if(b.action==='staff'){if(!['staff','manager'].includes(d.kind))throw fail('Select Staff or Manager.');data={property_id:uuid(d.property_id),kind:d.kind};}else if(b.action==='family')data={elderly_id:uuid(d.elderly_id),staff_id:uuid(d.staff_id),relationship:name(d.relationship)};else if(b.action==='resident')data={unit_id:uuid(d.unit_id),staff_id:uuid(d.staff_id)};else if(b.action==='unlink_family')data={link_id:uuid(d.link_id)};else throw fail('Invalid association.');return rpc(actor,'node_admin_user_link',{p_id:uuid(id),p_action:b.action,p_data:data});},
 async invite(actor,b={}){
  const details={name:name(b.name),email:typeof b.email==='string'?b.email.trim().toLowerCase():'',role:b.role};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)||details.email.length>254||!['system_admin','property_staff','elderly','family'].includes(details.role))throw fail('Enter a valid email and role.');
  const target=redirect();const job=await rpc(actor,'begin_admin_invite',{p_request:uuid(b.request_id),p_details:details});
  if(job.completed)return {id:job.user_id,replayed:true};
  try{
   const user=job.existing_user_id||(await db.call(`/auth/v1/invite?redirect_to=${encodeURIComponent(target)}`,{server:true,method:'POST',body:{email:job.email,data:{cc_admin_request:job.request_id}}})).data?.id;
   if(!user)throw fail('Invitation provider did not return an account.',502);
   const id=await rpc(actor,'finish_admin_invite',{p_request:job.request_id,p_claim:job.claim,p_user:user});return {id,replayed:false};
  }catch(e){try{await rpc(actor,'release_admin_invite',{p_request:job.request_id,p_claim:job.claim});}catch{}throw fail(`${e.message} Retry the same invitation details to complete setup.`,e.status||502);}
 },
 async recover(actor,id){const target=redirect();const email=await rpc(actor,'node_admin_recovery',{p_id:uuid(id)});await db.call(`/auth/v1/recover?redirect_to=${encodeURIComponent(target)}`,{server:true,method:'POST',body:{email}});return {message:'Password reset email requested. Delivery depends on your email provider.'};}
 };
}
module.exports={createUserService};
