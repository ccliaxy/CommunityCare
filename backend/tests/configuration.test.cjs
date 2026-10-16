const {test}=require('node:test'),assert=require('node:assert/strict');
const {createConfigurationService}=require('../src/services/configuration');
const actor={id:'admin',role:'system_admin'};
for(const role of ['property_staff','elderly','family'])test(role+' cannot save',()=>{const s=createConfigurationService({rpc:()=>{throw Error('unexpected')}});assert.throws(()=>s.save({...actor,role},{expected_revision:1,value:{}}),{status:403})});
for(const body of [null,[],{}, {expected_revision:0,value:{}},{expected_revision:1.5,value:{}},{expected_revision:1,value:[]},{expected_revision:1,value:{},p_actor:'forged'}])test('reject invalid body '+JSON.stringify(body),()=>assert.throws(()=>createConfigurationService({}).save(actor,body),{status:400}));
test('trusted actor and revision passed to DB',async()=>{await createConfigurationService({rpc:async(name,p)=>{assert.equal(name,'node_configuration_save');assert.deepEqual(p,{p_actor:'admin',p_expected:4,p_value:{volume:10}})}}).save(actor,{expected_revision:4,value:{volume:10}})});
for(const [code,status] of [['42501',403],['40001',409],['22023',400]])test('maps '+code,async()=>{await assert.rejects(createConfigurationService({rpc:async()=>{throw Object.assign(Error('test'),{code})}}).read(actor),{status})});
test('shared read forwards authenticated identity',async()=>{assert.equal(await createConfigurationService({rpc:async(name,p)=>{assert.equal(name,'node_configuration_read');assert.equal(p.p_actor,'family');return 7}}).read({id:'family'}),7)});
