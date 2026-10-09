const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUnit(body){
 const property=typeof body?.property_id==='string'?body.property_id:'';
 const number=typeof body?.unit_number==='string'?body.unit_number.trim().toUpperCase():'';
 if(!uuid.test(property)||!number||Array.from(number).length>30||/[\x00-\x1f\x7f]/.test(number))
  throw Object.assign(new Error('Select a property and enter a unit number (1–30 characters).'),{status:400});
 return {property_id:property,unit_number:number};
}
function createUnitService(db){
 async function list(actor){
  const [properties,units]=await Promise.all([db.table('properties','id,name',actor.token),db.table('property_units','id,property_id,unit_number',actor.token)]);
  return {properties,units};
 }
 async function create(actor,body){
  const unit=validateUnit(body);
  if(!(await db.table('properties','id',actor.token,{id:`eq.${unit.property_id}`})).length)
   throw Object.assign(new Error('Property is outside your active membership.'),{status:403});
  return db.rpc('node_create_property_unit',{p_actor:actor.id,p_property:unit.property_id,p_number:unit.unit_number});
 }
 return {list,create};
}
module.exports={createUnitService,validateUnit};
