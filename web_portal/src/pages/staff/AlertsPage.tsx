import { useEffect, useState } from 'react'
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
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[cancel,setCancel]=useState(false),[reason,setReason]=useState('')
 const closed=['Resolved','Cancelled'].includes(alert.status),stale=version!==alert.revision,disabled=busy||blocked||closed||stale
 async function save(action:string,details:Record<string,unknown>={}){
  if(disabled)return;setBusy(true);setError('');setNotice('')
  try{const saved=await updateAlert(alert.id,{revision:version,action,...details});setVersion(saved.revision);setCancel(false);setNotice(action==='report'?'Report saved to the incident record.':'Alert updated.');await refresh()}
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
  {!closed&&<Panel title="Cancel incorrect alert">{!cancel?<button disabled={disabled} onClick={()=>setCancel(true)}>Cancel alert…</button>:<form onSubmit={e=>{e.preventDefault();void save('cancel',{reason})}}><label>Cancellation reason<textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} disabled={disabled}/></label><p>The alert will stay in the history.</p><div className="pp-actions"><button type="button" disabled={busy} onClick={()=>setCancel(false)}>Keep alert</button><button disabled={disabled||!reason.trim()}>Confirm cancellation</button></div></form>}</Panel>}
 </div><Panel title="Incident Location" actions={<Badge value={alert.status}/>}><AlertLocationMap key={`${alert.id}:${alert.coordinates?.join(',')??'none'}`} alert={alert}/><p className="pp-muted">Source: {alert.source} · Current unit is not a snapshot of the unit at the time of the alert.</p></Panel></div>
}

export default function AlertsPage(){
 const {alerts,alertsLoading,alertsError,alertsUpdatedAt,refreshAlerts,search}=usePortal()
 const [selectedId,setSelectedId]=useState(''),[filter,setFilter]=useState('All statuses'),[reset,setReset]=useState(0)
 const [options,setOptions]=useState<AlertOptions|null>(null),[optionsError,setOptionsError]=useState('')
 const [create,setCreate]=useState<string|null>(null),[property,setProperty]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{const controller=new AbortController();readAlertOptions(controller.signal).then(data=>{if(!controller.signal.aborted){setOptions(data);setOptionsError('')}}).catch(e=>{if(!controller.signal.aborted){setOptions(null);setOptionsError(e instanceof Error?e.message:'Could not load staff/residents.')}});return()=>controller.abort()},[alertsUpdatedAt])
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
  {optionsError&&<p role="alert">Assignment options unavailable: {optionsError}</p>}
  {alertsError?<div role="alert"><strong>Could not load alerts</strong><p>{alertsError}</p></div>:<>
   {alertsLoading&&<Notice>Updating alerts…</Notice>}
   <Table label="Emergency alert list"><thead><tr>{['Alert ID','Resident','Current unit','Type','Time (MYT)','Status','Action'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(a=><tr key={a.id} className={a.id===selected?.id?'pp-selected':''}><th scope="row" title={a.id}>{a.id.slice(0,8)}</th><td>{a.name}</td><td>{a.unit}</td><td>{a.type}</td><td>{displayAlertTime(a.time)}</td><td><Badge value={a.status}/></td><td><button aria-pressed={a.id===selected?.id} onClick={()=>setSelectedId(a.id)}>Review</button></td></tr>)}{!visible.length&&!alertsLoading&&<tr><td colSpan={7}>No accessible alerts match this view.</td></tr>}</tbody></Table>
   {alertsUpdatedAt&&<p className="pp-muted">Last updated: {displayAlertTime(alertsUpdatedAt)}</p>}
  </>}
 </Panel>
 {selected&&!alertsError&&<AlertEditor key={`${selected.id}:${reset}`} alert={selected} options={options} blocked={alertsLoading} refresh={refreshAlerts} onReload={()=>setReset(v=>v+1)}/>}
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
