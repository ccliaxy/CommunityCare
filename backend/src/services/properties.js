const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function uuid(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw fail('Invalid identifier.');return value;}
function text(value,max){if(typeof value!=='string'||!value.trim()||[...value.trim()].length>max||/[\x00-\x1f\x7f]/.test(value))throw fail('Enter valid property details.');return value.trim();}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw fail('Enter a valid date.');return value;}
function validate(body={}){
 if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid property command.');
 const action=body.action;if(!['create','edit','settings','manager','decommission','restore'].includes(action))throw fail('Invalid property action.');
 const p={p_request:uuid(body.request_id),p_action:action,p_id:action==='create'?null:uuid(body.id),p_revision:action==='create'?null:body.revision,p_data:{}};
 if(action!=='create'&&(!Number.isInteger(p.p_revision)||p.p_revision<1))throw fail('Reload this property before saving.');
 const d=body.data;if(!d||typeof d!=='object'||Array.isArray(d))throw fail('Invalid details.');
 if(['create','edit'].includes(action)){
  if(!Number.isInteger(d.declared_units)||d.declared_units<1||d.declared_units>100000)throw fail('Enter a whole-number unit count from 1 to 100,000.');
  const email=d.manager_contact_email?text(d.manager_contact_email,150):null;if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Enter a valid contact email.');
  p.p_data={name:text(d.name,100),address:text(d.address,250),time_zone:text(d.time_zone,80),declared_units:d.declared_units,manager_contact_email:email,activation_date:date(d.activation_date)};
 }else if(action==='settings'){
  if(typeof d.check_in!=='string'||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(d.check_in))throw fail('Enter a valid check-in time.');
  p.p_data={check_in:d.check_in,maintenance:d.maintenance?date(d.maintenance):null};
 }else if(action==='manager')p.p_data={staff_id:uuid(d.staff_id)};
 return p;
}
function createPropertyService(db){async function call(actor,name,params={},admin=true){
 if(admin&&actor.role!=='system_admin')throw fail('System administrator required.',403);
 try{return await db.rpc(name,{...params,p_actor:actor.id});}catch(e){if(e.code==='42501')e.status=403;else if(e.code==='40001')e.status=409;else if(['22023','22007','22008','22P02','23505','23514','23503','23P01'].includes(e.code))e.status=400;throw e;}
 }return {list:actor=>call(actor,'node_admin_properties'),command:(actor,body)=>call(actor,'node_admin_property_command',validate(body)),linked:actor=>call(actor,'node_linked_properties',{},false)};}
module.exports={createPropertyService,validate};
