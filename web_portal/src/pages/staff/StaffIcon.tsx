export type StaffIconName = 'dashboard' | 'residents' | 'tasks' | 'alerts' | 'staff' | 'incidents' | 'reports' | 'settings' | 'logout' | 'plus' | 'search' | 'user' | 'maintenance' | 'shift' | 'menu'
const paths: Record<StaffIconName, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  residents: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2',
  tasks: 'M8 4H5v17h14V4h-3M8 2h8v5H8zM8 11h8m-8 4h8',
  alerts: 'M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9m4 12h4',
  staff: 'M4 7h16v14H4zM9 7V3h6v4M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 8a4 4 0 0 1 8 0',
  incidents: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
  reports: 'M4 3h16v18H4zM8 17v-4m4 4V7m4 10v-7',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm3 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  logout: 'M9 3H4v18h5m4-5 4-4-4-4m-5 4h13',
  plus: 'M12 5v14M5 12h14',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',
  maintenance: 'M14 3a6 6 0 0 0-7 8L2 16l6 6 5-5a6 6 0 0 0 8-7l-4 3-4-4 3-4-2-2Z',
  shift: 'M4 5h16v16H4zM8 2v6m8-6v6M4 11h16m-11 4h2m3 0h2',
  menu: 'M3 6h18M3 12h18M3 18h18',
}
export default function StaffIcon({ name }: { name: StaffIconName }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>
}
