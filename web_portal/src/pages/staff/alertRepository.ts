import { api } from '../../lib/backendApi'
import type { LiveAlert } from './alertData'
export type AlertOptions={properties:{id:string;name:string}[];residents:{id:string;name:string;unit:string;property_id:string}[];staff:{id:string;name:string;property_id:string}[]}
export const readAlerts=(signal:AbortSignal)=>api<LiveAlert[]>('/alerts',{signal})
export const readAlertOptions=(signal:AbortSignal)=>api<AlertOptions>('/alerts/options',{signal})
export const createAlert=(body:unknown)=>api<{id:string}>('/alerts',{method:'POST',body:JSON.stringify(body)})
export const updateAlert=(id:string,body:unknown)=>api<{id:string;revision:number;incident_id:string|null}>(`/alerts/${id}`,{method:'PATCH',body:JSON.stringify(body)})
