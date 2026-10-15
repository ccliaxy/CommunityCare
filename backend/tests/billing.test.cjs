const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createBillingService,verifyWebhook}=require('../src/services/billing');
const secret='whsec_mock',now=Date.now(),time=Math.floor(now/1000),raw=Buffer.from(JSON.stringify({livemode:false,type:'ignored',data:{object:{id:'x'}}}));
const sign=b=>`t=${time},v1=${crypto.createHmac('sha256',secret).update(time+'.').update(b).digest('hex')}`;
let tests=0;function check(name,fn){fn();console.log('PASS',name);tests++;}
check('Valid signature accepted',()=>assert.equal(verifyWebhook(raw,sign(raw),secret,now).livemode,false));
check('Tampered bytes rejected',()=>assert.throws(()=>verifyWebhook(Buffer.from('{}'),sign(raw),secret,now)));
check('Expired signature rejected',()=>assert.throws(()=>verifyWebhook(raw,sign(raw),secret,now+301000)));
check('Missing signature rejected',()=>assert.throws(()=>verifyWebhook(raw,undefined,secret,now)));
const live=Buffer.from(JSON.stringify({livemode:true}));check('Live events rejected',()=>assert.throws(()=>verifyWebhook(live,sign(live),secret,now)));
const oid='00000000-0000-4000-8000-000000009001',pid='00000000-0000-4000-8000-000000000101';
let o={id:oid,customer_id:'cus_mock',state:'pending',created_at:new Date().toISOString(),snapshot:{price:199,currency:'MYR',interval_months:1,price_id:'price_mock'}},calls=[],writes=[],sessions=[],invoice;
const db={rpc:async(name,body)=>{writes.push({name,body});if(name==='node_billing_order'||name==='node_billing_lookup')return o;if(name==='node_billing_read')return {properties:[]};}};
const transport=async(url,init)=>{
 calls.push({url,init});let data;
 if(url.includes('/prices/'))data={active:true,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},unit_amount:19900,currency:'myr',billing_scheme:'per_unit',livemode:false};
 else if(url.includes('/checkout/sessions?'))data={data:sessions,has_more:false};
 else if(url.endsWith('/checkout/sessions'))data={id:'cs_mock',url:'https://checkout.stripe.com/mock'};
 else if(url.includes('/invoices/'))data=invoice;
 else if(url.includes('/subscriptions/'))data={id:'sub_mock',customer:'cus_mock',metadata:{communitycare_order:oid},livemode:false};
 else throw new Error('Unexpected mock URL '+url);
 return {ok:true,json:async()=>data};
};
const service=createBillingService(db,{STRIPE_SECRET_KEY:'sk_test_mock',STRIPE_WEBHOOK_SECRET:secret,BILLING_RETURN_URL:'http://localhost:5173/'},transport);
(async()=>{
 const result=await service.checkout({id:'actor'},{property_id:pid,plan_id:oid});assert.equal(result.url,'https://checkout.stripe.com/mock');
 const create=calls.find(c=>c.url.endsWith('/checkout/sessions'));const form=new URLSearchParams(create.init.body);
 check('Checkout fixes price and subscription mode on server',()=>{assert.equal(form.get('mode'),'subscription');assert.equal(form.get('line_items[0][price]'),'price_mock');assert.equal(form.get('line_items[0][quantity]'),'1');});
 check('Stripe API version and idempotency key are fixed',()=>{assert.equal(create.init.headers['Stripe-Version'],'2024-06-20');assert.equal(create.init.headers['Idempotency-Key'],'cc-test-checkout-'+oid);});
 check('Checkout creation does not activate paid access',()=>assert(!writes.some(w=>w.name==='node_billing_paid')));
 sessions=[{id:'cs_mock',status:'open',metadata:{communitycare_order:oid},url:'https://checkout.stripe.com/existing'}];calls=[];
 assert.equal((await service.checkout({id:'actor'},{property_id:pid,plan_id:oid})).url,sessions[0].url);
 check('Retry reuses existing Checkout without another charge session',()=>assert(!calls.some(c=>c.url.endsWith('/checkout/sessions'))));
 invoice={id:'in_mock',livemode:false,status:'paid',paid:true,customer:'cus_mock',subscription:'sub_mock',amount_paid:19900,amount_due:19900,amount_remaining:0,currency:'myr',billing_reason:'subscription_create',status_transitions:{paid_at:time},lines:{has_more:false,data:[{price:{id:'price_mock'},quantity:1,period:{start:time,end:time+2592000}}]}};
 const event=Buffer.from(JSON.stringify({livemode:false,type:'invoice.paid',data:{object:{id:'in_mock'}}}));writes=[];
 await service.webhook(event,sign(event));check('Verified invoice activates through atomic RPC',()=>assert.equal(writes.filter(w=>w.name==='node_billing_paid').length,1));
 invoice={...invoice,amount_paid:1};writes=[];await assert.rejects(()=>service.webhook(event,sign(event)));check('Underpayment rejected before activation',()=>assert(!writes.some(w=>w.name==='node_billing_paid')));
 const noKeys=createBillingService(db,{STRIPE_SECRET_KEY:'sk_live_forbidden',STRIPE_WEBHOOK_SECRET:secret},transport);await assert.rejects(()=>noKeys.checkout({id:'actor'},{property_id:pid,plan_id:oid}),/Configure Stripe test/);console.log('PASS Live key cannot make requests');tests++;
 console.log('ALL PASS',tests);
})().catch(e=>{console.error(e);process.exitCode=1});


