import { api } from '../../lib/backendApi'
import type { LiveAlert } from './alertData'
export function readAlerts(signal: AbortSignal): Promise<LiveAlert[]> { return api('/alerts', { signal }) }
