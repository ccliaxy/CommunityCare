import { useEffect, useRef } from 'react'
export type QuickAction = { id: string; action: string; property: string }
export function useQuickAction(request: QuickAction | undefined, active: boolean, apply: (request: QuickAction) => boolean) {
 const handled = useRef('')
 useEffect(() => {
  if (active && request && request.id !== handled.current && apply(request)) handled.current = request.id
 }, [request, active, apply])
}
