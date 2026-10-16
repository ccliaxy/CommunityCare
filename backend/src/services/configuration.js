const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function createConfigurationService(db){
 async function call(name,args){try{return await db.rpc(name,args)}catch(e){if(e.code==='42501')e.status=403;else if(e.code==='40001')e.status=409;else if(['22023','22P02'].includes(e.code))e.status=400;throw e}}
 return {
  read(actor){return call('node_configuration_read',{p_actor:actor.id})},
  save(actor,body){
   if(actor.role!=='system_admin')throw fail('System administrator required.',403);
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['expected_revision','value'].includes(k))||!Number.isSafeInteger(body.expected_revision)||body.expected_revision<1||!body.value||typeof body.value!=='object'||Array.isArray(body.value))throw fail('Invalid configuration request.');
   return call('node_configuration_save',{p_actor:actor.id,p_expected:body.expected_revision,p_value:body.value});
  }
 };
}
module.exports={createConfigurationService};
