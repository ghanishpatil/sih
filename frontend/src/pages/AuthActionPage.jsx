/**
 * Firebase Auth Action Handler — /auth/action
 *
 * Handles email verification links sent by Firebase.
 * Firebase appends ?mode=verifyEmail&oobCode=...&apiKey=...&lang=en to this URL.
 *
 * This page:
 * 1. Reads the mode + oobCode from the URL
 * 2. Calls the appropriate Firebase Auth action
 * 3. Shows success/error and redirects
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, Lock } from 'lucide-react'
import { auth } from '@/firebase/client.js'
import { Button } from '@/components/ui/Button.jsx'
import { BrandLogo } from '@/components/ui/BrandLogo.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

export function AuthActionPage() {
  usePageSeo({ title: 'Email Verification', description: 'Verify your email address.' })
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const mode = params.get('mode')
  const oobCode = params.get('oobCode')

  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  // Password reset state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  useEffect(() => {
    if (!oobCode || !auth) {
      setStatus('error')
      setMessage('Invalid or missing verification link. Please request a new one.')
      return
    }

    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success')
          setMessage('Your email has been verified successfully! You can now use all platform features.')
          // Reload the user so emailVerified updates
          auth.currentUser?.reload().catch(() => {})
        })
        .catch((e) => {
          setStatus('error')
          if (e.code === 'auth/invalid-action-code') {
            setMessage('This verification link has already been used or has expired. Please request a new one from your dashboard.')
          } else {
            setMessage('Verification failed. The link may be expired or invalid.')
          }
        })
    } else if (mode === 'resetPassword') {
      // First verify the code to get the email
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setResetEmail(email)
          setStatus('reset-form')
        })
        .catch(() => {
          setStatus('error')
          setMessage('This password reset link has expired or already been used. Please request a new one.')
        })
    } else {
      setStatus('error')
      setMessage('Unknown action. Please use the link from your email.')
    }
  }, [mode, oobCode])

  async function handlePasswordReset(e) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }
    setResetting(true)
    setMessage('')
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      setStatus('success')
      setMessage('Your password has been reset successfully. You can now sign in with your new password.')
    } catch (e) {
      setMessage(e.code === 'auth/weak-password'
        ? 'Password is too weak. Use at least 6 characters.'
        : 'Failed to reset password. The link may have expired.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-8 shadow-lg"
      >
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo className="h-9 shrink-0" />
          <div>
            <p className="font-display text-sm font-bold text-ink-900">{APP.shortName}</p>
            <p className="text-[10px] text-ink-500">{APP.university}</p>
          </div>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            <p className="text-sm text-ink-600">Processing your request…</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-ink-900">
                {mode === 'verifyEmail' ? 'Email Verified!' : 'Password Reset!'}
              </h1>
              <p className="mt-2 text-sm text-ink-600">{message}</p>
            </div>
            <Button
              className="mt-2 w-full"
              onClick={() => navigate(mode === 'verifyEmail' ? '/dashboard' : '/auth')}
            >
              {mode === 'verifyEmail' ? 'Go to Dashboard' : 'Sign In'}
            </Button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-ink-900">Action Failed</h1>
              <p className="mt-2 text-sm text-ink-600">{message}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/auth')}>
                Back to Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Password Reset Form */}
        {status === 'reset-form' && (
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
                <Lock className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-ink-900">Reset Password</h1>
                <p className="text-xs text-ink-500">{resetEmail}</p>
              </div>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <Input
                label="New password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
              {message && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
              )}
              <Button type="submit" className="w-full" loading={resetting}>
                Set New Password
              </Button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  )
}
