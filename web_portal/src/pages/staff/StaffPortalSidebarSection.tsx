import StaffIcon from './StaffIcon'
import type { StaffIconName } from './StaffIcon'

const navigation: { label: string; icon: StaffIconName; target?: string }[] = [
  { label: 'Dashboard', icon: 'dashboard', target: 'staff-top' },
  { label: 'Residents', icon: 'residents', target: 'staff-residents' },
  { label: 'Tasks', icon: 'tasks', target: 'staff-tasks' },
  { label: 'Alerts', icon: 'alerts', target: 'staff-alerts' },
  { label: 'Staff', icon: 'staff' },
  { label: 'Subscription', icon: 'reports' },
  { label: 'Incidents', icon: 'incidents', target: 'staff-incidents' },
  { label: 'Reports', icon: 'reports', target: 'staff-trends' },
  { label: 'Settings', icon: 'settings' },
]
type Props = { active?: string; open: boolean; onNavigate: (target: string) => void; onInfo: (title: string) => void; onLogout: () => void }
export default function StaffPortalSidebarSection({ open, active = 'Dashboard', onNavigate, onInfo, onLogout }: Props) {
  return <aside id={active === 'Tasks' ? 'task-sidebar' : active === 'Residents' ? 'resident-sidebar' : 'staff-sidebar'} className={`sd-sidebar ${open ? 'sd-sidebar-open' : ''}`} aria-label="Staff portal">
    <div className="sd-brand"><img src={`${import.meta.env.BASE_URL}communitycare-logo.png`} alt="" width="38" height="38" /><div><strong>CommunityCare</strong><span>Staff Portal</span></div></div>
    <nav aria-label="Staff portal navigation">{navigation.map((item) => <button key={item.label} type="button"
      className={item.label === active ? 'sd-nav-current' : ''} aria-current={item.label === active ? 'page' : undefined}
      onClick={() => item.target ? onNavigate(item.target) : onInfo(item.label)}>
      <StaffIcon name={item.icon} /><span>{item.label}</span>
    </button>)}</nav>
    <button type="button" className="sd-logout" onClick={onLogout}><StaffIcon name="logout" />Logout</button>
  </aside>
}



