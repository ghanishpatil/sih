import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileUp,
  Megaphone,
  MessageCircle,
  Sparkles,
  Target,
  Users,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/utils/format.js'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useParticipantWorkspace } from '@/hooks/useParticipantWorkspace.js'
import { useAnnouncements } from '@/hooks/useAnnouncements.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { ProgressBar } from '@/components/ui/ProgressBar.jsx'
import { PhaseProgressTimeline } from '@/components/participant/PhaseProgressTimeline.jsx'
import { buildParticipantSteps, submissionCompleteness } from '@/pages/dashboard/participant/progressUtils.js'

export function ParticipantHomePage() {
  usePageSeo({ title: 'Home', description: 'Your hackathon workspace.' })

  const {
    user,
    team,
    submission,
    eventCfg,
    selectedProblem,
    loading,
    error,
    eventId,
    paymentLabel,
    reload,
  } = useParticipantWorkspace()

  const { items: announcements, loading: annLoading } = useAnnouncements(4, {
    eventId,
    participantFeed: true,
  })

  const feeRequired = Boolean(eventCfg?.entryFeeEnabled && (eventCfg?.entryFeeAmount ?? 0) > 0)
  const paySt = team?.paymentStatus || ''
  const feeResolved =
    !feeRequired || paySt === 'paid' || paySt === 'waived' || paySt === 'not_required'

  const { steps, completed } = buildParticipantSteps({
    eventCfg,
    team,
    submission,
    feeResolved,
    problemChosen: Boolean(team?.problemStatementId),
  })

  const subProgress = submissionCompleteness(submission)
  const progressPct = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0

  const regComplete = team && feeResolved && team.eventRegistered
  const regPending =
    team && feeRequired && paySt === 'pending' &&
    (team.registrationStatus === 'pending' || team.registrationRequestedAt)

  // Determine next action for the user
  const nextAction = !team
    ? { label: 'Create or Join a Team', to: '/dashboard/team', icon: Users }
    : !team.eventRegistered && !regPending
      ? { label: 'Register for Event', to: '/dashboard/registration', icon: CreditCard }
      : regPending
        ? { label: 'Complete Payment', to: '/dashboard/registration', icon: CreditCard }
        : !team.problemStatementId
          ? { label: 'Select Problem Statement', to: '/dashboard/problems', icon: Target }
          : !team.submissionLocked
            ? { label: 'Upload Submission', to: '/dashboard/submission', icon: FileUp }
            : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            {user?.displayName ? `Hey, ${user.displayName.split(' ')[0]}` : 'Welcome back'}
          </h1>
        </div>
        {nextAction && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="rounded-lg p-2 text-ink-400 hover:bg-[rgb(var(--surface-muted))] hover:text-ink-700"
              title="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link to={nextAction.to}>
            <Button size="sm" className="gap-2">
              <nextAction.icon className="h-4 w-4" />
              {nextAction.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          </div>
        )}
      </motion.div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Overall Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/5 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900">Event Progress</h2>
              <p className="mt-0.5 text-sm text-ink-500">{completed}/{steps.length} steps complete</p>
            </div>
            <Badge tone={progressPct === 100 ? 'success' : 'brand'} className="shrink-0">
              {progressPct}% done
            </Badge>
          </div>
          <div className="mt-4">
            <ProgressBar value={progressPct} max={100} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  step.done
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'bg-[rgb(var(--surface-muted))] text-ink-500'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[9px]">{i + 1}</span>
                )}
                <span className="font-medium">{step.title}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Phase Progression Timeline */}
      {eventCfg?.competitionPhases?.length > 0 && (
        <PhaseProgressTimeline phases={eventCfg.competitionPhases} team={team} />
      )}

      {/* Main Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Team Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card hover className="h-full">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                <Users className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-ink-900">My Team</h3>
            </div>
            {loading ? <Skeleton className="mt-4 h-16 w-full" /> : team ? (
              <div className="mt-4">
                <p className="text-base font-semibold text-ink-900">{team.name}</p>
                <p className="mt-1 text-xs text-ink-500">{(team.memberIds || []).length} member(s) · Code: {team.inviteCode}</p>
                <Link to="/dashboard/team" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-ink-500">No team yet</p>
                <Link to="/dashboard/team" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                  Create or join <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Registration Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card hover className="h-full">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-ink-900">Registration</h3>
            </div>
            {loading ? <Skeleton className="mt-4 h-16 w-full" /> : (
              <div className="mt-4">
                <Badge tone={regComplete ? 'success' : regPending ? 'warn' : 'neutral'}>
                  {regComplete ? 'Registered ✓' : regPending ? 'Payment Pending' : team ? 'Not registered' : 'Need team first'}
                </Badge>
                {paymentLabel && <p className="mt-2 text-xs text-ink-500">Fee: {paymentLabel}</p>}
                <Link to="/dashboard/registration" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  {regComplete ? 'View details' : 'Complete registration'} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Problem Statement Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card hover className="h-full">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <Target className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-ink-900">Problem Statement</h3>
            </div>
            {loading ? <Skeleton className="mt-4 h-16 w-full" /> : selectedProblem ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-900">{selectedProblem.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{selectedProblem.domain}</p>
                <Link to="/dashboard/problems" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-ink-500">{regComplete ? 'Select a problem to begin work' : 'Register first'}</p>
                <Link to="/dashboard/problems" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                  Browse problems <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Submission Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card hover className="h-full">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                <FileUp className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-display text-sm font-semibold text-ink-900">Submission</h3>
            </div>
            {loading ? <Skeleton className="mt-4 h-16 w-full" /> : (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">{subProgress.filled}/{subProgress.total} files</span>
                  {team?.submissionLocked && <Badge tone="success" className="text-[10px]">Locked</Badge>}
                </div>
                <ProgressBar value={subProgress.pct} max={100} className="mt-2" />
                <Link to="/dashboard/submission" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                  {team?.submissionLocked ? 'View submission' : 'Upload files'} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Deadlines + Announcements + Chat */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Deadlines */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="font-display text-sm font-semibold text-ink-900">Deadlines</h3>
            </div>
            <div className="mt-3 space-y-2">
              {eventCfg?.registrationClosesAt && (
                <div className="flex items-start gap-2 rounded-lg bg-[rgb(var(--surface-muted))]/50 px-3 py-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <div>
                    <p className="text-xs font-medium text-ink-800">Registration</p>
                    <p className="text-[11px] text-ink-500">{new Date(eventCfg.registrationClosesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
              {eventCfg?.submissionDeadline && (
                <div className="flex items-start gap-2 rounded-lg bg-[rgb(var(--surface-muted))]/50 px-3 py-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <div>
                    <p className="text-xs font-medium text-ink-800">Submission</p>
                    <p className="text-[11px] text-ink-500">{new Date(eventCfg.submissionDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
              {!eventCfg?.registrationClosesAt && !eventCfg?.submissionDeadline && (
                <p className="text-xs text-ink-400">No deadlines set yet</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Announcements */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-brand-600" />
                <h3 className="font-display text-sm font-semibold text-ink-900">Announcements</h3>
              </div>
              {announcements.length > 0 && (
                <Link to="/dashboard/announcements" className="text-[10px] font-medium text-brand-600 hover:underline">All</Link>
              )}
            </div>
            {annLoading ? <Skeleton className="mt-3 h-16 w-full" /> : announcements.length === 0 ? (
              <p className="mt-3 text-xs text-ink-400">No announcements yet</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {announcements.slice(0, 3).map((a) => (
                  <li key={a.id} className="rounded-lg border border-[rgb(var(--border))] px-3 py-2">
                    <p className="text-xs font-medium text-ink-900">{a.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-400">{formatDate(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Team Chat Quick Access */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-brand-600" />
              <h3 className="font-display text-sm font-semibold text-ink-900">Team Chat</h3>
            </div>
            <div className="mt-3">
              {team ? (
                <>
                  <p className="text-xs text-ink-500">Chat with your {(team.memberIds || []).length} teammate(s)</p>
                  <Link to="/dashboard/chat" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                    <MessageCircle className="h-3 w-3" /> Open chat <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : (
                <p className="text-xs text-ink-400">Join a team to unlock chat</p>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
