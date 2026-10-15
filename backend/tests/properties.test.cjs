const assert=require('node:assert/strict');const {validate,createPropertyService}=require('../src/services/properties');
const id='00000000-0000-4000-8000-000000000001';
const body={request_id:id,action:'create',data:{name:' New property ',address:'Address',time_zone:'Asia/Kuala_Lumpur',declared_units:8,manager_contact_email:'test@example.com',activation_date:'2026-10-01'}};
(async()=>{
 assert.equal(validate(body).p_data.name,'New property');
 for(const change of [{declared_units:1.5},{declared_units:0},{activation_date:'2026-02-30'},{name:''},{manager_contact_email:'invalid'},{time_zone:''}])assert.throws(()=>validate({...body,data:{...body.data,...change}}));
 assert.throws(()=>validate({...body,action:'edit',id,revision:0}));assert.throws(()=>validate({...body,action:'settings',id,revision:1,data:{check_in:'99:00'}}));
 let call;const service=createPropertyService({rpc:async(name,p)=>{call={name,p};return {};}});
 await service.command({id,role:'system_admin'},{...body,p_actor:'spoof'});assert.equal(call.p.p_actor,id);assert.equal(call.p.p_data.p_actor,undefined);
 await assert.rejects(()=>service.command({id,role:'property_staff'},body),e=>e.status===403);
 await service.linked({id,role:'family'});assert.equal(call.name,'node_linked_properties');
 console.log('PASS property input validation, actor identity, admin role and linked endpoint');
})().catch(e=>{console.error(e);process.exitCode=1});
