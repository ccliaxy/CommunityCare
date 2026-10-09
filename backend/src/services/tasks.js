const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad=message=>Object.assign(new Error(message),{status:400});
function identifier(value,optional=false){
 if(optional&&(value===null||value===''||value===undefined))return null;
 if(typeof value!=='string'||!uuid.test(value))throw bad('Invalid task, property, resident or staff identifier.');
 return value;
}
function validateCreate(body={}){
 if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid task details.');
 const title=typeof body.title==='string'?body.title.trim():'';
 if(!title||Array.from(title).length>160||/[\x00-\x1f\x7f]/.test(title))throw bad('Enter a task description of 1–160 characters.');
 const local=body.due_local;
 if(typeof local!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw bad('Enter a valid due date and time.');
 const check=new Date(`${local}:00Z`);
 if(!Number.isFinite(check.valueOf())||check.toISOString().slice(0,16)!==local||check.getUTCFullYear()<2000||check.getUTCFullYear()>2100)throw bad('Enter a valid due date and time (2000–2100).');
 if(typeof body.shared_with_resident!=='boolean')throw bad('Choose whether to share the task.');
 const result={title,due_local:local,request_id:identifier(body.request_id),property_id:identifier(body.property_id),elderly_id:identifier(body.elderly_id,true),assigned_membership_id:identifier(body.assigned_membership_id,true),shared_with_resident:body.shared_with_resident};
 if(result.shared_with_resident&&!result.elderly_id)throw bad('Select a resident before sharing.');
 return result;
}
async function taskRpc(db,name,params){
 try{return await db.rpc(name,params);}catch(e){
  if(e.code==='40001')e.status=409;
  else if(e.code==='42501')e.status=403;
  else if(['22023','22007','22008','22P02','23514','23503'].includes(e.code))e.status=400;
  throw e;
 }
}
async function readTaskRows(db,actor,mobile=false){
 const rows=[];let after=null;
 while(rows.length<20000){
  const batch=await taskRpc(db,mobile?'node_mobile_tasks':'node_staff_tasks',{p_actor:actor.id,p_after:after,p_limit:200});
  if(!Array.isArray(batch))throw Object.assign(new Error('Invalid task response.'),{status:502});
  rows.push(...batch);
  if(batch.length<200)return rows;
  const next=batch.at(-1).id;
  if(next===after)throw Object.assign(new Error('Invalid task pagination.'),{status:502});
  after=next;
 }
 throw Object.assign(new Error('Too many tasks; archive/filter support is required.'),{status:413});
}
function createTaskService(db){return {
 async list(actor){const [tasks,options]=await Promise.all([readTaskRows(db,actor),taskRpc(db,'node_task_options',{p_actor:actor.id})]);return {...options,tasks,server_time:new Date().toISOString()};},
 async mobile(actor){return {tasks:await readTaskRows(db,actor,true),server_time:new Date().toISOString()};},
 async create(actor,body){return taskRpc(db,'node_create_task',{p_actor:actor.id,p_details:validateCreate(body)});},
 async update(actor,id,body={}){
  if(!body||typeof body!=='object'||Array.isArray(body))throw bad('Invalid task action.');
  if(!Number.isInteger(body.revision)||body.revision<1||!['assign','complete','acknowledge','cancel'].includes(body.action))throw bad('Invalid task action/version.');
  return taskRpc(db,'node_update_task',{p_actor:actor.id,p_id:identifier(id),p_revision:body.revision,p_action:body.action,p_membership:body.action==='assign'?identifier(body.assigned_membership_id):null});
 }
};}
module.exports={createTaskService,readTaskRows,validateCreate};
