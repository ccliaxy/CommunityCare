import { useEffect, useState } from 'react'
import { api } from '../../lib/backendApi'
export type Preferences={text_size:'standard'|'large';density:'comfortable'|'compact';reduce_motion:boolean}
export type SavedPreferences={value:Preferences;revision:number}
export const defaultPreferences:Preferences={text_size:'standard',density:'comfortable',reduce_motion:false}
export function useAdminPreferences(){
 const [saved,setSaved]=useState<SavedPreferences|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0)
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');void api<SavedPreferences>('/admin/preferences',{signal:c.signal}).then(s=>{if(!c.signal.aborted)setSaved(s)}).catch(e=>{if(!c.signal.aborted){setSaved(null);setError(e.message)}}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[refresh])
 async function save(value:Preferences){if(!saved)throw Error('Reload your settings first.');const result=await api<SavedPreferences>('/admin/preferences',{method:'PUT',body:JSON.stringify({value,revision:saved.revision})});setSaved(result);return result}
 return {saved,error,loading,save,reload:()=>setRefresh(n=>n+1)}
}
