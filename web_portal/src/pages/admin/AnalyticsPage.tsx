import { useState } from 'react'
import { useAdmin } from './AdminContext'
import { BarChart, csvDownload, LineChart, matches, Panel, Table } from './AdminUI'

export default function AnalyticsPage() {
  const { state, search, update } = useAdmin()
  const [period, setPeriod] = useState('6')
  const [selectedProperty, setSelectedProperty] = useState('all')
  const properties = state.properties.filter(p => p.status !== 'Archived' && (selectedProperty === 'all' || p.id === selectedProperty))
  const users = state.users.filter(u => selectedProperty === 'all' || u.property === selectedProperty)
  const residents = properties.reduce((sum, p) => sum + p.residents, 0)
  const alerts = properties.reduce((sum, p) => sum + p.alerts, 0)
  const payments = state.payments.filter(p => properties.some(property => property.id === p.property))
  const revenue = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0)
  const approvedRefunds = state.refunds.filter(r => r.status === 'Approved' && properties.some(p => p.id === r.property)).reduce((sum, r) => sum + r.amount, 0)
  const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].slice(-Number(period))
  const trend = [0.25, 0.35, 0.5, 0.65, 0.82, 1].slice(-Number(period))
  const adoption = ['Video Calls', 'Fall Detection', 'Geofencing', 'Emergency Alerts'].map(feature => ({ name: feature, count: properties.filter(p => state.plans.find(plan => plan.id === p.settings.plan)?.features[feature]).length }))
  const colors = ['#489de6', '#ed8c00', '#ffc200', '#ef5656']
  const total = adoption.reduce((sum, f) => sum + f.count, 0)
  let cursor = 0
  const segments = adoption.map((a, i) => { const start = cursor; cursor += total ? a.count / total * 100 : 0; return `${colors[i]} ${start}% ${cursor}%` })
  const quarterly = [1, 2, 3, 4].map(q => properties.filter(p => Math.ceil(Number(p.activation.slice(5, 7)) / 3) === q && p.activation.startsWith('2026')).length)
  function exportReport() {
    csvDownload('admin-demo-revenue.csv', [['CommunityCare Admin Analytics — demo'], ['Scope', selectedProperty === 'all' ? 'All non-archived properties' : properties[0]?.name || ''], ['Metric', 'Value'], ['Users', users.length], ['Residents', residents], ['Pending alerts', alerts], ['Gross paid USD', revenue.toFixed(2)], ['Approved sample refunds USD', approvedRefunds.toFixed(2)], [], ['Property', 'Units', 'Residents', 'Pending alerts', 'Usage %'], ...properties.map(p => [p.name, p.units, p.residents, p.alerts, p.usage]), [], ['Transaction', 'USD', 'Status'], ...payments.map(p => [p.id, p.amount.toFixed(2), p.status])])
    update('Data Export', 'Exported filtered Admin demo revenue and property metrics.')
  }
  return <div className="ad-main"><div className="ad-heading"><div><h2>Overview Dashboard</h2><p className="ad-muted">Current Admin preview records and clearly labelled illustrative trends.</p></div><button className="ad-primary" onClick={exportReport}>↓ Export Revenue CSV</button></div><div className="ad-filter"><label>Property Scope<select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}><option value="all">All active properties</option>{state.properties.filter(p => p.status !== 'Archived').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Trend Range<select value={period} onChange={e => setPeriod(e.target.value)}><option value="6">Last 6 sample months</option><option value="3">Last 3 sample months</option></select></label></div>
    <div className="ad-wide-grid"><Panel title="System Usage Overview" className="ad-accent"><div className="ad-kpis ad-three-kpis"><div className="ad-kpi">Total User Accounts<strong>{users.length}</strong></div><div className="ad-kpi">Resident Records<strong>{residents}</strong></div><div className="ad-kpi">Pending Alerts<strong>{alerts}</strong></div></div><LineChart labels={months} series={[{ name: 'Illustrative account adoption', color: '#008680', values: trend.map(n => Math.round(users.length * n)) }]} unit="Accounts" /><p className="ad-muted">Trend points illustrate the chart layout; only the final value reflects current preview accounts.</p></Panel><Panel title="Sample Revenue"><p className="ad-muted">October sample transactions · Selected property scope</p><strong style={{ fontSize: 30 }}>${revenue.toFixed(2)}</strong><p>Gross paid · USD</p><p className="ad-muted">Approved demo refunds: ${approvedRefunds.toFixed(2)}. Gross paid does not subtract refunds.</p><LineChart labels={months} series={[{ name: 'Illustrative revenue trend', color: '#59a356', values: trend.map(n => Math.round(revenue * n)) }]} unit="USD" /></Panel></div>
    <div className="ad-grid"><Panel title="Properties Added in 2026"><BarChart labels={['Q1', 'Q2', 'Q3', 'Q4']} values={quarterly} unit="Non-archived properties by activation date" /><p className="ad-muted">Derived from registered activation dates within the selected property scope.</p></Panel><Panel title="Feature Availability"><div className="ad-donut" role="img" aria-label={adoption.map(a => `${a.name}: ${a.count} properties`).join(', ')} style={{ background: total ? `conic-gradient(${segments.join(',')})` : '#e4ebe7' }} /><div className="ad-legend">{adoption.map((a, i) => <span key={a.name} style={{ color: colors[i] }}>{a.name}: {a.count}</span>)}</div><p className="ad-muted">Counts show properties whose assigned plan enables each feature. They measure configuration, not actual feature usage. A property can appear in several categories.</p></Panel></div>
    <Panel title="Property Alert Summary"><BarChart labels={properties.map(p => p.id.slice(-4))} values={properties.map(p => p.alerts)} colors={['#eb5a5a', '#ed8f1c', '#45a1dd']} unit="Current pending sample alerts" /><Table label="Property analytics"><thead><tr>{['Property', 'Units', 'Residents', 'Alerts', 'Usage'].map(v => <th key={v}>{v}</th>)}</tr></thead><tbody>{properties.filter(p => matches(search, p.id, p.name, p.address)).map(p => <tr key={p.id}><th>{p.name}</th><td>{p.units}</td><td>{p.residents}</td><td>{p.alerts}</td><td>{p.usage}%</td></tr>)}</tbody></Table><p className="ad-muted">Header search filters this property table; the Property Scope filter controls totals and exports.</p></Panel>
  </div>
}
