import { useEffect, useRef, useState } from 'react'
import StaffIcon from './StaffIcon'
import type { StaffIconName } from './StaffIcon'
import StaffDashboard from './StaffDashboard'
import ResidentPage from './ResidentPage'
import TaskPage from './TaskPage'
import AlertsPage from './AlertsPage'
import StaffPage from './StaffPage'
import SubscriptionPage from './SubscriptionPage'
import IncidentsPage from './IncidentsPage'
import ReportsPage from './ReportsPage'
import { PortalProvider, usePortal } from './PortalContext'
import { Modal } from './PortalUI'
import './StaffDashboard.css'
import './Portal.css'

const pages: { id: string; label: string; title: string; icon: StaffIconName; search: string }[] = [
  { id: 'dashboard', label: 'Dashboard', title: 'CommunityCare Staff Dashboard', icon: 'dashboard', search: 'Search dashboard residents...' },
  { id: 'residents', label: 'Residents', title: 'Resident Management', icon: 'residents', search: 'Search residents...' },
  { id: 'tasks', label: 'Tasks', title: 'Task Management', icon: 'tasks', search: 'Search tasks...' },
  { id: 'alerts', label: 'Alerts', title: 'Emergency Alerts', icon: 'alerts', search: 'Search alerts...' },
  { id: 'staff', label: 'Staff', title: 'Staff Management', icon: 'staff', search: 'Search staff...' },
  { id: 'subscription', label: 'Subscription', title: 'Subscription Management', icon: 'reports', search: 'Search invoices...' },
  { id: 'incidents', label: 'Incidents', title: 'Incident Management', icon: 'incidents', search: 'Search incidents...' },
  { id: 'reports', label: 'Reports', title: 'Reports & Analytics', icon: 'reports', search: 'Search staff performance...' },
]
function Shell({ onLogout }: { onLogout: () => void }) {
  const { search, setSearch, alerts } = usePortal()
  const [page, setPage] = useState('dashboard')
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const info = pages.find(p => p.id === page)!
  function navigate(next: string) {
    const mapped = ({ 'staff-top': 'dashboard', 'staff-residents': 'residents', 'staff-tasks': 'tasks', 'staff-alerts': 'alerts', 'staff-incidents': 'incidents', 'staff-trends': 'reports' } as Record<string, string>)[next] || next
    if (!pages.some(p => p.id === mapped)) return
    setPage(mapped); setSearch(''); setMenu(false); window.scrollTo(0, 0)
  }
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [page])
  return <div className="sd-app pp-shell">
    <a className="sd-skip" href="#portal-content">Skip to page content</a>
    {menu && <button className="pp-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside id="portal-navigation" className={`sd-sidebar ${menu ? 'sd-sidebar-open' : ''}`} aria-label="Staff portal"><div className="sd-brand"><img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="38" height="38" /><div><strong>CommunityCare</strong><span>Staff Portal</span></div></div><nav aria-label="Staff portal navigation">{pages.map(p => <button type="button" key={p.id} className={page === p.id ? 'sd-nav-current' : ''} aria-current={page === p.id ? 'page' : undefined} onClick={() => navigate(p.id)}><StaffIcon name={p.icon} /><span>{p.label}</span></button>)}</nav><button className="sd-logout" onClick={() => setDialog('logout')}><StaffIcon name="logout" />Logout</button></aside>
    <div className="sd-workspace"><header className="sd-header pp-header"><button type="button" className="sd-menu sd-icon-button" aria-label="Toggle navigation" aria-controls="portal-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><StaffIcon name="menu" /></button><h1 ref={heading} tabIndex={-1}>{info.title}</h1><label className="sd-search"><StaffIcon name="search" /><input type="search" aria-label={info.search.replace('...', '')} placeholder={info.search} value={search} onChange={e => setSearch(e.target.value)} /></label><button className="sd-icon-button pp-bell" aria-label={`${alerts.filter(a => (a.status === 'Active' || a.status === 'Pending')).length} unresolved alerts`} onClick={() => navigate('alerts')}><StaffIcon name="alerts" /><span>{alerts.filter(a => (a.status === 'Active' || a.status === 'Pending')).length}</span></button><button className="sd-icon-button" aria-label="Staff account" onClick={() => setDialog('account')}><StaffIcon name="user" /></button></header>
      {page !== 'dashboard' && page !== 'residents' && page !== 'tasks' && (
        <div className="sd-demo-banner">{page === 'alerts' ? 'Alerts · Supabase records' : 'This module still uses demo data · Changes may reset on reload'}</div>
      )}
      <div id="portal-content" tabIndex={-1}>
        <div hidden={page !== 'dashboard'}><StaffDashboard onLogout={onLogout} onResidents={() => navigate('residents')} onTasks={() => navigate('tasks')} onPage={navigate} /></div>
        <div hidden={page !== 'residents'}><ResidentPage onLogout={onLogout} /></div>
        <div hidden={page !== 'tasks'}><TaskPage onLogout={onLogout} active={page === 'tasks'} /></div>
        <div hidden={page !== 'alerts'}><AlertsPage /></div>
        <div hidden={page !== 'staff'}><StaffPage /></div>
        <div hidden={page !== 'subscription'}><SubscriptionPage /></div>
        <div hidden={page !== 'incidents'}><IncidentsPage /></div>
        <div hidden={page !== 'reports'}><ReportsPage /></div>
      </div>
    </div>
    {dialog && <Modal title={dialog === 'logout' ? 'Leave staff preview?' : 'Staff preview account'} onClose={() => setDialog('')}><p>{dialog === 'logout' ? 'All local demo changes will reset. No server records will be changed.' : 'CommunityCare staff preview. Authentication and property permissions will be connected later.'}</p><div className="sd-dialog-actions"><button onClick={() => setDialog('')}>Close</button>{dialog === 'logout' && <button className="sd-primary" onClick={onLogout}>Leave preview</button>}</div></Modal>}
  </div>
}
export default function StaffPortal({ onLogout }: { onLogout: () => void }) { return <PortalProvider><Shell onLogout={onLogout} /></PortalProvider> }


