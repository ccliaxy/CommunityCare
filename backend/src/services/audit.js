const fail=(m,s=400)=>Object.assign(new Error(m),{status:s});
function validate(q={}){
 const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw fail('Enter valid audit dates.');return v};
 const start=q.start===undefined?null:date(q.start),end=q.end===undefined?null:date(q.end);
 if((start===null)!==(end===null)||start&&(start<'2000-01-01'||end<start))throw fail('Enter a valid date range.');
 if(q.action!==undefined&&!['INSERT','UPDATE','DELETE'].includes(q.action))throw fail('Invalid action filter.');
 for(const [key,max] of [['search',120],['table',80]])if(q[key]!==undefined&&(typeof q[key]!=='string'||q[key].length>max||/[\x00-\x1f]/.test(q[key])))throw fail('Invalid search filter.');
 for(const key of ['access','export'])if(q[key]!==undefined&&!['0','1'].includes(q[key]))throw fail('Invalid filter.');
 for(const key of ['before','snapshot'])if(q[key]!==undefined&&(typeof q[key]!=='string'||!/^\d{1,18}$/.test(q[key])||(key==='before'&&BigInt(q[key])<1n)))throw fail('Invalid page cursor.');
 return {p_start:start,p_end:end,p_action:q.action||null,p_table:q.table||null,p_search:q.search||'',p_access:q.access==='1',p_before:q.before||null,p_until:q.snapshot||null,p_export:q.export==='1'};
}
function createAuditService(db){return {async read(actor,query){if(actor.role!=='system_admin')throw fail('System administrator required.',403);const p=validate(query);try{return await db.rpc('node_admin_audit',{...p,p_actor:actor.id})}catch(e){if(e.code==='42501')e.status=403;else if(['22023','22007','22P02'].includes(e.code))e.status=400;throw e}}};}
module.exports={createAuditService,validate};
