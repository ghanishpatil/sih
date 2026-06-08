import { useEffect, useState } from 'react'
import { useEvent } from '@/context/EventContext.jsx'
import { publicApi } from '@/services/api.js'

/** Prefer EventContext; fall back to public config when context is empty (single-hackathon installs). */
export function useResolvedEventId() {
  const { eventId: ctxId, eventLoading } = useEvent()
  const [fallbackId, setFallbackId] = useState('')

  useEffect(() => {
    if (ctxId) {
      setFallbackId('')
      return
    }
    if (eventLoading) return
    let cancelled = false
    publicApi
      .getEventConfig()
      .then((c) => {
        if (!cancelled && c?.eventId) setFallbackId(String(c.eventId))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ctxId, eventLoading])

  const eventId = ctxId || fallbackId
  return { eventId, loading: Boolean(eventLoading && !ctxId && !fallbackId) }
}
