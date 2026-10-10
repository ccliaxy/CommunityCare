const bad=message=>Object.assign(new Error(message),{status:400});
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid profile details.');
 if(Object.keys(body).some(k=>!['full_name','phone_number','version'].includes(k)))throw bad('Only your name and contact phone can be changed here.');
 const name=typeof body.full_name==='string'?body.full_name.trim():'';
 const phone=body.phone_number===null?'':typeof body.phone_number==='string'?body.phone_number.trim():null;
 if(!name||[...name].length>120||/[\x00-\x1f\x7f]/.test(name))throw bad('Enter a name of 1–120 characters.');
 if(phone===null||(phone&&(!/^\+?[0-9 ()-]{6,30}$/.test(phone)||phone.replace(/\D/g,'').length<6||phone.replace(/\D/g,'').length>15)))throw bad('Enter a valid contact phone number or leave it blank.');
 if(typeof body.version!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.version)||!Number.isFinite(Date.parse(body.version)))throw bad('Reload the profile before saving.');
 return {p_name:name,p_phone:phone||null,p_version:body.version};
}
async function rpc(db,name,params){try{return await db.rpc(name,params);}catch(e){
 if(e.code==='42501')e.status=403;else if(e.code==='40001')e.status=409;
 else if(['22023','22007','22008','22P02'].includes(e.code))e.status=400;
 throw e;
}}
function createStaffProfileService(db){return {
 read:actor=>rpc(db,'node_staff_profile',{p_actor:actor.id}),
 update:(actor,body)=>rpc(db,'node_update_staff_profile',{p_actor:actor.id,...validate(body)})
};}
module.exports={createStaffProfileService,validate};
