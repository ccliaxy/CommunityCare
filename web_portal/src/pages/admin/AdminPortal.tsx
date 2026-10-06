import { useEffect, useRef, useState } from 'react'
import StaffIcon from '../staff/StaffIcon'
import type { StaffIconName } from '../staff/StaffIcon'
import { AdminProvider, useAdmin } from './AdminContext'
import { Modal } from './AdminUI'
import AdminDashboard from './AdminDashboard'
import PropertiesPage from './PropertiesPage'
import UsersPage from './UsersPage'
import AdminSubscriptionsPage from './AdminSubscriptionsPage'
import AnalyticsPage from './AnalyticsPage'
import AuditLogsPage from './AuditLogsPage'
import SystemConfigurationPage from './SystemConfigurationPage'
import './AdminPortal.css'

const pages: { id: string; label: string; title: string; icon: StaffIconName; search: string }[] = [
  { id: 'dashboard', label: 'Dashboard', title: 'System Admin Dashboard', icon: 'dashboard', search: 'Search properties...' },
  { id: 'properties', label: 'Properties', title: 'Properties', icon: 'tasks', search: 'Search properties...' },
  { id: 'users', label: 'Users', title: 'User Account Management', icon: 'residents', search: 'Search accounts...' },
  { id: 'subscriptions', label: 'Subscriptions', title: 'Subscription Management', icon: 'reports', search: 'Search plans and payments...' },
  { id: 'analytics', label: 'Analytics', title: 'System Analytics', icon: 'dashboard', search: 'Search property metrics...' },
  { id: 'audit', label: 'Audit Logs', title: 'Audit Log Management', icon: 'shift', search: 'Search audit logs...' },
  { id: 'configuration', label: 'System Configuration', title: 'System Configuration', icon: 'settings', search: '' },
]
function Shell({ onLogout }: { onLogout: () => void }) {
  const { state, page, navigate, search, setSearch } = useAdmin()
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const current = pages.find(p => p.id === page)!
  useEffect(() => { setMenu(false); heading.current?.focus({ preventScroll: true }) }, [page])
  function newProperty() { navigate('properties'); requestAnimationFrame(() => document.getElementById('ad-new-property')?.click()) }
  return <div className="ad-shell"><a className="ad-skip" href="#admin-main">Skip to content</a>{menu && <button className="ad-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside className={`ad-sidebar ${menu ? 'ad-sidebar-open' : ''}`} id="admin-sidebar" aria-label="System administrator"><div className="ad-brand"><img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="34" height="34" /><div><strong>CommunityCare</strong><small>System Administrator</small></div></div><nav aria-label="Admin navigation">{pages.map(p => <button key={p.id} className={p.id === page ? 'ad-current' : ''} aria-current={p.id === page ? 'page' : undefined} onClick={() => { navigate(p.id); setMenu(false) }}><StaffIcon name={p.icon} />{p.label}</button>)}</nav><div className="ad-sidebar-bottom"><button onClick={() => setDialog('logout')}><StaffIcon name="logout" />Logout</button><button className="ad-primary" onClick={() => { newProperty(); setMenu(false) }}>＋ New Property</button></div></aside>
    <div className="ad-workspace"><header className="ad-header"><button className="ad-menu ad-icon" aria-label="Toggle admin navigation" aria-controls="admin-sidebar" aria-expanded={menu} onClick={() => setMenu(!menu)}><StaffIcon name="menu" /></button><h1 ref={heading} tabIndex={-1}>{current.title}</h1>{current.search && <label className="ad-search"><StaffIcon name="search" /><input type="search" placeholder={current.search} aria-label={current.search.replace('...', '')} value={search} onChange={e => setSearch(e.target.value)} /></label>}<button className="ad-icon" aria-label="Review security alerts" onClick={() => { navigate('audit'); requestAnimationFrame(() => document.getElementById('ad-security')?.scrollIntoView()) }}><StaffIcon name="alerts" /></button><button className="ad-icon" aria-label="System configuration" onClick={() => navigate('configuration')}><StaffIcon name="settings" /></button><button className="ad-icon" aria-label="Admin account" onClick={() => setDialog('account')}><StaffIcon name="user" /></button></header>
      <div className="ad-demo">Admin frontend preview · No real permissions, payments or device settings are changed · Resets on logout / reload</div>
      <main id="admin-main" tabIndex={-1}>
        <div hidden={page !== 'dashboard'}><AdminDashboard /></div><div hidden={page !== 'properties'}><PropertiesPage /></div><div hidden={page !== 'users'}><UsersPage /></div><div hidden={page !== 'subscriptions'}><AdminSubscriptionsPage /></div><div hidden={page !== 'analytics'}><AnalyticsPage /></div><div hidden={page !== 'audit'}><AuditLogsPage /></div><div hidden={page !== 'configuration'}><SystemConfigurationPage /></div>
      </main>
    </div>
    {dialog && <Modal title={dialog === 'logout' ? 'Leave Admin Preview?' : 'System Administrator Preview'} onClose={() => setDialog('')}><p>{dialog === 'logout' ? 'All local demo changes, including unsaved forms, will reset. Nothing has been sent to a server.' : `${state.users.find(u => u.id === 'USR-001')?.name} · This is a preview account, not authenticated administrator access.`}</p><div className="ad-actions ad-end"><button onClick={() => setDialog('')}>Close</button>{dialog === 'logout' && <button className="ad-primary" onClick={onLogout}>Leave preview</button>}</div></Modal>}
  </div>
}
export default function AdminPortal({ onLogout }: { onLogout: () => void }) { return <AdminProvider><Shell onLogout={onLogout} /></AdminProvider> }
