import { motion } from 'framer-motion'
import {
  CheckCircle2, Lock, Clock, Trophy, Loader2, XCircle, Play, FileText, Award, Archive
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge.jsx'

const STATE_DISPLAY = {
  DRAFT: { color: 'gray', icon: Lock },
  UPCOMING: { color: 'blue', icon: Clock },
  ACTIVE: { color: 'green', icon: Play },
  SUBMISSION_LOCKED: { color: 'amber', icon: Lock },
  EVALUATION: { color: 'amber', icon: Loader2 },
  SHORTLISTING: { color: 'amber', icon: Award },
  COMPLETED: { color: 'emerald', icon: CheckCircle2 },
  ARCHIVED: { color: 'gray', icon: Archive },
}

/**
 * Compute team progression for each phase
 * Returns: 'qualified' | 'in-progress' | 'under-review' | 'eliminated' | 'upcoming' | 'locked'
 */
function getProgress(team, phase, allPhases) {
  if (!phase) return 'locked'
  const shortlisted = team?.shortlistedPhases || []
  const isFirstPhase = phase.order === 1
  const eligibleForPhase = isFirstPhase || shortlisted.includes(phase.id)
  const now = Date.now()
  const start = phase.startDate ? new Date(phase.startDate).getTime() : null
  const end = phase.deadline ? new Date(phase.deadline).getTime() : null

  if (phase.status === 'DRAFT' || phase.status === 'ARCHIVED') return 'locked'

  // Auto-determine status from dates if status is DRAFT/UPCOMING but dates say otherwise
  const isDateActive = start && now >= start && (!end || now <= end)
  const isDatePast = end && now > end

  if (phase.status === 'UPCOMING' && !isDateActive) return eligibleForPhase ? 'upcoming' : 'locked'
  if (phase.status === 'ACTIVE' || isDateActive) return eligibleForPhase ? 'in-progress' : 'locked'

  if (['SUBMISSION_LOCKED', 'EVALUATION', 'SHORTLISTING'].includes(phase.status) || isDatePast) {
    if (!eligibleForPhase) return 'locked'
    // Check if completed
    if (phase.status === 'COMPLETED') {
      const nextPhase = allPhases.find((p) => p.order === phase.order + 1)
      if (nextPhase && shortlisted.includes(nextPhase.id)) return 'qualified'
      if (!nextPhase) return 'qualified'
      return 'eliminated'
    }
    return 'under-review'
  }

  if (phase.status === 'COMPLETED') {
    if (!eligibleForPhase) return 'eliminated'
    const nextPhase = allPhases.find((p) => p.order === phase.order + 1)
    if (nextPhase && shortlisted.includes(nextPhase.id)) return 'qualified'
    if (!nextPhase) return 'qualified'
    return 'eliminated'
  }

  return eligibleForPhase ? 'upcoming' : 'locked'
}

const STATUS_CONFIG = {
  qualified: {
    label: 'Qualified',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-500/30',
    badgeTone: 'success',
    emoji: '✓',
    description: 'You advanced to the next round',
  },
  'in-progress': {
    label: 'In Progress',
    icon: Play,
    bgColor: 'bg-brand-500',
    textColor: 'text-brand-600',
    borderColor: 'border-brand-500/40',
    badgeTone: 'brand',
    emoji: '🚀',
    description: 'Currently submitting',
  },
  'under-review': {
    label: 'Under Review',
    icon: Loader2,
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-500/30',
    badgeTone: 'warn',
    emoji: '⏳',
    description: 'Judges evaluating',
  },
  eliminated: {
    label: 'Not Advanced',
    icon: XCircle,
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-500/30',
    badgeTone: 'danger',
    emoji: '✗',
    description: 'Did not advance from this round',
  },
  upcoming: {
    label: 'Upcoming',
    icon: Clock,
    bgColor: 'bg-ink-300',
    textColor: 'text-ink-500',
    borderColor: 'border-[rgb(var(--border))]',
    badgeTone: 'neutral',
    emoji: '📅',
    description: 'Yet to start',
  },
  locked: {
    label: 'Locked',
    icon: Lock,
    bgColor: 'bg-ink-200',
    textColor: 'text-ink-400',
    borderColor: 'border-[rgb(var(--border))]',
    badgeTone: 'neutral',
    emoji: '🔒',
    description: 'Not eligible for this phase',
  },
}

export function PhaseProgressTimeline({ phases = [], team }) {
  const visiblePhases = phases
    .filter((p) => !['DRAFT', 'ARCHIVED'].includes(p.status))
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  if (visiblePhases.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-center">
        <p className="text-sm text-ink-500">No competition phases configured yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-semibold text-ink-900">Your Progression</h2>
      </div>

      <div className="space-y-0">
        {visiblePhases.map((phase, i) => {
          const progress = getProgress(team, phase, phases)
          const config = STATUS_CONFIG[progress]
          const StatusIcon = config.icon
          const isLast = i === visiblePhases.length - 1

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-4"
            >
              {/* Vertical line + node */}
              <div className="flex flex-col items-center">
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 ${
                  progress === 'qualified' || progress === 'in-progress' || progress === 'under-review'
                    ? `border-current ${config.bgColor} text-white shadow-lg`
                    : `border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] ${config.textColor}`
                }`}>
                  <StatusIcon className={`h-5 w-5 ${progress === 'under-review' ? 'animate-spin' : ''}`} />
                  {progress === 'in-progress' && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className={`my-1 h-12 w-0.5 ${
                    progress === 'qualified' ? 'bg-emerald-500' :
                    progress === 'in-progress' ? 'bg-gradient-to-b from-brand-500 to-ink-200' :
                    'bg-[rgb(var(--border))]'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-bold text-ink-900 sm:text-base">
                    {phase.name}
                  </h3>
                  <Badge tone={config.badgeTone}>
                    {config.emoji} {config.label}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{config.description}</p>
                {phase.description && (
                  <p className="mt-2 max-w-xl text-sm text-ink-600">{phase.description}</p>
                )}
                {phase.deadline && progress === 'in-progress' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700">
                    <Clock className="h-3 w-3" />
                    Deadline: {new Date(phase.deadline).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
