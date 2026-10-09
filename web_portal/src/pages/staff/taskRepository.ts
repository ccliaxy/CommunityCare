import { api } from '../../lib/backendApi'
export type Task = { id:string; property_id:string; elderly_id:string|null; title:string; resident:string|null; unit:string|null; staff:string|null; assigned_membership_id:string|null; due_at:string; due_day:string; time_zone:string; property_name:string; status:string; effective_status:string; revision:number; acknowledged_at:string|null; completed_at:string|null; shared_with_resident:boolean }
export type TaskData = { tasks:Task[]; server_time:string; properties:{id:string;name:string;time_zone:string;today:string}[]; residents:{id:string;name:string;unit:string;property_id:string}[]; staff:{id:string;staff_id:string;name:string;property_id:string}[] }
export const readTasks=(signal:AbortSignal)=>api<TaskData>('/tasks',{signal})
export const createTask=(body:unknown)=>api('/tasks',{method:'POST',body:JSON.stringify(body)})
export const updateTask=(task:Task,action:string,assigned_membership_id?:string)=>api(`/tasks/${task.id}`,{method:'PATCH',body:JSON.stringify({revision:task.revision,action,assigned_membership_id})})
export const taskStatus=(task:Task,now:number)=>['pending','in_progress'].includes(task.status)&&Date.parse(task.due_at)<now?'missed':task.status
