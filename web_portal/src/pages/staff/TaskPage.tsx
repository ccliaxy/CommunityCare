import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import StaffIcon from './StaffIcon'
import { usePortal } from './PortalContext'
import { createTask, readTasks, taskStatus, updateTask } from './taskRepository'
import type { Task, TaskData } from './taskRepository'
import './StaffDashboard.css'
import './TaskPage.css'

type Modal = { kind:'create'; requestId:string } | { kind:'assign'|'cancel'; id:string } | null
const label=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const shortId=(id:string)=>`TSK-${id.slice(0,8).toUpperCase()}`
export default function TaskPage({active=true}: {onLogout:()=>void;active?:boolean}) {
 const {search,setSearch}=usePortal()
 const [data,setData]=useState<TaskData|null>(null)
 const [filter,setFilter]=useState('all'),[property,setProperty]=useState(''),[day,setDay]=useState('')
 const [formProperty,setFormProperty]=useState('')
 const [selected,setSelected]=useState<Task|undefined>(undefined)
 const [modal,setModal]=useState<Modal>(null),[error,setError]=useState(''),[loadError,setLoadError]=useState(''),[notice,setNotice]=useState('')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
 const [now,setNow]=useState(Date.now())
 const dialog=useRef<HTMLDialogElement>(null),initialized=useRef(false),request=useRef(0),mounted=useRef(true)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
 useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close()},[modal])
 useEffect(()=>{
  if(!active)return
  const controller=new AbortController();let running=false
  async function load(){
   if(running)return;running=true;const id=++request.current
   try{
    const next=await readTasks(controller.signal)
    if(controller.signal.aborted||id!==request.current)return
    setData(next);setNow(Date.parse(next.server_time));setLoadError('')
    if(!initialized.current){setDay(new Date(next.server_time).toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'}));initialized.current=true}
   }catch(e){if(!controller.signal.aborted){setData(null);setLoadError(e instanceof Error?e.message:'Unable to load tasks.')}}
   finally{running=false;if(!controller.signal.aborted)setLoading(false)}
  }
  setLoading(true);void load()
  const timer=window.setInterval(()=>{if(!document.hidden)void load()},30000)
  const focus=()=>void load();window.addEventListener('focus',focus)
  return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',focus)}
 },[active,revision])
 const tasks=data?.tasks??[]
 const scoped=tasks.filter(t=>(!property||t.property_id===property)&&(!day||t.due_day===day||(t.due_day<day&&taskStatus(t,now)==='missed')))
 const missed=scoped.filter(t=>taskStatus(t,now)==='missed')
 const visible=scoped.filter(t=>(filter==='all'||taskStatus(t,now)===filter)&&[t.id,shortId(t.id),t.title,t.resident,t.unit,t.staff,t.property_name].join(' ').toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>a.due_at.localeCompare(b.due_at)||a.id.localeCompare(b.id))
 const blocked=busy||loading||!!loadError||!data
 function open(next:Modal){setError('');setSelected(next&&next.kind!=='create'?tasks.find(t=>t.id===next.id):undefined);setModal(next)}
 function openCreate(){setFormProperty(property||data?.properties[0]?.id||'');open({kind:'create',requestId:crypto.randomUUID()})}
 async function save(operation:()=>Promise<unknown>,message:string){
  if(blocked)return;setBusy(true);setError('')
  try{await operation();if(!mounted.current)return;setNotice(message);setModal(null);setRevision(v=>v+1);window.dispatchEvent(new Event('communitycare:tasks-changed'))}
  catch(e){if(mounted.current){setError(e instanceof Error?`${e.message}${modal && modal.kind !== 'create' ? ' Close this dialog and reopen the task to use its latest version.' : ''}`:'Task could not be saved.');setRevision(v=>v+1)}}
  finally{if(mounted.current)setBusy(false)}
 }
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const fields=new FormData(event.currentTarget)
  if(modal?.kind==='create'){
   const body={request_id:modal.requestId,property_id:formProperty,title:String(fields.get('title')||''),elderly_id:String(fields.get('resident')||'')||null,assigned_membership_id:String(fields.get('staff')||'')||null,due_local:String(fields.get('due')||''),shared_with_resident:fields.get('share')==='on'}
   void save(()=>createTask(body),'Task created.');return
  }
  if(selected&&modal?.kind==='assign')void save(()=>updateTask(selected,'assign',String(fields.get('staff')||'')),'Assignment saved. The deadline is unchanged.')
 }
 const formZone=data?.properties.find(p=>p.id===formProperty)
 return <div className="tk-app"><main className="tk-main" id="task-main" tabIndex={-1}>
  {notice&&<div className="sd-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice('')}>×</button></div>}
  {loadError&&<p className="sd-error" role="alert">{loadError} <button onClick={()=>setRevision(v=>v+1)}>Retry</button></p>}
  {error&&!modal&&<p className="sd-error" role="alert">{error}</p>}
  {data&&(missed.length>0?<section className="tk-warning" aria-label="Missed tasks"><StaffIcon name="incidents"/><div><h2>{missed.length} Missed Task{missed.length===1?'':'s'} Detected</h2><p>{missed.filter(t=>!t.acknowledged_at).length} awaiting acknowledgement. Acknowledging does not complete a task.</p></div><div className="tk-actions"><button onClick={()=>{setFilter('missed');setSearch('')}}>View missed tasks</button><button className="tk-danger" disabled={blocked} onClick={()=>open({kind:'assign',id:missed[0].id})}>Reassign</button></div></section>:<div className="tk-clear">No missed tasks in this view.</div>)}
  <section className="tk-panel"><div className="tk-toolbar"><div><h2>Daily Tasks</h2><p>{day?'Selected day and earlier missed tasks.':'All dates.'} Due times use each property's time zone.</p></div><div className="tk-actions">
   <select aria-label="Property" value={property} onChange={e=>setProperty(e.target.value)}><option value="">All properties</option>{data?.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
   <input type="date" aria-label="Task date" value={day} onChange={e=>setDay(e.target.value)}/><button onClick={()=>setDay('')}>All dates</button>
   <button className="sd-primary" disabled={blocked||!data?.properties.length} onClick={openCreate}><StaffIcon name="plus"/>Create Task</button>
   <select aria-label="Filter tasks by status" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','pending','in_progress','completed','missed','cancelled'].map(v=><option key={v} value={v}>{v==='all'?'All statuses':label(v)}</option>)}</select>
  </div></div>
  <div className="sd-table-wrap" role="region" aria-label="Daily task table" tabIndex={0}><table><thead><tr>{['Task ID / Description','Resident','Unit','Staff','Due Time','Status','Actions'].map(v=><th key={v} scope="col">{v}</th>)}</tr></thead><tbody>
   {visible.map(t=>{const status=taskStatus(t,now),closed=['completed','cancelled'].includes(status);return <tr key={t.id}><th scope="row" title={t.id}>#{shortId(t.id)}<small className="tk-description">{t.title}</small>{t.shared_with_resident&&<small className="tk-description">Shared with resident & family</small>}</th><td><strong>{t.resident||'Property task'}</strong></td><td>{t.unit||'—'}<small className="tk-description">{t.property_name}</small></td><td className={!t.staff?'tk-unassigned':''}>{t.staff||'Unassigned'}</td><td className={status==='missed'?'tk-unassigned':''}>{new Date(t.due_at).toLocaleString('en-MY',{timeZone:t.time_zone})}<small className="tk-description">{t.time_zone}</small></td><td><span className={`sd-badge sd-${status==='in_progress'?'pending':status}`}>{label(status)}</span>{t.acknowledged_at&&<small className="tk-description">Acknowledged</small>}</td><td><div className="tk-row-actions">{!closed?<>
    <button disabled={blocked} onClick={()=>open({kind:'assign',id:t.id})}>{t.staff?'Reassign':'Assign Staff'}</button>
    {status==='missed'&&!t.acknowledged_at&&<button disabled={blocked} onClick={()=>void save(()=>updateTask(t,'acknowledge'),'Acknowledgement saved.')}>Acknowledge</button>}
    <button disabled={blocked||!t.assigned_membership_id} title={!t.assigned_membership_id?'Assign staff before completing':undefined} onClick={()=>void save(()=>updateTask(t,'complete'),'Task marked completed.')}>Complete</button>
    <button disabled={blocked} onClick={()=>open({kind:'cancel',id:t.id})}>Cancel</button>
   </>:<span className="sd-muted">{status==='completed'?'Done':'Cancelled'}</span>}</div></td></tr>})}
   {!visible.length&&<tr><td colSpan={7} className="sd-empty">{loading?'Loading tasks…':loadError?'Tasks unavailable.':'No tasks match this view.'}</td></tr>}
  </tbody></table></div><p className="tk-count">{visible.length} of {scoped.length} tasks in this view</p></section>
 </main><dialog ref={dialog} className="sd-dialog" aria-labelledby="task-dialog-heading" onCancel={e=>{if(busy)e.preventDefault();else setModal(null)}}><h2 id="task-dialog-heading">{modal?.kind==='create'?'Create Task':modal?.kind==='assign'?'Assign staff':'Cancel task'}</h2>
  {(modal?.kind==='create'||modal?.kind==='assign')&&<form key={modal.kind+(selected?.id||modal.kind)} onSubmit={submit}>
   {modal.kind==='create'?<>
    <label>Property<select required value={formProperty} onChange={e=>setFormProperty(e.target.value)} disabled={busy}>{data?.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Task description<input name="title" required maxLength={160} autoFocus disabled={busy}/></label>
    <label>Resident<select key={`resident-${formProperty}`} name="resident" defaultValue="" disabled={busy}><option value="">No resident · Property task</option>{data?.residents.filter(r=>r.property_id===formProperty).map(r=><option key={r.id} value={r.id}>{r.name} · {r.unit}</option>)}</select></label>
    <label>Due date and time<input key={`due-${formProperty}`} name="due" type="datetime-local" required defaultValue={`${formZone?.today??''}T11:00`} disabled={busy}/></label><p>Time zone: {formZone?.time_zone}. Past deadlines are immediately marked missed.</p>
    <label className="tk-share"><input type="checkbox" name="share" disabled={busy}/>Share this task description and progress with the selected resident and their linked family.</label>
   </>:<p>{selected?.title} — {selected?.resident||'Property task'}. Reassignment does not clear an overdue task.</p>}
   <label>Staff<select key={`staff-${modal.kind==='create'?formProperty:selected?.property_id}`} name="staff" required={modal.kind==='assign'} defaultValue={selected?.assigned_membership_id||''} disabled={busy}><option value="">{modal.kind==='create'?'Unassigned':'Select active staff…'}</option>{data?.staff.filter(s=>s.property_id===(modal.kind==='create'?formProperty:selected?.property_id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   {error&&<p className="sd-error" role="alert">{error}</p>}<div className="sd-dialog-actions"><button type="button" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button type="submit" className="sd-primary" disabled={blocked}>{busy?'Saving…':modal.kind==='create'?'Create task':'Save assignment'}</button></div>
  </form>}
  {modal?.kind==='cancel'&&<><p>Cancel “{selected?.title}”? Its record will remain in the task history.</p>{error&&<p className="sd-error" role="alert">{error}</p>}<div className="sd-dialog-actions"><button disabled={busy} onClick={()=>setModal(null)}>Keep task</button><button className="sd-primary" disabled={blocked||!selected} onClick={()=>selected&&void save(()=>updateTask(selected,'cancel'),'Task cancelled.')}>Confirm cancellation</button></div></>}
 </dialog></div>
}
