const {randomUUID}=require('node:crypto');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function expected(value){if(value===undefined||value===null||value==='')return null;if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw fail('Reload your photo before saving.');return value;}
function validatePhoto(b){
 if(!Buffer.isBuffer(b)||b.length<12||b.length>2097152||b[0]!==255||b[1]!==216||b[b.length-2]!==255||b[b.length-1]!==217)throw fail('Choose a valid JPEG photo up to 2 MB.');
 let pos=2;
 while(pos+4<b.length){
  if(b[pos++]!==255)break;while(b[pos]===255)pos++;
  const marker=b[pos++];if(marker===218||marker===217||pos+2>b.length)break;
  const length=b.readUInt16BE(pos);if(length<2||pos+length>b.length)break;
  if([192,193,194].includes(marker)){
   if(length<8)break;const h=b.readUInt16BE(pos+3),w=b.readUInt16BE(pos+5);
   if(w<1||h<1||w>1024||h>1024)break;return;
  }
  pos+=length;
 }
 throw fail('Photo could not be read. Select it again to resize it.');
}
function createAdminPhotoService(db,env,transport=fetch){
 async function rpc(actor,extra={}){
  if(actor.role!=='system_admin')throw fail('System administrator required.',403);
  try{return await db.rpc('node_admin_photo',{p_actor:actor.id,...extra});}catch(e){if(e.code==='42501')e.status=403;if(e.code==='40001')e.status=409;throw e;}
 }
 async function storage(path,method,body,mime='application/json'){
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw fail('Photo storage is not configured.',503);
  const r=await transport(env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+path,{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':mime},body:Buffer.isBuffer(body)?body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw fail('Photo storage request failed. Check the photo bucket setup and retry.',502);
  return r.json();
 }
 const path=(actor,id)=>`${actor.id}/${id}.jpg`;
 async function clean(actor,id){if(!id)return;try{await storage('/object/admin-profile-photos','DELETE',{prefixes:[path(actor,id)]});}catch{/* A failed cleanup must not undo a committed photo change. */}}
 return {
  async read(actor){const photo=await rpc(actor);if(!photo.id)return {id:null,url:null};const signed=await storage('/object/sign/admin-profile-photos/'+path(actor,photo.id),'POST',{expiresIn:600});if(typeof signed.signedURL!=='string'||!signed.signedURL.startsWith('/object/sign/admin-profile-photos/'))throw fail('Invalid photo link.',502);return {id:photo.id,url:env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1'+signed.signedURL};},
  async upload(actor,value,bytes){const before=expected(value);validatePhoto(bytes);const current=await rpc(actor);if(current.id!==before)throw fail('Your photo changed. Reload it before saving.',409);
   const id=randomUUID();await storage('/object/admin-profile-photos/'+path(actor,id),'POST',bytes,'image/jpeg');
   // On uncertain DB/network failures retain the uploaded object: the write might have committed.
   const saved=await rpc(actor,{p_write:true,p_expected:before,p_photo:id});await clean(actor,saved.previous);return {id:saved.id};
  },
  async remove(actor,value){const saved=await rpc(actor,{p_write:true,p_expected:expected(value),p_photo:null});await clean(actor,saved.previous);return {id:null};}
 };
}
module.exports={createAdminPhotoService,validatePhoto};
