import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export const DEMO_NOW = '2026-10-06T15:00:00'
export const roles = ['System Admin', 'Property Manager', 'Staff'] as const
export type Role = typeof roles[number]
export type Property = { id: string; name: string; address: string; units: number; manager: string; activation: string; status: string; residents: number; alerts: number; response: number; usage: number; settings: { emergency: boolean; checkIn: string; plan: string; maintenance: string } }
export type User = { id: string; name: string; email: string; role: Role; property: string; active: boolean }
export type Plan = { id: string; name: string; price: number; duration: string; active: boolean; features: Record<string, boolean> }
export type Audit = { id: string; time: string; user: string; action: string; description: string; result: 'Success' | 'Failed'; ip: string }
export type Config = { wake: string; language: string; volume: number; voice: boolean; activation: string; escalation: number; sms: boolean; contacts: string[]; fall: boolean; sensitivity: string; impact: number; confirmation: number; noMovement: number; postVoice: boolean }
export const defaultConfig: Config = { wake: 'CommunityCare', language: 'English', volume: 80, voice: true, activation: 'Both', escalation: 30, sms: true, contacts: ['Primary Caregiver', 'Secondary Contact', 'Emergency Services (not configured)'], fall: true, sensitivity: 'Medium', impact: 3, confirmation: 15, noMovement: 60, postVoice: true }
export const modules = ['Residents', 'Tasks', 'Alerts', 'Staff', 'Reports']
export const featureNames = ['Video Calls', 'Fall Detection', 'Geofencing', 'Emergency Alerts']
export type State = {
  properties: Property[]; users: User[]; plans: Plan[]; logs: Audit[]; config: Config;
  permissions: Record<string, Record<string, boolean[]>>; forcePassword: boolean;
  sessions: { id: string; user: string; details: string; current: boolean; active: boolean }[];
  payments: { id: string; property: string; plan: string; amount: number; date: string; status: string }[];
  promos: { id: string; name: string; discount: number; active: boolean }[];
  refunds: { id: string; property: string; amount: number; status: string }[];
  retention: { days: string; purge: boolean };
}
const features = { 'Video Calls': true, 'Fall Detection': true, Geofencing: false, 'Emergency Alerts': true }
const propertySettings = { emergency: true, checkIn: '10:00', plan: 'PLAN-2', maintenance: '2026-10-15' }
export function initialState(): State {
  return {
    properties: [
      { id: 'PRP-1042', name: 'Oakwood Heights', address: 'Ayer Itam, Penang', units: 158, manager: 'manager@oakwood.example', activation: '2026-01-15', status: 'Active', residents: 120, alerts: 3, response: 4.5, usage: 87, settings: { ...propertySettings } },
      { id: 'PRP-1043', name: 'Sunset Towers', address: 'Georgetown, Penang', units: 220, manager: 'manager@sunset.example', activation: '2026-03-10', status: 'Maintenance', residents: 180, alerts: 0, response: 3.2, usage: 80, settings: { ...propertySettings } },
      { id: 'PRP-1044', name: 'Lakeview Manor', address: 'Jelutong, Penang', units: 95, manager: 'manager@lakeview.example', activation: '2026-06-01', status: 'Alert', residents: 68, alerts: 5, response: 6, usage: 73, settings: { ...propertySettings, plan: 'PLAN-1' } },
    ],
    users: [
      { id: 'USR-001', name: 'Admin User', email: 'admin@communitycare.example', role: 'System Admin', property: '', active: true },
      { id: 'USR-002', name: 'Sarah Jenkins', email: 'sarah@oakwood.example', role: 'Property Manager', property: 'PRP-1042', active: true },
      { id: 'USR-003', name: 'Michael Scott', email: 'michael@sunset.example', role: 'Staff', property: 'PRP-1043', active: false },
      { id: 'USR-004', name: 'Elena Rodriguez', email: 'elena@lakeview.example', role: 'Staff', property: 'PRP-1044', active: true },
    ],
    plans: [{ id: 'PLAN-1', name: 'Standard Care', price: 49.99, duration: 'Monthly', active: true, features: { ...features } }, { id: 'PLAN-2', name: 'Premium Safety', price: 499.99, duration: 'Yearly', active: true, features: { ...features, Geofencing: true } }],
    logs: Array.from({ length: 12 }, (_, i) => ({ id: `LOG-${8942 - i}`, time: `2026-10-${i < 8 ? '06' : '05'}T${String(14 - i % 8).padStart(2, '0')}:30:00`, user: i % 3 === 0 ? 'System' : i % 2 ? 'Sarah Jenkins' : 'Admin User', action: ['Config Update', 'Login', 'API Sync', 'Data Export'][i % 4], description: ['Updated demo notification preferences.', 'Sample sign-in recorded.', 'Sample synchronization result.', 'Prepared a sample report.'][i % 4], result: i % 5 === 2 ? 'Failed' : 'Success', ip: `192.0.2.${10 + i}` })),
    config: { ...defaultConfig, contacts: [...defaultConfig.contacts] },
    permissions: Object.fromEntries(roles.map(role => [role, Object.fromEntries(modules.map(m => [m, role === 'System Admin' ? [true, true, true, true] : role === 'Property Manager' ? [true, true, false, true] : [true, false, false, false]]))])),
    forcePassword: true,
    sessions: [{ id: 'SES-1', user: 'Sarah Jenkins', details: 'Chrome on Windows · sample session', current: false, active: true }, { id: 'SES-2', user: 'Admin User', details: 'Current preview session', current: true, active: true }],
    payments: [{ id: 'TXN-8923', property: 'PRP-1042', plan: 'PLAN-2', amount: 499.99, date: '2026-10-01', status: 'Paid' }, { id: 'TXN-8924', property: 'PRP-1043', plan: 'PLAN-2', amount: 499.99, date: '2026-10-02', status: 'Pending' }, { id: 'TXN-8925', property: 'PRP-1044', plan: 'PLAN-1', amount: 49.99, date: '2026-10-03', status: 'Failed' }],
    promos: [{ id: 'PROMO-1', name: 'Welcome Trial', discount: 20, active: true }], refunds: [{ id: 'REF-1', property: 'PRP-1042', amount: 49.99, status: 'Pending' }], retention: { days: '90', purge: false },
  }
}
type PrintReport = { title: string; headers: string[]; rows: (string | number)[][]; note?: string }
type Context = { state: State; update: (action: string, description: string, change?: (state: State) => State) => void; search: string; setSearch: (search: string) => void; page: string; navigate: (page: string) => void; print: (report: PrintReport) => void }
const AdminContext = createContext<Context | null>(null)
export function useAdmin() { const context = useContext(AdminContext); if (!context) throw new Error('AdminProvider is required'); return context }
export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState('dashboard')
  const [report, setReport] = useState<PrintReport | null>(null)
  function update(action: string, description: string, change?: (state: State) => State) {
    const log: Audit = { id: `LOG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, time: DEMO_NOW, user: 'Admin User', action, description, result: 'Success', ip: '192.0.2.1' }
    setState(old => ({ ...(change ? change(old) : old), logs: [log, ...old.logs] }))
  }
  function navigate(next: string) { setPage(next); setSearch(''); window.scrollTo(0, 0) }
  function print(next: PrintReport) { setReport(next); requestAnimationFrame(() => requestAnimationFrame(() => window.print())) }
  return <AdminContext.Provider value={{ state, update, search, setSearch, page, navigate, print }}>{children}<div className="ad-print" aria-hidden="true"><h1>CommunityCare · {report?.title}</h1><p>DEMO DATA — Not an official record. {report?.note}</p><table><thead><tr>{report?.headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{report?.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></AdminContext.Provider>
}
