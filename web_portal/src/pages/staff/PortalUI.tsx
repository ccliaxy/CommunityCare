import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close() }, [])
  return <dialog ref={ref} className="sd-dialog pp-dialog" aria-labelledby={id} onCancel={onClose}><div className="pp-heading"><h2 id={id}>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>{children}</dialog>
}
export function Panel({ title, actions, children, className = '' }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`pp-panel ${className}`}><div className="pp-heading"><h2>{title}</h2>{actions && <div className="pp-actions">{actions}</div>}</div>{children}</section>
}
export function Badge({ value }: { value: string }) { return <span className={`pp-badge ${['Active', 'Missed', 'Declined'].includes(value) ? 'pp-red' : ['Pending', 'Unassigned'].includes(value) ? 'pp-orange' : ['Completed', 'Resolved', 'Paid', 'Approved', 'On duty'].includes(value) ? 'pp-green' : ''}`}>{value}</span> }
export function Table({ label, children }: { label: string; children: ReactNode }) { return <div className="pp-table" tabIndex={0} role="region" aria-label={label}><table>{children}</table></div> }
export function Notice({ children }: { children: ReactNode }) { return children ? <p className="pp-notice" role="status">{children}</p> : null }
export function csvDownload(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => { const s = String(v); return '"' + (/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"' }
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function includesSearch(search: string, ...values: (string | number)[]) { return values.join(' ').toLowerCase().includes(search.trim().toLowerCase()) }
