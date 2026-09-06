import { isRegistrationComplete } from '@/utils/teamRegistrationDisplay.js'

/** Derives participant journey steps for UI (client-side only; gates enforced on API). */

export function buildParticipantSteps({
  eventCfg,
  team,
  submission,
  feeResolved,
  problemChosen,
}) {
  const phase = eventCfg?.lifecyclePhase || ''
  const feeRequired = Boolean(eventCfg?.entryFeeEnabled && (eventCfg?.entryFeeAmount ?? 0) > 0)
  const registrationDone = team ? isRegistrationComplete(team, { feeRequired }) : false

  const steps = [
    {
      id: 'hackathon',
      title: 'Hackathon',
      description: 'Registration & deadlines',
      done: Boolean(eventCfg),
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Create or join',
      done: Boolean(team?.id),
    },
    {
      id: 'register',
      title: feeRequired ? 'Register & pay' : 'Event registration',
      description: feeRequired ? 'Fee required to complete' : 'Confirm participation',
      done: registrationDone,
    },
    {
      id: 'payment',
      title: feeRequired ? 'Entry fee' : 'Fee',
      description: feeRequired ? 'Pay via Razorpay' : 'Not required',
      done: feeRequired ? feeResolved : true,
      skipped: !feeRequired,
    },
    {
      id: 'problem',
      title: 'Problem statement',
      description: 'Choose your track',
      done: Boolean(problemChosen),
    },
  ]

  // Single submission step — gated by the event schedule (no phases).
  steps.push({
    id: 'submission',
    title: 'Submission',
    description: 'Artifacts + finalize',
    done: Boolean(team?.submissionLocked || submission?.finalizedAt),
  })

  const completed = steps.filter((s) => s.done).length
  const activeIndex = steps.findIndex((s) => !s.done && !s.skipped)
  const currentIndex = activeIndex === -1 ? steps.length - 1 : activeIndex

  return { steps, completed, currentIndex, phase }
}

export function submissionCompleteness(sub) {
  if (!sub) return { filled: 0, total: 4, pct: 0 }
  const filled = [sub.pptUrl, sub.pdfUrl, sub.githubUrl, sub.videoUrl].filter(Boolean).length
  const total = 4
  return { filled, total, pct: Math.round((filled / total) * 100) }
}
