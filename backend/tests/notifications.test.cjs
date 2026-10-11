const assert=require('node:assert/strict');
const {createNotificationService}=require('../src/services/notifications');
const calls=[];
const service=createNotificationService({rpc:async(name,args)=>{
 calls.push({name,args});return {items:Array.from({length:31},(_,i)=>({id:String(i),cursor:String(100-i),sort_key:100-i})),unread_count:41};
}});
(async()=>{
 const result=await service.list({id:'verified-actor'},{filter:'unread',before:'110'});
 assert.equal(result.items.length,30);assert.equal(result.next_cursor,'71');assert.equal(result.unread_count,41);
 assert.equal(calls[0].args.p_actor,'verified-actor');assert.equal(calls[0].args.p_unread,true);assert.equal(calls[0].args.p_before,'110');
 assert(!('sort_key' in result.items[0]));console.log('PASS Pagination, filter and verified actor mapping');
 for(const query of [{filter:'bad'},{before:'-1'},{before:['1']},{before:'9223372036854775808'}])await assert.rejects(()=>service.list({id:'a'},query));
 console.log('PASS Invalid query input rejected');
 await assert.rejects(()=>service.read({id:'a'},'bad'));console.log('PASS Invalid notification ID rejected');
 await service.read({id:'verified-actor'},'00000000-0000-4000-8000-000000000001');assert.equal(calls.at(-1).args.p_actor,'verified-actor');console.log('PASS Read command uses authenticated actor');
 const denied=createNotificationService({rpc:async()=>{throw Object.assign(new Error('Denied'),{code:'42501'})}});
 await assert.rejects(()=>denied.list({id:'a'}),e=>e.status===403);console.log('PASS Permission failure mapped to HTTP 403');
})().catch(e=>{console.error(e);process.exitCode=1});
