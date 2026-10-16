import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Modal, Panel } from './AdminUI'
import { defaultPreferences } from './useAdminPreferences'
import type { Preferences, SavedPreferences } from './useAdminPreferences'
type Props={saved:SavedPreferences|null;loading:boolean;loadError:string;onSave:(value:Preferences)=>Promise<SavedPreferences>;onReload:()=>void;onBack:()=>void;onEditingChange:(dirty:boolean,busy:boolean)=>void}
export default function AdminPreferencesPage({saved,loading,loadError,onSave,onReload,onBack,onEditingChange}:Props){
 const [draft,setDraft]=useState<Preferences>(saved?.value||defaultPreferences),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState(false)
 const lock=useRef(false),alive=useRef(true)
 const dirty=!!saved&&JSON.stringify(draft)!==JSON.stringify(saved.value)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{if(saved)setDraft(saved.value)},[saved])
 useEffect(()=>{onEditingChange(dirty,busy);return()=>onEditingChange(false,false)},[dirty,busy,onEditingChange])
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 async function submit(e:FormEvent){e.preventDefault();if(lock.current||!saved)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await onSave(draft);if(alive.current)setNotice('Your preferences have been saved and applied.')}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not save settings.')}finally{lock.current=false;if(alive.current)setBusy(false)}}
 function reload(){setConfirm(false);setNotice('');setError('');onReload()}
 return <div className="ad-main ad-personal-settings"><div className="ad-heading"><div><h2>Personal Settings</h2><p className="ad-muted">Personalize your administrator workspace. These settings apply only to your account.</p></div><button disabled={busy} onClick={onBack}>← Back</button></div>
 {loading&&<p role="status">Loading saved preferences…</p>}{(error||loadError)&&<p className="ad-error" role="alert">{error||loadError}</p>}{notice&&<p className="ad-notice" role="status">{notice}</p>}
 <Panel title="Display and Accessibility"><form onSubmit={submit}><fieldset disabled={busy||loading||!saved}><div className="ad-field-grid">
 <label>Text size<select value={draft.text_size} onChange={e=>{setDraft({...draft,text_size:e.target.value as Preferences['text_size']});setNotice('')}}><option value="standard">Standard</option><option value="large">Large</option></select><small>Increase text size across the Admin workspace.</small></label>
 <label>Table density<select value={draft.density} onChange={e=>{setDraft({...draft,density:e.target.value as Preferences['density']});setNotice('')}}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><small>Adjust spacing in management tables.</small></label>
 </div><label className="ad-inline-check"><input type="checkbox" checked={draft.reduce_motion} onChange={e=>{setDraft({...draft,reduce_motion:e.target.checked});setNotice('')}}/>Reduce animations</label><p className="ad-muted">Turn off interface transitions and animations. Your device’s reduced-motion setting is also respected.</p>
 <div className="ad-actions"><button type="submit" className="ad-primary" disabled={!dirty}>{busy?'Saving…':'Save preferences'}</button><button type="button" disabled={!dirty} onClick={()=>{setDraft(saved!.value);setError('');setNotice('')}}>Cancel changes</button><button type="button" onClick={()=>{setDraft({...defaultPreferences});setNotice('Default preferences loaded. Save to apply.')}}>Restore defaults</button></div></fieldset></form></Panel>
 <div className="ad-actions"><span className="ad-muted">{dirty?'You have unsaved changes.':saved?'Saved preferences are applied to this workspace.':''}</span><button disabled={busy||loading} onClick={()=>dirty?setConfirm(true):reload()}>Reload saved settings</button></div>
 {confirm&&<Modal title="Discard unsaved preferences?" onClose={()=>setConfirm(false)}><p>Reloading will replace your edits with the saved settings.</p><div className="ad-actions"><button onClick={()=>setConfirm(false)}>Keep editing</button><button onClick={reload}>Discard and reload</button></div></Modal>}
 </div>
}
