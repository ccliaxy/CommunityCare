import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export const staffNames = ['Sarah Jenkins', 'Marcus Chen', 'Elena Rodriguez']
export const residentOptions = [{ name: 'Eleanor Vance', unit: 'A-102' }, { name: 'Robert Clark', unit: 'B-205' }, { name: 'Martha Jones', unit: 'C-310' }]
export const sampleNow = '2026-10-06T12:00'
export type AlertRecord = { id: string; name: string; unit: string; type: string; time: string; status: 'Active' | 'Pending' | 'Resolved'; responder: string; actions: string; notes: string }
export type Incident = { id: string; alertId?: string; type: string; name: string; unit: string; date: string; location: string; description: string; staff: string; status: 'Pending' | 'Completed'; action: string; evidence: string }
export type PrintReport = { title: string; headings: string[]; rows: (string | number)[][]; note?: string }
type Context = { search: string; setSearch: (s: string) => void; alerts: AlertRecord[]; setAlerts: Dispatch<SetStateAction<AlertRecord[]>>; incidents: Incident[]; setIncidents: Dispatch<SetStateAction<Incident[]>>; print: (report: PrintReport) => void }
const PortalContext = createContext<Context | null>(null)
export function usePortal() { const value = useContext(PortalContext); if (!value) throw new Error('PortalProvider is required'); return value }
export function PortalProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState('')
  const [alerts, setAlerts] = useState<AlertRecord[]>([
    { id: 'ALT-102', name: 'Eleanor Vance', unit: 'A-102', type: 'Fall Detection', time: '2026-10-06T10:45', status: 'Active', responder: 'Marcus Chen', actions: '', notes: '' },
    { id: 'ALT-101', name: 'Robert Clark', unit: 'B-205', type: 'Medication Missed', time: '2026-10-06T09:15', status: 'Pending', responder: '', actions: '', notes: '' },
  ])
  const [incidents, setIncidents] = useState<Incident[]>([
    { id: 'INC-2041', alertId: 'ALT-102', type: 'Fall', name: 'Eleanor Vance', unit: 'A-102', date: '2026-10-06T10:45', location: 'Hallway', description: 'Sample fall detection alert received.', staff: 'Marcus Chen', status: 'Pending', action: 'Awaiting follow-up review.', evidence: '' },
    { id: 'INC-2040', type: 'Maintenance', name: 'Robert Clark', unit: 'B-205', date: '2026-10-05T09:30', location: 'Bathroom', description: 'Loose handrail reported.', staff: 'Sarah Jenkins', status: 'Completed', action: 'Handrail secured and checked.', evidence: '' },
    { id: 'INC-2039', type: 'Complaint', name: 'Martha Jones', unit: 'C-310', date: '2026-10-02T15:00', location: 'Common area', description: 'Noise complaint received.', staff: 'Elena Rodriguez', status: 'Completed', action: 'Quiet-hours reminder provided.', evidence: '' },
  ])
  const [report, setReport] = useState<PrintReport | null>(null)
  function print(next: PrintReport) { setReport(next); requestAnimationFrame(() => requestAnimationFrame(() => window.print())) }
  return <PortalContext.Provider value={{ search, setSearch, alerts, setAlerts, incidents, setIncidents, print }}>{children}<div className="pp-print" aria-hidden="true"><h1>CommunityCare · {report?.title}</h1><p>DEMO DATA — Not an official record. {report?.note}</p><table><thead><tr>{report?.headings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{report?.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></PortalContext.Provider>
}
