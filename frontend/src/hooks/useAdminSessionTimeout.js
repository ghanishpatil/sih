/**
 * Admin session inactivity timeout.
 * Tracks mouse/keyboard/touch activity. If no activity for TIMEOUT_MS,
 * shows a warning for WARN_BEFORE_MS, then auto-logs out.
 *
 * Only active for admin role.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLES } from '@/utils/roles.js'

const TIMEOUT_MS    = 30 * 60 * 1000  // 30 minutes inactivity → logout
const WARN_BEFORE_MS = 2 * 60 * 1000  // warn 2 minutes before logout

export function useAdminSessionTimeout() {
  const { profile, logout } = useAuth()
  const isAdmin = profile?.role === ROLES.ADMIN
  const timerRef = useRef(null)
  const warnTimerRef = useRef(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const countdownRef = useRef(null)

  const clearAll = useCallback(() => {
    clearTimeout(timerRef.current)
    clearTimeout(warnTimerRef.current)
    clearInterval(countdownRef.current)
    setShowWarning(false)
  }, [])

  const doLogout = useCallback(async () => {
    clearAll()
    await logout()
    // Redirect to auth page
    window.location.href = '/auth?reason=session_timeout'
  }, [logout, clearAll])

  const resetTimer = useCallback(() => {
    if (!isAdmin) return
    clearAll()

    // Set warning timer
    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(Math.floor(WARN_BEFORE_MS / 1000))
      // Countdown display
      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
    }, TIMEOUT_MS - WARN_BEFORE_MS)

    // Set logout timer
    timerRef.current = setTimeout(doLogout, TIMEOUT_MS)
  }, [isAdmin, clearAll, doLogout])

  // Track user activity
  useEffect(() => {
    if (!isAdmin) return
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    const handler = () => {
      if (showWarning) return // Don't reset if warning is showing — user must click "Stay logged in"
      resetTimer()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetTimer() // Start on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearAll()
    }
  }, [isAdmin, resetTimer, clearAll, showWarning])

  const stayLoggedIn = useCallback(() => {
    resetTimer()
    setShowWarning(false)
  }, [resetTimer])

  return { showWarning, secondsLeft, stayLoggedIn, doLogout }
}
