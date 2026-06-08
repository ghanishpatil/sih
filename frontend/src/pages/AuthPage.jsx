import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase/client.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { roleHome } from '@/utils/roles.js'
import { APP } from '@/utils/constants.js'

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
}

export function AuthPage() {
  usePageSeo({ title: 'Sign in', description: 'Register or sign in to the hackathon platform.' })
  const { login, register, loginGoogle, user, profile, firebaseReady, loading } = useAuth()
  const [mode, setMode] = useState('login') // login | register | forgot
  const [direction, setDirection] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  useEffect(() => {
    if (loading || !user || !profile || !firebaseReady) return
    navigate(from || roleHome(profile.role), { replace: true })
  }, [loading, user, profile, firebaseReady, from, navigate])

  const switchMode = useCallback((newMode) => {
    const order = { login: 0, register: 1, forgot: 2 }
    setDirection(order[newMode] > order[mode] ? 1 : -1)
    setMode(newMode)
    setErr('')
    setSuccess('')
  }, [mode])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    setSuccess('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else if (mode === 'register') {
        if (!name.trim()) { setErr('Display name is required.'); setBusy(false); return }
        if (password.length < 6) { setErr('Password must be at least 6 characters.'); setBusy(false); return }
        await register(email, password, name)
        // Show verification notice — the redirect will happen via useEffect once profile is set
        setSuccess('Account created! Check your email to verify your address.')
      } else if (mode === 'forgot') {
        if (!auth) throw new Error('Firebase not configured.')
        await sendPasswordResetEmail(auth, email)
        setSuccess('Password reset email sent! Check your inbox.')
      }
    } catch (er) {
      setErr(er.message || 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle() {
    setErr('')
    setBusy(true)
    try {
      await loginGoogle()
    } catch (er) {
      setErr(er.message || 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[rgb(var(--border))] shadow-lift lg:grid-cols-5"
      >
        {/* ─── Branding Panel ─── */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50 p-10 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-30" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-300/30 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-300/25 blur-[60px]" />

          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 text-white shadow-lg shadow-brand-500/30"
            >
              <Sparkles className="h-6 w-6" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 font-display text-2xl font-bold text-ink-900"
            >
              {APP.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-3 text-sm leading-relaxed text-ink-700"
            >
              Register your team for the 2026 edition.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } } }}
            className="relative mt-auto space-y-3 pt-10"
          >
            {['Team management & invites', 'Structured submissions', 'Real-time jury evaluation', 'Email notifications'].map((f) => (
              <motion.div
                key={f}
                variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-center gap-2.5 text-sm text-ink-700"
              >
                <ArrowRight className="h-3.5 w-3.5 text-brand-600" />
                {f}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ─── Form Panel ─── */}
        <div className="relative overflow-hidden bg-[rgb(var(--surface))] p-6 sm:p-8 lg:col-span-3 lg:p-10">
          {/* Tab Switcher (only login/register) */}
          {mode !== 'forgot' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex rounded-xl border border-[rgb(var(--border))] p-1"
            >
              {[
                { key: 'login', label: 'Sign In' },
                { key: 'register', label: 'Register' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={[
                    'relative flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300',
                    mode === tab.key
                      ? 'text-white'
                      : 'text-ink-500 hover:text-ink-700',
                  ].join(' ')}
                  onClick={() => switchMode(tab.key)}
                >
                  {mode === tab.key && (
                    <motion.span
                      layoutId="auth-tab-bg"
                      className="absolute inset-0 rounded-lg bg-brand-500 shadow-md shadow-brand-500/25"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Animated Form Content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={mode}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6"
            >
              {mode === 'forgot' ? (
                <ForgotPasswordForm
                  email={email}
                  setEmail={setEmail}
                  onSubmit={onSubmit}
                  busy={busy}
                  err={err}
                  success={success}
                  firebaseReady={firebaseReady}
                  onBack={() => switchMode('login')}
                />
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-6">
                    <h1 className="font-display text-2xl font-bold text-ink-900">
                      {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="mt-1.5 text-sm text-ink-500">
                      {mode === 'login'
                        ? 'Sign in to access your dashboard.'
                        : 'Use your institutional email where possible.'}
                    </p>
                  </div>

                  {!firebaseReady && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950">
                      Firebase not configured. Check environment variables.
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={onSubmit} className="space-y-4">
                    {mode === 'register' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Input
                          label="Display name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          name="displayName"
                          placeholder="Your full name"
                          autoComplete="name"
                        />
                      </motion.div>
                    )}

                    <Input
                      label="Email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="you@university.edu"
                    />

                    <div className="relative">
                      <Input
                        label="Password"
                        type={showPw ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder="••••••••"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-[2.1rem] rounded-md p-1 text-ink-400 transition-colors hover:text-ink-600"
                        onClick={() => setShowPw((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Forgot password link (only in login mode) */}
                    {mode === 'login' && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-500"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Error */}
                    <AnimatePresence>
                      {err && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700"
                        >
                          {err}
                        </motion.p>
                      )}
                      {success && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700"
                        >
                          {success}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <Button
                      type="submit"
                      className="w-full"
                      loading={busy}
                      disabled={!firebaseReady}
                    >
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </Button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[rgb(var(--border))]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[rgb(var(--surface))] px-3 text-ink-400">Or continue with</span>
                    </div>
                  </div>

                  {/* Google Button */}
                  <motion.button
                    type="button"
                    disabled={busy || !firebaseReady}
                    onClick={onGoogle}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm font-semibold text-ink-800 shadow-sm transition-all hover:border-brand-500/30 hover:shadow-md disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </motion.button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back to home */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-sm text-ink-500"
          >
            <Link
              className="font-medium text-brand-600 transition-colors hover:text-brand-500"
              to="/"
            >
              ← Back to home
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}

/** Forgot Password sub-form */
function ForgotPasswordForm({ email, setEmail, onSubmit, busy, err, success, firebaseReady, onBack }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500"
      >
        ← Back to sign in
      </button>

      <h1 className="font-display text-2xl font-bold text-ink-900">
        Reset your password
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@university.edu"
        />

        <AnimatePresence>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700"
            >
              {err}
            </motion.p>
          )}
          {success && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700"
            >
              {success}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full" loading={busy} disabled={!firebaseReady}>
          Send reset link
        </Button>
      </form>
    </div>
  )
}
