import { useQuickAction } from './dashboardQuickAction'
import type { QuickAction } from './dashboardQuickAction'
import './AlertCancelButton.css'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { usePortal } from './PortalContext'
import { Badge, includesSearch, Modal, Notice, Panel, Table } from './PortalUI'
import AlertLocationMap from './AlertLocationMap'
import { displayAlertTime } from './alertData'
import type { LiveAlert } from './alertData'
import { createAlert, readAlertOptions, updateAlert } from './alertRepository'
import type { AlertOptions } from './alertRepository'

function AlertEditor({alert,options,blocked,refresh,onReload}:{alert:LiveAlert;options:AlertOptions|null;blocked:boolean;refresh:()=>Promise<void>;onReload:()=>void}){
 const [version,setVersion]=useState(alert.revision),[member,setMember]=useState(alert.assignedMembershipId??'')
 const [actions,setActions]=useState(alert.actions),[notes,setNotes]=useState(alert.notes),[outcome,setOutcome]=useState(alert.report?.outcome??'pending')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const closed=['Resolved','Cancelled'].includes(alert.status),stale=version!==alert.revision,disabled=busy||blocked||closed||stale
 async function save(action:string,details:Record<string,unknown>={}){
  if(disabled)return;setBusy(true);setError('');setNotice('')
  try{const saved=await updateAlert(alert.id,{revision:version,action,...details});setVersion(saved.revision);setNotice(action==='report'?'Report saved to the incident record.':'Alert updated.');await refresh()}
  catch(e){setError(e instanceof Error?e.message:'Could not save.');await refresh()}
  finally{setBusy(false)}
 }
 return <div className="pp-alert-grid"><div className="pp-stack">
  {(error||notice||stale)&&<Panel title="Update status">{error&&<p role="alert">{error}</p>}<Notice>{notice}</Notice>{stale&&<p>This alert changed. Reload before editing; unsaved form changes will be discarded.</p>}{stale&&<button onClick={onReload} disabled={busy}>Discard draft and reload</button>}</Panel>}
  <Panel title="Responder Assignment" className="pp-responder"><p><strong>{alert.name}</strong> · {alert.propertyName}</p><p style={{overflowWrap:'anywhere'}}>Alert ID: {alert.id}</p><div className="pp-inset">Responder: <strong>{alert.responder}</strong></div>
   {!closed&&<><label>Responder<select value={member} onChange={e=>setMember(e.target.value)} disabled={disabled||!options}><option value="">Select active staff…</option>{options?.staff.filter(s=>s.property_id===alert.propertyId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="pp-actions"><button disabled={disabled||!member} onClick={()=>void save('assign',{membership_id:member})}>Assign Responder</button>{alert.status==='Active'&&<button disabled={disabled} onClick={()=>void save('acknowledge')}>Acknowledge</button>}</div></>}
   {alert.acknowledgedAt&&<p>Acknowledged: {displayAlertTime(alert.acknowledgedAt)}</p>}{alert.resolvedAt&&<p>Resolved: {displayAlertTime(alert.resolvedAt)}</p>}{alert.cancelledAt&&<p>Cancelled: {displayAlertTime(alert.cancelledAt)}<br/>{alert.cancellationReason}</p>}
  </Panel>
  <Panel title="Incident Documentation"><form onSubmit={e=>{e.preventDefault();void save('report',{actions,notes,outcome})}}>
   <label>Actions taken<textarea required maxLength={4000} value={actions} onChange={e=>setActions(e.target.value)} disabled={disabled}/></label>
   <label>Outcome<select value={outcome} onChange={e=>setOutcome(e.target.value as 'pending'|'resolved')} disabled={disabled}><option value="pending">Pending follow-up</option><option value="resolved">Resolved</option></select></label>
   <label>Internal notes<textarea maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} disabled={disabled}/></label>
   <p className="pp-muted">A resolved outcome closes this alert. Assign an active responder first. Internal documentation is visible to authorised staff.</p>
   {alert.report&&<p style={{overflowWrap:'anywhere'}}>Incident ID: {alert.report.incident_id}</p>}
   {!closed&&<button type="submit" disabled={disabled||!actions.trim()}>{busy?'Saving…':'Save Report'}</button>}
  </form></Panel>
 </div><Panel title="Incident Location" actions={<Badge value={alert.status}/>}><AlertLocationMap key={`${alert.id}:${alert.coordinates?.join(',')??'none'}`} alert={alert}/><p className="pp-muted">Source: {alert.source} · Current unit is not a snapshot of the unit at the time of the alert.</p></Panel></div>
}

export default function AlertsPage({active=true,quick}:{active?:boolean;quick?:QuickAction}){
 const {alerts,alertsLoading,alertsError,alertsUpdatedAt,refreshAlerts,search}=usePortal()
 const [selectedId,setSelectedId]=useState(''),[filter,setFilter]=useState('All statuses'),[reset,setReset]=useState(0)
 const [options,setOptions]=useState<AlertOptions|null>(null),[optionsError,setOptionsError]=useState('')
 const [create,setCreate]=useState<string|null>(null),[property,setProperty]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [cancelTarget,setCancelTarget]=useState<LiveAlert|null>(null)
 const [cancelReason,setCancelReason]=useState(''),[cancelError,setCancelError]=useState(''),[cancelNotice,setCancelNotice]=useState('')
 const [cancelBusy,setCancelBusy]=useState(false),cancelLock=useRef(false)
 const currentCancel=alerts.find(a=>a.id===cancelTarget?.id)
 const cancelChanged=!!cancelTarget&&(!currentCancel||currentCancel.revision!==cancelTarget.revision||!['Active','Pending'].includes(currentCancel.status))
 async function confirmCancellation(event:FormEvent<HTMLFormElement>){
  event.preventDefault()
  if(cancelLock.current||!cancelTarget||alertsLoading||alertsError||cancelChanged)return
  const reason=cancelReason.trim()
  if(!reason){setCancelError('Enter a cancellation reason.');return}
  cancelLock.current=true;setCancelBusy(true);setCancelError('');setCancelNotice('')
  try{
   await updateAlert(cancelTarget.id,{revision:cancelTarget.revision,action:'cancel',reason})
   setCancelNotice(`Alert for ${cancelTarget.name} cancelled. The record and cancellation reason remain in history.`)
   setCancelTarget(null);setCancelReason('')
  }catch(e){setCancelError(e instanceof Error?e.message:'Could not cancel the alert. Check its refreshed status before retrying.')}
  finally{await refreshAlerts();cancelLock.current=false;setCancelBusy(false)}
 }
 useEffect(()=>{const controller=new AbortController();readAlertOptions(controller.signal).then(data=>{if(!controller.signal.aborted){setOptions(data);setOptionsError('')}}).catch(e=>{if(!controller.signal.aborted){setOptions(null);setOptionsError(e instanceof Error?e.message:'Could not load staff/residents.')}});return()=>controller.abort()},[alertsUpdatedAt])
 useQuickAction(quick, active, q => {
  if (q.action !== 'Send Alert') return true
  if (!options || busy || alertsLoading) return false
  const target = q.property || options.properties[0]?.id || ''
  if (!options.properties.some(p => p.id === target)) { setOptionsError('Selected property is unavailable.'); return true }
  setProperty(target); setError(''); setCreate(crypto.randomUUID()); return true
 })
 const visible=alerts.filter(a=>includesSearch(search,a.id,a.name,a.unit,a.type,a.propertyName)&&(filter==='All statuses'||a.status===filter))
 const selected=visible.find(a=>a.id===selectedId)??visible[0]
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!create)return;const fields=new FormData(event.currentTarget);setBusy(true);setError('')
  const lat=String(fields.get('latitude')||'').trim(),lon=String(fields.get('longitude')||'').trim()
  try{const saved=await createAlert({request_id:create,property_id:property,elderly_id:fields.get('resident'),alert_type:fields.get('type'),latitude:lat?Number(lat):null,longitude:lon?Number(lon):null});setCreate(null);setSelectedId(saved.id);setFilter('All statuses');await refreshAlerts()}
  catch(e){setError(e instanceof Error?e.message:'Could not record alert.')}
  finally{setBusy(false)}
 }
 return <div className="pp-main"><Panel title="Emergency Alerts" className="pp-critical" actions={<>
  <select aria-label="Filter alert status" value={filter} onChange={e=>setFilter(e.target.value)}>{['All statuses','Active','Pending','Resolved','Cancelled'].map(s=><option key={s}>{s}</option>)}</select>
  <button onClick={()=>void refreshAlerts()} disabled={alertsLoading}>{alertsLoading?'Loading…':'Refresh alerts'}</button>
  <button disabled={!options?.properties.length||alertsLoading} onClick={()=>{setCreate(crypto.randomUUID());setProperty(options?.properties[0]?.id??'');setError('')}}>Record Alert</button>
 </>}>
  <Notice>{cancelNotice}</Notice>
  {optionsError&&<p role="alert">Assignment options unavailable: {optionsError}</p>}
  {alertsError?<div role="alert"><strong>Could not load alerts</strong><p>{alertsError}</p></div>:<>
   {alertsLoading&&<Notice>Updating alerts…</Notice>}
   <Table label="Emergency alert list"><thead><tr>{['Alert ID','Resident','Current unit','Type','Time (MYT)','Status','Action'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(a=><tr key={a.id} className={a.id===selected?.id?'pp-selected':''}><th scope="row" title={a.id}>{a.id.slice(0,8)}</th><td>{a.name}</td><td>{a.unit}</td><td>{a.type}</td><td>{displayAlertTime(a.time)}</td><td><Badge value={a.status}/></td><td><div className="pp-actions"><button aria-pressed={a.id===selected?.id} onClick={()=>setSelectedId(a.id)}>Review</button><button className="cc-alert-cancel" disabled={alertsLoading||cancelBusy||busy||!['Active','Pending'].includes(a.status)} aria-label={`Cancel alert for ${a.name}`} onClick={()=>{setCancelTarget({...a});setCancelReason('');setCancelError('');setCancelNotice('')}}>Cancel</button></div></td></tr>)}{!visible.length&&!alertsLoading&&<tr><td colSpan={7}>No accessible alerts match this view.</td></tr>}</tbody></Table>
   {alertsUpdatedAt&&<p className="pp-muted">Last updated: {displayAlertTime(alertsUpdatedAt)}</p>}
  </>}
 </Panel>
 {selected&&!alertsError&&<AlertEditor key={`${selected.id}:${reset}`} alert={selected} options={options} blocked={alertsLoading||!!cancelTarget||cancelBusy} refresh={refreshAlerts} onReload={()=>setReset(v=>v+1)}/>}
 {cancelTarget&&<Modal title="Cancel alert" blockClose={cancelBusy} onClose={()=>{if(!cancelLock.current)setCancelTarget(null)}}>
  <form onSubmit={confirmCancellation}>
   <p><strong>{cancelTarget.name}</strong> · {cancelTarget.type}</p>
   <p>{displayAlertTime(cancelTarget.time)}</p><p style={{overflowWrap:'anywhere'}}>Alert ID: {cancelTarget.id}</p>
   <label>Cancellation reason<textarea autoFocus required maxLength={1000} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} disabled={cancelBusy} placeholder="Explain why this alert should be cancelled…"/></label>
   <p>This cancels the alert without deleting it. Use this for an incorrect or duplicate alert; completed assistance should be recorded as resolved.</p>
   {cancelChanged&&<p role="alert">This alert has changed. Close this dialog, review the latest status and reopen Cancel if appropriate.</p>}
   {alertsError&&<p role="alert">Could not verify the latest alert: {alertsError}</p>}
   {cancelError&&<p role="alert">{cancelError}</p>}
   <div className="sd-dialog-actions"><button type="button" disabled={cancelBusy} onClick={()=>setCancelTarget(null)}>Keep alert</button><button className="cc-alert-cancel" disabled={cancelBusy||alertsLoading||!!alertsError||cancelChanged||!cancelReason.trim()}>{cancelBusy?'Cancelling…':'Confirm cancellation'}</button></div>
  </form>
 </Modal>}
 {create&&<Modal blockClose={busy} title="Record a manual alert" onClose={()=>{if(!busy)setCreate(null)}}><form onSubmit={submit}>
  <label>Property<select value={property} onChange={e=>setProperty(e.target.value)} disabled={busy}>{options?.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label>Resident<select key={property} name="resident" required defaultValue="" disabled={busy}><option value="">Select resident…</option>{options?.residents.filter(r=>r.property_id===property).map(r=><option key={r.id} value={r.id}>{r.name} · {r.unit}</option>)}</select></label>
  <label>Type<select name="type" disabled={busy}>{[['sos','SOS'],['fall','Fall'],['geofence','Geofence'],['missed_check_in','Missed Check-in'],['other','Other']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
  <label>Recorded latitude (optional)<input name="latitude" type="number" step="any" min={-90} max={90} disabled={busy}/></label><label>Recorded longitude (optional)<input name="longitude" type="number" step="any" min={-180} max={180} disabled={busy}/></label>
  <p>Provide both coordinates only if known. This is a manual record; event time is the server's current time.</p>
  {error&&<p role="alert">{error}</p>}<div className="sd-dialog-actions"><button type="button" disabled={busy} onClick={()=>setCreate(null)}>Cancel</button><button disabled={busy}>{busy?'Saving…':'Record Alert'}</button></div>
 </form></Modal>}
 </div>
}

