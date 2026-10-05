export type TaskStatus = 'Completed' | 'Pending' | 'Missed'
export type Task = { id: string; description: string; assignee: string; location: string; status: TaskStatus }
export const initialTasks: Task[] = [
  { id: 't1', description: 'Morning Medication Rounds', assignee: 'Nurse Joy', location: 'East Wing', status: 'Completed' },
  { id: 't2', description: 'Check HVAC Unit 4', assignee: 'Bob Builder', location: 'Roof Level', status: 'Pending' },
  { id: 't3', description: 'Replace Dining Hall Lights', assignee: 'Unassigned', location: 'Main Hall', status: 'Missed' },
]
export const residents = [
  { id: 'r1', initials: 'SL', name: 'Sarah Lee', unit: 'Unit 102', careLevel: 'Independent', status: 'Active' },
  { id: 'r2', initials: 'MJ', name: 'Michael Johnson', unit: 'Unit 205', careLevel: 'Assisted', status: 'Active' },
  { id: 'r3', initials: 'AP', name: 'Arthur Pendelton', unit: 'Unit 204', careLevel: 'High Care', status: 'Monitoring' },
]
export const initialAlerts = [
  { id: 'a1', title: 'Unit 204 – Medical Emergency', detail: 'Resident: Arthur Pendelton', time: '09:58 · Sample event', acknowledged: false },
  { id: 'a2', title: 'Unit 118 – Water Leak', detail: 'Maintenance Required', time: '09:45 · Sample event', acknowledged: false },
]
// These counts generate BOTH the chart and its legend; they are a sample week,
// not live incidents. Counts total 15, compared with 17 in the previous sample.
export const incidentCategories = ['Fall', 'Health Issue', 'Complaint', 'Other']
export const incidentColors = ['#ef5350', '#f08a00', '#ffc107', '#42a5f5']
export const incidentWeek = [
  { day: 'Mon', counts: [1, 1, 0, 0] },
  { day: 'Tue', counts: [2, 1, 0, 1] },
  { day: 'Wed', counts: [1, 1, 0, 0] },
  { day: 'Thu', counts: [1, 0, 1, 0] },
  { day: 'Fri', counts: [1, 1, 0, 0] },
  { day: 'Sat', counts: [1, 0, 1, 0] },
  { day: 'Sun', counts: [1, 0, 0, 0] },
]
export const categoryTotals = incidentCategories.map((_, index) => incidentWeek.reduce((sum, day) => sum + day.counts[index], 0))
export const weekTotal = categoryTotals.reduce((sum, count) => sum + count, 0)
