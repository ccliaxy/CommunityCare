const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=v=>{if(typeof v!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v))throw fail('Invalid identifier.');return v;};
function text(v,max=100){if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\x00-\x1f\x7f]/.test(v))throw fail('Enter valid details.');return v.trim();}
const objectId=v=>typeof v==='string'?v:v?.id;
function verifiedPrice(p){
 const months=p.recurring?.interval==='year'?p.recurring.interval_count*12:p.recurring?.interval==='month'?p.recurring.interval_count:0;
 if(p.livemode!==false||!p.active||p.type!=='recurring'||p.billing_scheme!=='per_unit'||p.recurring?.usage_type!=='licensed'||p.transform_quantity||p.custom_unit_amount||!['myr','usd'].includes(p.currency)||![1,3,6,12].includes(months)||!Number.isSafeInteger(p.unit_amount)||p.unit_amount<=0||p.unit_amount>100000000||Number(p.unit_amount_decimal??p.unit_amount)!==p.unit_amount)throw fail('Use an active test recurring fixed price in MYR or USD, billed every 1, 3, 6 or 12 months.',400);
 return {price:p.unit_amount/100,currency:p.currency.toUpperCase(),interval_months:months,price_id:p.id};
}
function createAdminBillingService(db,env,transport=fetch){
 const configured=()=>/^sk_test_/.test(env.STRIPE_SECRET_KEY||'')&&!!env.STRIPE_WEBHOOK_SECRET;
 async function rpc(actor,fn,args={}){if(actor.role!=='system_admin')throw fail('System administrator required.',403);try{return await db.rpc(fn,{p_actor:actor.id,...args});}catch(e){if(e.code==='42501')e.status=403;else if(['40001','23505'].includes(e.code))e.status=409;else if(['22023','22P02','23514','23503'].includes(e.code))e.status=400;throw e;}}
 async function stripe(path,body,key){
  if(!configured())throw fail('Configure Stripe test secret and webhook secret on the backend.',503);
  const response=await transport('https://api.stripe.com/v1'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Stripe-Version':'2024-06-20',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?new URLSearchParams(body).toString():undefined,signal:AbortSignal.timeout(20000)});
  let value;try{value=await response.json()}catch{throw fail('Invalid Stripe response. Retry to reconcile the request.',502)}
  if(!response.ok)throw fail('Stripe could not complete the request. Check test-mode configuration and retry the same action.',502);
  if(value.livemode===true)throw fail('Live Stripe objects are not accepted.',409);return value;
 }
 return {
  async read(actor){return {...await rpc(actor,'node_admin_billing_read'),configured:configured(),test_mode:true};},
  async command(actor,b={}){
   if(actor.role!=='system_admin')throw fail('System administrator required.',403);
   const p={p_request:uuid(b.request_id),p_action:b.action,p_id:b.id?uuid(b.id):null,p_revision:b.revision??null,p_data:{}};const d=b.data||{};
   if(['create_plan','edit_plan'].includes(b.action)){
    if(!Array.isArray(d.features)||d.features.length>100||d.features.some(f=>typeof f!=='string'||f.length>80))throw fail('Select valid plan features.');
    p.p_data={name:text(d.name),features:[...new Set(d.features)].sort()};
    if(b.action==='create_plan'){
     if(typeof d.price_id!=='string'||!/^price_[A-Za-z0-9]+$/.test(d.price_id))throw fail('Enter a Stripe test Price ID.');
     // Verify active DB role before contacting Stripe, including suspended admins.
     await rpc(actor,'node_admin_billing_read');
     const price=await stripe('/prices/'+encodeURIComponent(d.price_id));if(price.id!==d.price_id)throw fail('Stripe price mismatch.',502);
     Object.assign(p.p_data,verifiedPrice(price));
    }
   }else if(b.action==='plan_status'){if(typeof d.active!=='boolean')throw fail('Invalid plan status.');p.p_data={active:d.active};}
   else if(b.action==='trial'){if(!Number.isInteger(d.days)||d.days<1||d.days>30)throw fail('Trial must be 1–30 days.');p.p_data={property_id:uuid(d.property_id),days:d.days,reason:text(d.reason,500)};}
   else if(b.action!=='end_trial')throw fail('Unsupported billing action.');
   if(b.action!=='create_plan'&&!p.p_id)throw fail('Select a plan or trial.');
   if(['edit_plan','plan_status'].includes(b.action)&&(!Number.isInteger(p.p_revision)||p.p_revision<1))throw fail('Refresh the plan before saving.');
   return rpc(actor,'node_admin_billing_command',p);
  },
  async refund(actor,b={}){
   // A unique database job per payment supplies a stable Stripe key across retries/restarts.
   if(!configured())throw fail('Configure Stripe test billing before refunding.',503);
   const job=await rpc(actor,'node_admin_refund_begin',{p_payment:uuid(b.payment_id),p_reason:b.reason?text(b.reason,500):null});
   if(job.status==='succeeded')return {status:'succeeded'};
   const invoice=await stripe('/invoices/'+encodeURIComponent(job.invoice_id));
   const amount=Math.round(Number(job.amount)*100),chargeId=objectId(invoice.charge);
   if(invoice.id!==job.invoice_id||invoice.livemode!==false||invoice.status!=='paid'||invoice.amount_paid!==amount||invoice.currency!==job.currency.toLowerCase()||!job.orders.some(o=>o.customer_id===objectId(invoice.customer)&&o.subscription_id===objectId(invoice.subscription))||!/^ch_[A-Za-z0-9]+$/.test(chargeId||''))throw fail('Invoice ownership or charge could not be verified.',409);
   const charge=await stripe('/charges/'+encodeURIComponent(chargeId));
   if(charge.livemode!==false||charge.id!==chargeId||objectId(charge.invoice)!==invoice.id||objectId(charge.customer)!==objectId(invoice.customer)||charge.amount!==amount||charge.currency!==invoice.currency||!charge.paid||!charge.captured||charge.disputed)throw fail('Only undisputed, fully captured matching test charges can be refunded.',409);
   let refund;
   if(job.stripe_id)refund=await stripe('/refunds/'+encodeURIComponent(job.stripe_id));
   else{
    const existing=await stripe('/refunds?charge='+encodeURIComponent(chargeId)+'&limit=100');
    if(existing.has_more||!Array.isArray(existing.data))throw fail('Refund history needs manual reconciliation.',409);
    refund=existing.data.find(r=>r.metadata?.communitycare_refund===job.id);
    if(!refund){
     if(existing.data.some(r=>!['failed','canceled'].includes(r.status))||charge.amount_refunded>0)throw fail('This charge already has another refund. Review it in Stripe.',409);
     if(Date.now()-Date.parse(job.created_at)>23*3600000)throw fail('Refund request is older than 23 hours with no matching Stripe refund. Administrator reconciliation is required; no new refund was sent.',409);
     refund=await stripe('/refunds',{charge:chargeId,amount:String(amount),'metadata[communitycare_refund]':job.id},'cc-admin-refund-'+job.id);
    }
   }
   if(objectId(refund.charge)!==chargeId||refund.amount!==amount||refund.currency!==invoice.currency||refund.metadata?.communitycare_refund!==job.id||!/^re_[A-Za-z0-9]+$/.test(refund.id||''))throw fail('Refund verification failed.',409);
   await rpc(actor,'node_admin_refund_finish',{p_refund:job.id,p_stripe:refund.id,p_charge:chargeId,p_status:refund.status,p_amount:refund.amount/100,p_currency:refund.currency});
   return {status:refund.status};
  }
 };
}
module.exports={createAdminBillingService,verifiedPrice};
