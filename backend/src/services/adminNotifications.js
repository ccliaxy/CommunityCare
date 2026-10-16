const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function createAdminNotificationService(db){
 async function call(name,args){try{return await db.rpc(name,args);}catch(e){if(e.code==='42501')e.status=403;throw e;}}
 return {
  async list(actor,query={}){
   if(actor.role!=='system_admin')throw fail('System administrator required.',403);
   if(query.filter!==undefined&&!['all','unread'].includes(query.filter))throw fail('Invalid notification filter.');
   const before=query.before;
   if(before!==undefined&&(typeof before!=='string'||!/^\d{1,18}$/.test(before)||BigInt(before)<1n))throw fail('Invalid notification cursor.');
   const result=await call('node_admin_notifications',{p_actor:actor.id,p_unread:query.filter==='unread',p_before:before||null});
   const hasMore=result.items.length>30;
   const items=result.items.slice(0,30).map(({sort_key,...item})=>item);
   return {items,unread_count:result.unread_count,next_cursor:hasMore?items.at(-1).cursor:null};
  },
  async read(actor,id){
   if(actor.role!=='system_admin')throw fail('System administrator required.',403);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw fail('Invalid notification.');
   await call('node_admin_notification_read',{p_actor:actor.id,p_id:id});return {ok:true};
  }
 };
}
module.exports={createAdminNotificationService};
