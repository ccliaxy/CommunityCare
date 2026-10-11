import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/backendApi'
import { usePortal } from './PortalContext'
import { Badge, csvDownload, includesSearch, Modal, Panel, Table } from './PortalUI'
import './SubscriptionPage.css'

type Plan = { id: string; name: string; price: number; currency: string; interval_months: number; features: string[] }
type Subscription = { id: string; property_id: string; plan_id: string; starts_at: string; ends_at: string; status: string; agreed_price: number; currency: string; plan_snapshot: { name: string; features?: string[] } }
type Payment = { id: string; property_id: string; transaction_id: string; paid_at: string | null; amount: number; currency: string; status: string; invoice_url: string | null }
type Snapshot = { properties: { id: string; name: string }[]; plans: Plan[]; subscriptions: Subscription[]; payments: Payment[]; orders: { property_id: string; state: string }[]; configured: boolean }
const money = (amount: number, currency: string) => new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(amount)
const date = (value: string) => new Date(value).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
function hosted(url: string, host: string) { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.hostname !== host) throw new Error('Unexpected payment link. Please contact your administrator.'); return parsed.href }

export default function SubscriptionPage({ active = true }: { active?: boolean }) {
  const { search } = usePortal()
  const [data, setData] = useState<Snapshot | null>(null)
  const [property, setProperty] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const load = async () => { const version = ++generation.current; try { const next = await api<Snapshot>('/billing', { signal: controller.signal }); if (!controller.signal.aborted && version === generation.current) { setData(next); setProperty(p => next.properties.some(x => x.id === p) ? p : next.properties[0]?.id || ''); setError('') } } catch (e) { if (!controller.signal.aborted && version === generation.current) setError((e as Error).message) } }
    void load(); const timer = window.setInterval(() => { if (!document.hidden) void load() }, 15000)
    return () => { controller.abort(); window.clearInterval(timer); generation.current++ }
  }, [active])
  async function command(kind: 'checkout' | 'portal' | 'sync', plan?: Plan) {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await api<{ url?: string }>('/billing/' + kind, { method: 'POST', body: JSON.stringify({ property_id: property, ...(plan ? { plan_id: plan.id } : {}) }) })
      if (result.url) window.location.assign(hosted(result.url, kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com'))
      else { setData(await api<Snapshot>('/billing')); setNotice('Payment status checked with Stripe. Only confirmed paid periods are activated.') }
      setSelected(null)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const current = data?.subscriptions.find(s => s.property_id === property && ['active', 'trial'].includes(s.status) && Date.parse(s.starts_at) <= Date.now() && Date.parse(s.ends_at) > Date.now())
  const order = data?.orders.find(o => o.property_id === property)
  const payments = (data?.payments || []).filter(p => p.property_id === property && includesSearch(search, p.transaction_id, p.currency, p.status)).sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
  return <div className="pp-main billing-page">
    <div className="billing-top"><span className="billing-test">Stripe test environment · No real charges</span>{data && data.properties.length > 0 && <label>Property <select value={property} disabled={busy} onChange={e => { setProperty(e.target.value); setSelected(null); setNotice('') }}>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}</div>
    {error && <p className="billing-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? <p role="status">{error ? 'Subscription data could not be loaded.' : 'Loading subscription…'}</p> : !property ? <Panel title="Subscription Management"><p>Only a property manager can view billing and manage a subscription. Ask your administrator to check your property membership.</p></Panel> : <>
      {!data.configured && <p className="billing-error">Test payments are not configured on the server yet. Your administrator needs to complete the Stripe setup.</p>}
      <div className="pp-plan-layout"><Panel title="Current Plan" className="pp-plan" actions={<Badge value={current ? 'Active' : 'Inactive'} />}>
        <h3>{current?.plan_snapshot.name || 'No active subscription'}</h3>
        {current ? <><p className="pp-price">{money(current.agreed_price, current.currency)}<small> paid period</small></p><ul className="pp-features">{current.plan_snapshot.features?.map(f => <li key={f}>{f}</li>)}</ul><p>Paid access until {date(current.ends_at)} (MYT).</p></> : <p>Choose a plan below to start a test subscription.</p>}
        <p className="pp-muted">Subscriptions renew automatically. Cancel renewal in Manage billing; the paid period remains available until its end.</p>
        <button disabled={busy || !data.configured} onClick={() => void command('sync')}>Check payment status</button>
      </Panel><Panel title="Manage Payment Methods"><p>Securely manage your test card, invoices and renewal in Stripe.</p><p className="pp-muted">Card numbers are entered on Stripe's hosted page. CommunityCare does not store them.</p><button className="sd-primary" disabled={busy || !data.configured || !order} onClick={() => void command('portal')}>Manage billing</button><p className="pp-muted">Changing plans during a paid period is not supported. Cancel renewal first, then choose a new plan after the current period ends.</p></Panel></div>
      <Panel title="Manage Your Plan">{!data.plans.length ? <p>No purchasable plans have been configured yet.</p> : <Table label="Plan comparison"><thead><tr><th>Feature</th>{data.plans.map(p => <th key={p.id} className={current?.plan_id === p.id ? 'pp-current' : ''}>{p.name}</th>)}</tr></thead><tbody><tr><th>Price</th>{data.plans.map(p => <td key={p.id}>{money(p.price, p.currency)} / {p.interval_months} month(s)</td>)}</tr><tr><th>Included services</th>{data.plans.map(p => <td key={p.id}><ul>{p.features.map(f => <li key={f}>{f}</li>)}</ul></td>)}</tr><tr><th>Subscribe</th>{data.plans.map(p => <td key={p.id}><button disabled={busy || !data.configured || !!current || order?.state === 'subscribed'} onClick={() => setSelected(p)}>{current?.plan_id === p.id ? 'Current plan' : 'Select plan'}</button></td>)}</tr></tbody></Table>}</Panel>
      <Panel title="Billing History" actions={<button disabled={!payments.length} onClick={() => csvDownload('communitycare-test-invoices.csv', [['Invoice', 'Paid at (MYT)', 'Amount', 'Currency', 'Status'], ...payments.map(p => [p.transaction_id, p.paid_at ? date(p.paid_at) : '', String(p.amount), p.currency, p.status])])}>Download CSV</button>}><Table label="Billing history"><thead><tr>{['Invoice', 'Paid at (MYT)', 'Amount', 'Status', 'Action'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{payments.map(p => <tr key={p.id}><th>{p.transaction_id}</th><td>{p.paid_at ? date(p.paid_at) : '—'}</td><td>{money(p.amount, p.currency)}</td><td><Badge value={p.status} /></td><td>{p.invoice_url?.startsWith('https://invoice.stripe.com/') && <a href={p.invoice_url} target="_blank" rel="noopener noreferrer">View invoice / PDF</a>}</td></tr>)}{!payments.length && <tr><td colSpan={5}>No payment records match this view.</td></tr>}</tbody></Table></Panel>
    </>}
    {selected && <Modal title="Start test subscription" blockClose={busy} onClose={() => setSelected(null)}><p>{selected.name}: {money(selected.price, selected.currency)} every {selected.interval_months} month(s), renewing automatically until cancelled.</p><p>You will enter your test card on Stripe. Your subscription activates after the server verifies payment.</p><div className="sd-dialog-actions"><button disabled={busy} onClick={() => setSelected(null)}>Back</button><button className="sd-primary" disabled={busy} onClick={() => void command('checkout', selected)}>{busy ? 'Opening Stripe…' : 'Continue to test payment'}</button></div></Modal>}
  </div>
}
