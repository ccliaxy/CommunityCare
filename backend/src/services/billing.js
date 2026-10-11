const crypto=require('node:crypto');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=value=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw fail('Invalid property or plan.');return value;};
function verifyWebhook(raw,signature,secret,now=Date.now()){
 if(!secret||!Buffer.isBuffer(raw)||typeof signature!=='string')throw fail('Webhook signature missing.');
 const parts=signature.split(',').map(v=>v.split('=')),times=parts.filter(p=>p[0]==='t');
 if(times.length!==1||!/^\d+$/.test(times[0][1])||Math.abs(now/1000-Number(times[0][1]))>300)throw fail('Webhook timestamp invalid.');
 const expected=crypto.createHmac('sha256',secret).update(times[0][1]+'.').update(raw).digest();
 if(!parts.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v)&&crypto.timingSafeEqual(expected,Buffer.from(v,'hex'))))throw fail('Webhook signature invalid.');
 let event;try{event=JSON.parse(raw.toString('utf8'));}catch{throw fail('Invalid webhook payload.');}if(event.livemode!==false)throw fail('Only test events are accepted.');return event;
}
function createBillingService(db,env,transport=fetch){
 const configured=()=>/^sk_test_/.test(env.STRIPE_SECRET_KEY||'')&&!!env.STRIPE_WEBHOOK_SECRET;
 async function stripe(path,body,key){
  if(!configured())throw fail('Configure Stripe test secret and webhook secret on the Node server.',503);
  const response=await transport('https://api.stripe.com/v1'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Stripe-Version':'2024-06-20',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?new URLSearchParams(body).toString():undefined,signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw fail('Stripe could not complete this request. Check the test-mode setup and retry.',502);
  if(data.livemode===true)throw fail('Live Stripe objects are not supported.',502);return data;
 }
 async function rpc(name,body){try{return await db.rpc(name,body);}catch(e){if(e.code==='42501')e.status=403;else if(['22023','22P02'].includes(e.code))e.status=400;throw e;}}
 const order=(actor,property,plan=null)=>rpc('node_billing_order',{p_actor:actor.id,p_property:uuid(property),p_plan:plan===null?null:uuid(plan)});
 const bind=(o,extra={})=>rpc('node_billing_bind',{p_order:o.id,p_customer:o.customer_id,...extra});
 function returnUrl(){const u=new URL(env.BILLING_RETURN_URL||'http://localhost:5173/');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw fail('Invalid billing return URL.',503);u.searchParams.set('billing','return');return u.href;}
 async function all(path){let result=[],after;do{const data=await stripe(path+(path.includes('?')?'&':'?')+'limit=100'+(after?'&starting_after='+encodeURIComponent(after):''));result.push(...data.data);if(!data.has_more)return result;after=data.data.at(-1)?.id;if(!after||result.length>=10000)throw fail('Billing history requires administrator reconciliation.',503);}while(true);}
 async function paid(invoice){
  if(invoice.status!=='paid'||!invoice.subscription)return;
  const sub=await stripe('/subscriptions/'+encodeURIComponent(invoice.subscription));
  const oid=sub.metadata?.communitycare_order;if(!oid)return;
  const o=await rpc('node_billing_lookup',{p_order:uuid(oid)});if(!o||o.customer_id!==invoice.customer||sub.customer!==o.customer_id)throw fail('Invoice ownership mismatch.',409);
  const lines=invoice.lines?.data;
  const expected=Math.round(Number(o.snapshot.price)*100);
  if(invoice.livemode!==false||invoice.paid!==true||invoice.amount_paid!==expected||invoice.amount_due!==expected||invoice.amount_remaining!==0||invoice.currency!==o.snapshot.currency.toLowerCase()||invoice.lines.has_more||lines?.length!==1||lines[0].price?.id!==o.snapshot.price_id||lines[0].quantity!==1||lines[0].proration||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason)||invoice.paid_out_of_band)throw fail('Invoice is outside the supported fixed-price test subscription flow.',409);
  const line=lines[0];
  await rpc('node_billing_paid',{p_order:o.id,p_customer:o.customer_id,p_subscription:sub.id,p_invoice:invoice.id,p_start:new Date(line.period.start*1000).toISOString(),p_end:new Date(line.period.end*1000).toISOString(),p_amount:expected/100,p_currency:invoice.currency,p_paid_at:new Date(invoice.status_transitions.paid_at*1000).toISOString(),p_url:invoice.hosted_invoice_url||null});
 }
 async function reconcile(o){
  if(!o?.customer_id)return;
  // Recover a lost Checkout response before allowing any further purchase.
  const sessions=await all('/checkout/sessions?customer='+encodeURIComponent(o.customer_id));
  const session=sessions.find(s=>s.metadata?.communitycare_order===o.id);
  if(session){
   await bind(o,{p_session:session.id,p_subscription:session.subscription||null,p_close:session.status==='expired'});
   if(session.subscription){
    const invoices=await all('/invoices?subscription='+encodeURIComponent(session.subscription));
    for(const invoice of invoices.filter(i=>i.status==='paid'))await paid(invoice);
    const sub=await stripe('/subscriptions/'+encodeURIComponent(session.subscription));
    if(['canceled','incomplete_expired'].includes(sub.status))await bind(o,{p_subscription:sub.id,p_close:true});
   }
  }
  return session;
 }
 return {
  async read(actor){return {...await rpc('node_billing_read',{p_actor:actor.id}),test_mode:true,configured:configured()};},
  mobile:actor=>rpc('node_mobile_subscription',{p_actor:actor.id}),
  async checkout(actor,body={}){
   let o=await order(actor,body.property_id,body.plan_id);
   if(o.state==='subscribed')throw fail('Manage the current subscription before buying another plan.',409);
   const price=await stripe('/prices/'+encodeURIComponent(o.snapshot.price_id));
   if(!price.active||price.type!=='recurring'||price.recurring?.interval!=='month'||price.recurring.interval_count!==o.snapshot.interval_months||price.unit_amount!==Math.round(Number(o.snapshot.price)*100)||price.currency!==o.snapshot.currency.toLowerCase()||!['myr','usd'].includes(price.currency)||price.billing_scheme!=='per_unit')throw fail('Stripe price does not match the configured plan.',409);
   if(!o.customer_id){const customer=await stripe('/customers',{'metadata[communitycare_order]':o.id},'cc-test-customer-'+o.id);o={...o,customer_id:customer.id};await bind(o);}
   const existing=await reconcile(o);
   if(existing?.status==='open')return {url:existing.url};
   if(existing)throw fail('Checkout has finished. Reload the subscription status before continuing.',409);
   // Do not replay a Stripe create key after its retention window.
   if(Date.now()-Date.parse(o.created_at)>23*3600000){await bind(o,{p_close:true});throw fail('This unused checkout expired. Choose the plan again.',409);}
   const session=await stripe('/checkout/sessions',{mode:'subscription',customer:o.customer_id,'payment_method_types[0]':'card','line_items[0][price]':o.snapshot.price_id,'line_items[0][quantity]':'1','metadata[communitycare_order]':o.id,'subscription_data[metadata][communitycare_order]':o.id,success_url:returnUrl(),cancel_url:returnUrl(),expires_at:String(Math.floor(Date.parse(o.created_at)/1000)+24*3600)},'cc-test-checkout-'+o.id);
   await bind(o,{p_session:session.id});return {url:session.url};
  },
  async sync(actor,body={}){const o=await order(actor,body.property_id);await reconcile(o);return {ok:true};},
  async portal(actor,body={}){const o=await order(actor,body.property_id);if(!o?.customer_id)throw fail('Start a subscription checkout first.');
   const config=await stripe('/billing_portal/configurations',{'business_profile[headline]':'CommunityCare test billing','features[payment_method_update][enabled]':'true','features[invoice_history][enabled]':'true','features[subscription_cancel][enabled]':'true','features[subscription_cancel][mode]':'at_period_end','features[subscription_update][enabled]':'false'},'cc-test-portal-config-v1');
   const session=await stripe('/billing_portal/sessions',{customer:o.customer_id,configuration:config.id,return_url:returnUrl()});return {url:session.url};
  },
  async webhook(raw,signature){const event=verifyWebhook(raw,signature,env.STRIPE_WEBHOOK_SECRET);
   if(event.type==='invoice.paid')await paid(await stripe('/invoices/'+encodeURIComponent(event.data.object.id)));
   else if(['checkout.session.completed','checkout.session.expired'].includes(event.type)){
    const s=await stripe('/checkout/sessions/'+encodeURIComponent(event.data.object.id));const oid=s.metadata?.communitycare_order;
    if(oid){const o=await rpc('node_billing_lookup',{p_order:uuid(oid)});if(!o||o.customer_id!==s.customer)throw fail('Checkout ownership mismatch.',409);await reconcile(o);}
   }else if(['customer.subscription.deleted','customer.subscription.updated'].includes(event.type)){
    const s=await stripe('/subscriptions/'+encodeURIComponent(event.data.object.id));const oid=s.metadata?.communitycare_order;
    if(oid){const o=await rpc('node_billing_lookup',{p_order:uuid(oid)});if(!o||o.customer_id!==s.customer)throw fail('Subscription ownership mismatch.',409);await bind(o,{p_subscription:s.id,p_close:['canceled','incomplete_expired'].includes(s.status)});}
   }
   return {received:true};
  }
 };
}
module.exports={createBillingService,verifyWebhook};
