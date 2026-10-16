import AdminPreferencesPage from './AdminPreferencesPage'
import AdminSettingsIcon from './AdminSettingsIcon'
import AdminNotifications from './AdminNotifications'
import { defaultPreferences, useAdminPreferences } from './useAdminPreferences'
import './AdminPersonalization.css'
import AdminProfilePage from './AdminProfilePage'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  { id: 'subscriptions', label: 'Subscriptions', title: 'Subscription Management', icon: 'money', search: 'Search plans and payments...' },
  { id: 'analytics', label: 'Analytics', title: 'System Analytics', icon: 'reports', search: 'Search property metrics...' },
  { id: 'audit', label: 'Audit Logs', title: 'Audit Log Management', icon: 'shift', search: 'Search audit logs...' },
  { id: 'configuration', label: 'System Configuration', title: 'System Configuration', icon: 'settings', search: '' },
]
function Shell({ onLogout }: { onLogout: () => void }) {
  const { page, navigate: go, search, setSearch } = useAdmin()
  const [profileDirty,setProfileDirty]=useState(false),[profileBusy,setProfileBusy]=useState(false),[destination,setDestination]=useState<string|null>(null)
  const previousPage=useRef('dashboard')
  const preferences=useAdminPreferences()
  const applied=preferences.saved?.value||defaultPreferences
  const editingChanged=useCallback((dirty:boolean,busy:boolean)=>{setProfileDirty(dirty);setProfileBusy(busy)},[])
  function navigate(next:string){if(['profile','preferences'].includes(page)&&profileBusy)return;if(['profile','preferences'].includes(page)&&profileDirty&&next!==page){setDestination(next);return}go(next)}
  function openProfile(){if(!['profile','preferences'].includes(page))previousPage.current=page;navigate('profile')}
  function openPreferences(){if(!['profile','preferences'].includes(page))previousPage.current=page;navigate('preferences')}
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const current = page==='profile'?{title:'My Profile',search:''}:page==='preferences'?{title:'Personal Settings',search:''}:pages.find(p => p.id === page)!
  useEffect(() => { setMenu(false); heading.current?.focus({ preventScroll: true }) }, [page])
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('billing') === 'return') {
      navigate('subscriptions'); url.searchParams.delete('billing'); window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  }, [navigate])
  function newProperty() { navigate('properties'); requestAnimationFrame(() => document.getElementById('ad-new-property')?.click()) }
  return <div className="ad-shell" data-text-size={applied.text_size} data-density={applied.density} data-reduce-motion={applied.reduce_motion}><a className="ad-skip" href="#admin-main">Skip to content</a>{menu && <button className="ad-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside className={`ad-sidebar ${menu ? 'ad-sidebar-open' : ''}`} id="admin-sidebar" aria-label="System administrator"><div className="ad-brand"><img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="34" height="34" /><div><strong>CommunityCare</strong><small>System Administrator</small></div></div><nav aria-label="Admin navigation">{pages.map(p => <button key={p.id} className={p.id === page ? 'ad-current' : ''} aria-current={p.id === page ? 'page' : undefined} onClick={() => { navigate(p.id); setMenu(false) }}><StaffIcon name={p.icon} />{p.label}</button>)}</nav><div className="ad-sidebar-bottom"><button disabled={profileBusy} onClick={() => setDialog('logout')}><StaffIcon name="logout" />Logout</button><button className="ad-primary" onClick={() => { newProperty(); setMenu(false) }}>＋ New Property</button></div></aside>
    <div className="ad-workspace"><header className="ad-header"><button className="ad-menu ad-icon" aria-label="Toggle admin navigation" aria-controls="admin-sidebar" aria-expanded={menu} onClick={() => setMenu(!menu)}><StaffIcon name="menu" /></button><h1 ref={heading} tabIndex={-1}>{current.title}</h1>{current.search && <label className="ad-search"><StaffIcon name="search" /><input type="search" placeholder={current.search} aria-label={current.search.replace('...', '')} value={search} onChange={e => setSearch(e.target.value)} /></label>}<AdminNotifications onNavigate={navigate}/><button className={`ad-icon ${page==='preferences'?'ad-personal-selected':''}`} aria-label="Personal settings" aria-current={page==='preferences'?'page':undefined} onClick={openPreferences}><AdminSettingsIcon/></button><button className={`ad-icon ${page === 'profile' ? 'ap-selected' : ''}`} aria-label="My profile" aria-current={page==='profile'?'page':undefined} onClick={openProfile}><StaffIcon name="user" /></button></header>
      <main id="admin-main" tabIndex={-1}>
        {page==='preferences'&&<AdminPreferencesPage saved={preferences.saved} loading={preferences.loading} loadError={preferences.error} onSave={preferences.save} onReload={preferences.reload} onBack={()=>navigate(previousPage.current)} onEditingChange={editingChanged}/>}
        {page==='profile'&&<AdminProfilePage onBack={()=>go(previousPage.current)} onEditingChange={editingChanged}/>}
        <div hidden={page !== 'dashboard'}><AdminDashboard active={page === 'dashboard'} /></div><div hidden={page !== 'properties'}><PropertiesPage active={page === 'properties'} /></div><div hidden={page !== 'users'}><UsersPage active={page === 'users'} /></div><div hidden={page !== 'subscriptions'}><AdminSubscriptionsPage active={page === 'subscriptions'} /></div><div hidden={page !== 'analytics'}><AnalyticsPage active={page === 'analytics'} /></div><div hidden={page !== 'audit'}><AuditLogsPage active={page === 'audit'} /></div><div hidden={page !== 'configuration'}><SystemConfigurationPage active={page === 'configuration'} /></div>
      </main>
    </div>
    {destination&&<Modal title="Discard unsaved changes?" onClose={()=>setDestination(null)}><p>You have unsaved changes. Leave without saving?</p><div className="ad-actions"><button onClick={()=>setDestination(null)}>Keep editing</button><button onClick={()=>{go(destination);setDestination(null)}}>Discard and leave</button></div></Modal>}
    {dialog && <Modal title={dialog === 'logout' ? 'Sign out?' : 'System Administrator'} onClose={() => setDialog('')}><p>{dialog === 'logout' ? 'You will be signed out. Any unsaved edits will be discarded.' : 'You are signed in as a system administrator. The dashboard and administration pages use saved backend data. Device automation settings remain pending device integration.'}</p><div className="ad-actions ad-end"><button onClick={() => setDialog('')}>Close</button>{dialog === 'logout' && <button className="ad-primary" onClick={onLogout}>Sign out</button>}</div></Modal>}
  </div>
}
export default function AdminPortal({ onLogout }: { onLogout: () => void }) { return <AdminProvider><Shell onLogout={onLogout} /></AdminProvider> }


