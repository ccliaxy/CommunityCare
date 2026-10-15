const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function validate(q={}){
 if(q.months!==undefined&&(typeof q.months!=='string'||!['3','6','12'].includes(q.months)))throw fail('Choose 3, 6 or 12 months.');
 const p=q.property_id;
 if(p!==undefined&&(typeof p!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(p)))throw fail('Select a valid property.');
 return {p_property:p||null,p_months:Number(q.months||6)};
}
function createAnalyticsService(db){return {async read(actor,query){
 if(actor.role!=='system_admin')throw fail('System administrator required.',403);
 const params=validate(query);
 try{return await db.rpc('node_admin_analytics',{p_actor:actor.id,...params})}catch(e){if(e.code==='42501')e.status=403;else if(['22023','22P02'].includes(e.code))e.status=400;throw e;}
}};}
module.exports={createAnalyticsService,validate};
