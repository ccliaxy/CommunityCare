const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = message => Object.assign(new Error(message), { status: 400 });
function validate(body, invite = false) {
  const result = Object.fromEntries(['name','email','date_of_birth','gender','blood','unit_id'].map(k => [k, typeof body[k] === 'string' ? body[k].trim() : '']));
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  if (!result.name || result.name.length > 120 || !uuid.test(result.unit_id)) throw bad('Enter a valid name and unit.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date_of_birth) || !Number.isFinite(Date.parse(result.date_of_birth)) || new Date(result.date_of_birth).toISOString().slice(0,10)!==result.date_of_birth || result.date_of_birth < '1900-01-01' || result.date_of_birth > day) throw bad('Enter a valid date of birth.');
  if (!['male','female','other','unspecified'].includes(result.gender) || !['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'].includes(result.blood)) throw bad('Invalid gender or blood type.');
  result.email = result.email.toLowerCase();
  if (invite && (!uuid.test(body.request_id ?? '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || result.email.length > 254)) throw bad('Enter a valid email and request ID.');
  return result;
}
function createResidentService(db, env) {
  async function requireUnit(actor, unit) {
    if (!(await db.table('property_units','id',actor.token,{id:`eq.${unit}`})).length) throw Object.assign(new Error('Unit is outside your property access.'),{status:403});
  }
  async function list(actor) {
    const residents = []; let after = null;
    while (true) {
      const batch = await db.rpc('node_staff_resident_directory',{p_actor:actor.id,p_after:after,p_limit:200});
      if (!batch.length) break;
      residents.push(...batch); after=batch.at(-1).id;
      if (residents.length > 20000) throw bad('Too many residents.');
    }
    const [properties, units] = await Promise.all([db.table('properties','id,name',actor.token),db.table('property_units','id,unit_number,property_id',actor.token)]);
    const devices=await db.rpc('node_staff_mobile_devices',{p_actor:actor.id});
    const byElderly=new Map(devices.map(d=>[d.elderly_id,d]));
    return { residents:residents.map(r=>({...r,mobile_device:byElderly.get(r.id)??null})), units: units.map(u=>({...u,label:`${properties.find(p=>p.id===u.property_id)?.name ?? 'Property'} · ${u.unit_number}`})) };
  }
  async function save(actor, id, body) {
    const form=validate(body);
    if (!uuid.test(id) || !uuid.test(body.residency_id??'') || !body.user_version || !body.profile_version) throw bad('Refresh and select the resident again.');
    await requireUnit(actor,form.unit_id);
    return db.rpc('node_staff_update_resident',{p_actor:actor.id,p_details:{...form,id,residency_id:body.residency_id,user_version:body.user_version,profile_version:body.profile_version}});
  }
  async function invite(actor, body) {
    const form=validate(body,true); await requireUnit(actor,form.unit_id);
    if (!env.RESIDENT_INVITE_REDIRECT_URL) throw Object.assign(new Error('Configure the invitation redirect URL.'),{status:503});
    const job=await db.rpc('begin_resident_invite',{p_actor:actor.id,p_request:body.request_id,p_details:form});
    if(job.completed) return {user_id:job.user_id,message:'Registration already completed. No new invitation sent.'};
    try {
      let id=job.existing_user_id;
      if(!id) {
        const invited=await db.call(`/auth/v1/invite?redirect_to=${encodeURIComponent(env.RESIDENT_INVITE_REDIRECT_URL)}`,{server:true,method:'POST',body:{email:job.email,data:{cc_resident_request:job.request_id}}});
        id=invited.data.id;
        if(!id) throw new Error('Invitation did not return an account ID.');
      }
      const saved=await db.rpc('finish_resident_invite',{p_actor:actor.id,p_request:job.request_id,p_claim:job.claim,p_user:id});
      return {user_id:saved,message:job.existing_user_id?'Resident saved. Check the earlier invitation; email delivery is not verified.':'Resident saved and invitation requested. Check the email inbox.'};
    } catch(error) {
      await db.rpc('release_resident_invite',{p_actor:actor.id,p_request:job.request_id,p_claim:job.claim}).catch(()=>{});
      throw Object.assign(new Error(`Registration incomplete. Retry the same details. ${error.message}`),{status:400});
    }
  }
  return {list,save,invite};
}
module.exports={createResidentService,validate};
