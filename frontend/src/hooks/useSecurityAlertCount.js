/**
 * Fetches the count of open security incidents + unacknowledged honeypot hits.
 * Used to show a badge on the Security nav item in the admin sidebar.
 * Polls every 60 seconds.
 */
import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLES } from '@/utils/roles.js'

export function useSecurityAlertCount() {
  const api = useApi()
  const { profile } = useAuth()
  const [count, setCount] = useState(0)

  const loadCount = useCallback(async () => {
    if (profile?.role !== ROLES.ADMIN) return
    try {
      const [incidents, events] = await Promise.all([
        api.listSecurityIncidents().catch(() => []),
        api.listSecurityEvents(100).catch(() => []),
      ])
      const openIncidents = (Array.isArray(incidents) ? incidents : [])
        .filter(i => i.status === 'OPEN').length
      const honeypotHits = (Array.isArray(events) ? events : [])
        .filter(e => e.eventType === 'honeypot_triggered').length
      setCount(openIncidents + (honeypotHits > 0 ? 1 : 0))
    } catch {
      // silently fail — badge is non-critical
    }
  }, [api, profile?.role])

  useEffect(() => {
    void loadCount()
    const id = setInterval(loadCount, 60_000)
    return () => clearInterval(id)
  }, [loadCount])

  return count
}
