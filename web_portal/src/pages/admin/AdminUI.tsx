import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function Panel({ title, children, actions, className = '' }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) { return <section className={`ad-panel ${className}`}><div className="ad-heading"><h2>{title}</h2>{actions && <div className="ad-actions">{actions}</div>}</div>{children}</section> }
export function Table({ label, children }: { label: string; children: ReactNode }) { return <div className="ad-table" tabIndex={0} role="region" aria-label={label}><table>{children}</table></div> }
export function Notice({ children }: { children: ReactNode }) { return children ? <p role="status" className="ad-notice">{children}</p> : null }
export function Badge({ value }: { value: string }) { return <span className={`ad-badge ${['Active', 'Paid', 'Success', 'Approved', 'Resolved'].includes(value) ? 'ad-green' : ['Failed', 'Alert', 'Declined'].includes(value) ? 'ad-red' : ['Pending', 'Maintenance', 'Investigating'].includes(value) ? 'ad-orange' : ''}`}>{value}</span> }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId()
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} className="ad-dialog" aria-labelledby={id} onCancel={onClose}><div className="ad-heading"><h2 id={id}>{title}</h2><button aria-label="Close dialog" onClick={onClose}>×</button></div>{children}</dialog>
}
export function Toggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) { return <label className="ad-toggle"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} /></label> }
export function matches(query: string, ...values: (string | number)[]) { return values.join(' ').toLowerCase().includes(query.trim().toLowerCase()) }
export function csvDownload(filename: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => { const s = String(v); return '"' + (/^\s*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"' }
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function LineChart({ labels, series, unit = '' }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; unit?: string }) {
  const max = Math.max(1, ...series.flatMap(s => s.values)) * 1.15
  return <><div className="ad-legend">{series.map(s => <span key={s.name} style={{ color: s.color }}>● {s.name}</span>)}</div><svg className="ad-chart" viewBox="0 0 550 265" role="img" aria-label={`${unit}. ${series.map(s => s.name + ': ' + s.values.join(', ')).join('. ')}`}><text x="12" y="17">{unit}</text>{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="55" x2="525" y1={215 - i * 45} y2={215 - i * 45} stroke="#dbe5e0" /><text x="6" y={219 - i * 45}>{Math.round(max * i / 4).toLocaleString()}</text></g>)}{series.map(s => <polyline key={s.name} points={s.values.map((v, i) => `${55 + i * 470 / Math.max(labels.length - 1, 1)},${215 - v / max * 180}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" />)}{labels.map((label, i) => <text key={label} x={55 + i * 470 / Math.max(labels.length - 1, 1)} y="245" textAnchor="middle">{label}</text>)}</svg></>
}
export function BarChart({ labels, values, colors = ['#44a0e8'], unit = 'Count' }: { labels: string[]; values: number[]; colors?: string[]; unit?: string }) {
  const max = Math.max(1, ...values) * 1.15
  return <svg className="ad-chart" viewBox="0 0 550 260" role="img" aria-label={`${unit}: ${labels.map((label, i) => label + ' ' + values[i]).join(', ')}`}><text x="12" y="17">{unit}</text>{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="45" x2="530" y1={205 - i * 42} y2={205 - i * 42} stroke="#dbe5e0" /><text x="5" y={209 - i * 42}>{Math.round(max * i / 4)}</text></g>)}{values.map((v, i) => { const x = 70 + i * 450 / labels.length; return <g key={labels[i]}><rect x={x} y={205 - v / max * 170} width={Math.min(60, 300 / labels.length)} height={v / max * 170} fill={colors[i % colors.length]} rx="3" /><text x={x + 25} y={197 - v / max * 170} textAnchor="middle">{v}</text><text x={x + 25} y="235" textAnchor="middle">{labels[i]}</text></g> })}</svg>
}
