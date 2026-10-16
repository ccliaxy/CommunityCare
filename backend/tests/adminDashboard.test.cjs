const {test}=require('node:test'),assert=require('node:assert/strict');
const {createAdminDashboardService}=require('../src/services/adminDashboard');
const actor={id:'admin',role:'system_admin'};
for(const role of ['property_staff','elderly','family'])test(role+' denied before DB',async()=>{await assert.rejects(createAdminDashboardService({rpc:()=>{throw Error('unexpected')}}).read({...actor,role}),{status:403})});
for(const search of [null,[],{},'x'.repeat(121),'a\nb'])test('invalid search '+JSON.stringify(search),async()=>{await assert.rejects(createAdminDashboardService({}).read(actor,{search}),{status:400})});
test('uses trusted actor and trims literal search',async()=>{const result=await createAdminDashboardService({rpc:async(n,p)=>{assert.equal(n,'node_admin_dashboard');assert.deepEqual(p,{p_actor:'admin',p_search:'_%'});return {summary:{}}}}).read(actor,{search:' _% ',p_actor:'forged'});assert.deepEqual(result,{summary:{}})});
test('default search',async()=>{await createAdminDashboardService({rpc:async(n,p)=>assert.equal(p.p_search,'')}).read(actor)});
for(const [code,status] of [['42501',403],['22023',400]])test('DB error '+code,async()=>{await assert.rejects(createAdminDashboardService({rpc:async()=>{throw Object.assign(Error('denied'),{code})}}).read(actor),{status})});
