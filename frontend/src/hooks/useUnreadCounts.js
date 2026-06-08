import { useEffect, useState } from 'react'
import { useApi } from './useApi.js'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * Hook to track unread message counts for sidebar badges.
 * Polls every 30 seconds to keep badges reasonably fresh.
 */
export function useUnreadCounts() {
  const api = useApi()
  const { user, profile } = useAuth()
  const [mentorChatUnread, setMentorChatUnread] = useState(0)

  useEffect(() => {
    if (!user || !profile?.teamId) return

    let cancelled = false

    async function check() {
      try {
        const data = await api.mentorChatUnread()
        if (!cancelled) setMentorChatUnread(data.unread || 0)
      } catch {
        // ignore
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [user, profile?.teamId, api])

  return { mentorChatUnread }
}
