const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAdminProfileService,validate}=require('../src/services/adminProfile');
const valid={full_name:'Admin',phone_number:'+60 12-345 6789',version:'2026-10-16T00:00:00Z'};
for(const patch of [{role:'system_admin'},{id:'other'},{email:'other@example.com'},{phone_number:'hello'},{phone_number:'123'},{full_name:' '},{version:'yesterday'}])test('reject '+JSON.stringify(patch),()=>assert.throws(()=>validate({...valid,...patch}),{status:400}));
for(const role of ['property_staff','elderly','family'])test(role+' blocked',()=>assert.throws(()=>createAdminProfileService({}).read({id:'other',role}),{status:403}));
test('authenticated own identity forwarded',async()=>{await createAdminProfileService({rpc:async(n,p)=>{assert.equal(n,'node_update_admin_profile');assert.equal(p.p_actor,'own')}}).update({id:'own',role:'system_admin'},valid)});
for(const [code,status] of [['40001',409],['42501',403],['22023',400]])test('DB error '+code,async()=>{await assert.rejects(createAdminProfileService({rpc:async()=>{throw Object.assign(Error('test'),{code})}}).read({id:'own',role:'system_admin'}),{status})});
