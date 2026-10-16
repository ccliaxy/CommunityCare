const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function createAdminDashboardService(db){return {async read(actor,query={}){
 if(actor.role!=='system_admin')throw fail('System administrator required.',403);
 const search=query.search===undefined?'':query.search;
 if(typeof search!=='string'||search.length>120||/[\x00-\x1f\x7f-\x9f]/.test(search))throw fail('Search must contain at most 120 characters.');
 try{return await db.rpc('node_admin_dashboard',{p_actor:actor.id,p_search:search.trim()})}
 catch(e){if(e.code==='42501')e.status=403;else if(e.code==='22023')e.status=400;throw e}
}};}
module.exports={createAdminDashboardService};
