const assert=require('node:assert/strict');
const {validate,createReportService}=require('../src/services/reports');
const property='00000000-0000-4000-8000-000000000101';
const query={property_id:property,start:'2026-01-01',end:'2026-01-07'};
(async()=>{
 assert.deepEqual(validate(query),{p_property:property,p_start:query.start,p_end:query.end});
 for(const invalid of [{...query,property_id:'bad'},{...query,start:'2026-02-30'},{...query,start:['2026-01-01']},{...query,end:'2025-12-31'},{...query,end:'2026-04-04'},{...query,start:'1999-01-01'}])assert.throws(()=>validate(invalid),e=>e.status===400);
 let captured;
 const service=createReportService({rpc:async(name,args)=>{captured={name,args};return {ok:true};}});
 await service.read({id:'actor',role:'property_staff'},{...query,p_actor:'attacker'});
 assert.equal(captured.args.p_actor,'actor');assert.equal(captured.name,'node_staff_reports');
 await assert.rejects(()=>service.read({id:'family',role:'family'},query),e=>e.status===403);
 await service.options({id:'actor',role:'property_staff'});assert.equal(captured.name,'node_staff_options');
 for(const [code,status] of [['42501',403],['22023',400]]){const broken=createReportService({rpc:async()=>{throw Object.assign(new Error('denied'),{code});}});await assert.rejects(()=>broken.read({id:'actor',role:'property_staff'},query),e=>e.status===status);}
 console.log('PASS: dates, range, identifiers, server actor, role, options and error mapping');
})().catch(e=>{console.error(e);process.exitCode=1});
