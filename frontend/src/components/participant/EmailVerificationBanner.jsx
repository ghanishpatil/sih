import { useState } from 'react'
import { MailCheck, X, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * Shows a dismissible banner when the user's email is not yet verified.
 * Google sign-in users are always considered verified.
 * The banner persists across sessions until the email is verified.
 */
export function EmailVerificationBanner() {
  const { user, emailVerified, resendVerification } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Don't show if: no user, already verified, or dismissed this session
  if (!user || emailVerified || dismissed) return null

  async function handleResend() {
    setSending(true)
    try {
      await resendVerification()
      setSent(true)
      setTimeout(() => setSent(false), 5000)
    } catch { /* ignore */ } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3">
      <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">Verify your email address</p>
        <p className="mt-0.5 text-xs text-amber-700">
          We sent a verification link to <strong>{user.email}</strong>.
          Check your inbox (and spam folder) and click the link to verify your account.
        </p>
        {sent && (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            ✓ Verification email resent successfully.
          </p>
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 disabled:opacity-50"
        >
          {sending ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          {sending ? 'Sending…' : 'Resend verification email'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-lg p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
