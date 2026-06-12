import { useCallback, useMemo, useRef } from 'react'
import { createApi } from '@/services/api.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { useEvent } from '@/context/EventContext.jsx'

/**
 * PERF: Stabilized API hook — only recreates the API object when the
 * user's UID or the eventId actually changes (not on token refresh).
 * Uses a ref to hold the latest user object so the getToken callback
 * always calls the current user without changing the memoized API object.
 */
export function useApi() {
  const { user } = useAuth()
  const { eventId } = useEvent()
  const userRef = useRef(user)
  userRef.current = user

  const getToken = useCallback(async () => {
    if (!userRef.current) return ''
    return userRef.current.getIdToken()
  }, [])

  const getEventId = useCallback(() => eventId, [eventId])

  // Only recreate when uid or eventId changes — NOT on every token refresh
  const uid = user?.uid || ''
  return useMemo(() => createApi(getToken, getEventId), [uid, eventId, getToken, getEventId])
}
