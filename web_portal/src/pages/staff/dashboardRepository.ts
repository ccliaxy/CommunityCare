import { api } from '../../lib/backendApi'
import type { DashboardData } from './dashboardData'
export function readDashboard(signal: AbortSignal): Promise<DashboardData> { return api('/dashboard', { signal }) }
