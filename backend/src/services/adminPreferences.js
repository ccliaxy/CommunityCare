const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function createAdminPreferencesService(db){
 async function call(actor,extra={}){if(actor.role!=='system_admin')throw fail('System administrator required.',403);try{return await db.rpc('node_admin_preferences',{p_actor:actor.id,...extra})}catch(e){if(e.code==='42501')e.status=403;else if(e.code==='40001')e.status=409;else if(e.code==='22023')e.status=400;throw e}}
 return {read:actor=>call(actor),save(actor,b){
 if(!b||Array.isArray(b)||typeof b!=='object'||Object.keys(b).some(k=>!['value','revision'].includes(k))||!Number.isSafeInteger(b.revision)||b.revision<0||!b.value||Array.isArray(b.value)||typeof b.value!=='object')throw fail('Invalid preferences.');
 return call(actor,{p_value:b.value,p_expected:b.revision});
 }};
}
module.exports={createAdminPreferencesService};
