function validateDevice(body){
 const id=body?.installation_id;
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  throw Object.assign(new Error('Invalid App installation ID.'),{status:400});
 const result={installation_id:id};
 for(const [key,max] of [['manufacturer',128],['model',128],['os_version',32]]){
  const value=typeof body[key]==='string'?body[key].trim():'';
  if(!value||Array.from(value).length>max||/[\x00-\x1f\x7f]/.test(value))throw Object.assign(new Error(`Invalid ${key}.`),{status:400});
  result[key]=value;
 }
 return result;
}
async function registerDevice(db,actor,body){
 const data=validateDevice(body);
 return db.rpc('node_register_mobile_device',{p_actor:actor.id,p_installation:data.installation_id,p_manufacturer:data.manufacturer,p_model:data.model,p_os_version:data.os_version});
}
module.exports={validateDevice,registerDevice};
