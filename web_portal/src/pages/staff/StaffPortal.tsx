import './StaffWelcome.css'
import type { QuickAction } from './dashboardQuickAction'
import StaffNotifications from './StaffNotifications'
import StaffProfilePage from './StaffProfilePage'
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
  { id: 'profile', label: 'My Profile', title: 'My Profile', icon: 'user', search: '' },
  { id: 'dashboard', label: 'Dashboard', title: 'CommunityCare Staff Dashboard', icon: 'dashboard', search: 'Search dashboard residents...' },
  { id: 'residents', label: 'Residents', title: 'Resident Management', icon: 'residents', search: 'Search residents...' },
  { id: 'tasks', label: 'Tasks', title: 'Task Management', icon: 'tasks', search: 'Search tasks...' },
  { id: 'alerts', label: 'Alerts', title: 'Emergency Alerts', icon: 'alerts', search: 'Search alerts...' },
  { id: 'staff', label: 'Staff', title: 'Staff Management', icon: 'staff', search: 'Search staff...' },
  { id: 'subscription', label: 'Subscription', title: 'Subscription Management', icon: 'money', search: 'Search invoices...' },
  { id: 'incidents', label: 'Incidents', title: 'Incident Management', icon: 'incidents', search: 'Search incidents...' },
  { id: 'reports', label: 'Reports', title: 'Reports & Analytics', icon: 'reports', search: 'Search staff performance...' },
]
function Shell({ onLogout, userName }: { onLogout: () => void; userName: string }) {
  const { search, setSearch } = usePortal()
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).get('billing') === 'return' ? 'subscription' : 'dashboard')
  const [quick, setQuick] = useState<QuickAction | undefined>()
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState('')
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const previousPage = useRef('dashboard')
  const profileEdit = useRef({ dirty: false, busy: false })
  const heading = useRef<HTMLHeadingElement>(null)
  const info = pages.find(p => p.id === page)!
  function navigate(next: string) {
    const mapped = ({ 'staff-top': 'dashboard', 'staff-residents': 'residents', 'staff-tasks': 'tasks', 'staff-alerts': 'alerts', 'staff-incidents': 'incidents', 'staff-trends': 'reports' } as Record<string, string>)[next] || next
    if (!pages.some(p => p.id === mapped)) return
    if (mapped === page) return
    if (page === 'profile' && profileEdit.current.busy) return
    if (page === 'profile' && profileEdit.current.dirty) { setPendingNavigation(mapped); return }
    if (mapped === 'profile') previousPage.current = page
    setPage(mapped); setSearch(''); setMenu(false); window.scrollTo(0, 0)
  }
  function quickAction(action: string, property: string) {
    const target: Record<string, string> = { 'New Task': 'tasks', 'Register Staff': 'staff', 'Add Resident': 'residents', 'Log Incident': 'incidents', 'Generate Report': 'reports', 'Send Alert': 'alerts', 'Assign Shift': 'staff', 'Create Maintenance': 'incidents' }
    if (!target[action]) return
    navigate(target[action]); setQuick({ id: crypto.randomUUID(), action, property })
  }
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [page])
  return <div className="sd-app pp-shell">
    <a className="sd-skip" href="#portal-content">Skip to page content</a>
    {menu && <button className="pp-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside id="portal-navigation" className={`sd-sidebar ${menu ? 'sd-sidebar-open' : ''}`} aria-label="Staff portal"><div className="sd-brand"><img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="38" height="38" /><div><strong>CommunityCare</strong><span>Staff Portal</span></div></div><nav aria-label="Staff portal navigation">{pages.filter(p => p.id !== 'profile').map(p => <button type="button" key={p.id} className={page === p.id ? 'sd-nav-current' : ''} aria-current={page === p.id ? 'page' : undefined} onClick={() => navigate(p.id)}><StaffIcon name={p.icon} /><span>{p.label}</span></button>)}</nav><button className="sd-logout" onClick={() => setDialog('logout')}><StaffIcon name="logout" />Logout</button></aside>
    <div className="sd-workspace"><header className="sd-header pp-header"><button type="button" className="sd-menu sd-icon-button" aria-label="Toggle navigation" aria-controls="portal-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><StaffIcon name="menu" /></button><div className="staff-header-title"><h1 ref={heading} tabIndex={-1}>{info.title}</h1><p className="staff-welcome" title={`Welcome, ${userName}`}>Welcome, {userName}</p></div>{page !== 'profile' && <label className="sd-search"><StaffIcon name="search" /><input type="search" aria-label={info.search.replace('...', '')} placeholder={info.search} value={search} onChange={e => setSearch(e.target.value)} /></label>}<StaffNotifications onNavigate={navigate} /><button className="sd-icon-button" aria-label="Staff account" aria-current={page === 'profile' ? 'page' : undefined} onClick={() => navigate('profile')}><StaffIcon name="user" /></button></header>
      {page !== 'dashboard' && page !== 'residents' && page !== 'tasks' && page !== 'alerts' && page !== 'staff' && page !== 'profile' && page !== 'subscription' && page !== 'incidents' && page !== 'reports' && (
        <div className="sd-demo-banner">{page === 'alerts' ? 'Alerts · Supabase records' : 'This module still uses demo data · Changes may reset on reload'}</div>
      )}
      <div id="portal-content" tabIndex={-1}>
        {page === 'profile' && <StaffProfilePage onEditingChange={(dirty, busy) => { profileEdit.current = { dirty, busy } }} onBack={() => { profileEdit.current.dirty = false; navigate(previousPage.current) }} />}
        <div hidden={page !== 'dashboard'}><StaffDashboard onLogout={onLogout} onResidents={() => navigate('residents')} onTasks={() => navigate('tasks')} onPage={navigate} active={page === 'dashboard'} onQuickAction={quickAction} /></div>
        <div hidden={page !== 'residents'}><ResidentPage onLogout={onLogout} active={page === 'residents'} quick={quick} /></div>
        <div hidden={page !== 'tasks'}><TaskPage onLogout={onLogout} active={page === 'tasks'} quick={quick} /></div>
        <div hidden={page !== 'alerts'}><AlertsPage active={page === 'alerts'} quick={quick} /></div>
        <div hidden={page !== 'staff'}><StaffPage active={page === 'staff'} quick={quick} /></div>
        <div hidden={page !== 'subscription'}><SubscriptionPage active={page === 'subscription'} /></div>
        <div hidden={page !== 'incidents'}><IncidentsPage active={page === 'incidents'} quick={quick} onAlerts={() => navigate('alerts')} /></div>
        <div hidden={page !== 'reports'}><ReportsPage active={page === 'reports'} quick={quick} /></div>
      </div>
    </div>
    {pendingNavigation && <Modal title="Discard unsaved changes?" onClose={() => setPendingNavigation(null)}><p>Your profile has unsaved changes. Do you want to discard them and leave this page?</p><div className="sd-dialog-actions"><button onClick={() => setPendingNavigation(null)}>Keep editing</button><button className="sd-primary" onClick={() => { const destination = pendingNavigation; profileEdit.current.dirty = false; setPendingNavigation(null); navigate(destination) }}>Discard and leave</button></div></Modal>}
    {dialog === 'logout' && <Modal title="Sign out?" onClose={() => setDialog('')}><p>You will be signed out. Saved records will remain in Supabase.</p><div className="sd-dialog-actions"><button onClick={() => setDialog('')}>Close</button><button className="sd-primary" onClick={onLogout}>Sign out</button></div></Modal>}
  </div>
}
export default function StaffPortal({ onLogout, userName = 'Staff' }: { onLogout: () => void; userName?: string }) { return <PortalProvider><Shell onLogout={onLogout} userName={userName} /></PortalProvider> }







