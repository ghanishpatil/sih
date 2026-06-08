import { Calendar, CheckCircle2, Circle, Flag, Send, Trophy, Clock } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useParticipantWorkspace } from '@/hooks/useParticipantWorkspace.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'

/** Participant-friendly phases (no DRAFT/ARCHIVED) */
const PARTICIPANT_PHASES = [
  { key: 'REGISTRATION_OPEN', label: 'Registration Open', desc: 'Create teams, invite members, and register' },
  { key: 'REGISTRATION_CLOSED', label: 'Registration Closed', desc: 'No new registrations accepted' },
  { key: 'SUBMISSION_OPEN', label: 'Submissions Open', desc: 'Upload your PPT, PDF, video, and code' },
  { key: 'SUBMISSION_LOCKED', label: 'Submissions Locked', desc: 'No more changes to submissions' },
  { key: 'EVALUATION', label: 'Jury Evaluation', desc: 'Judges reviewing all submissions' },
  { key: 'RESULTS_PUBLISHED', label: 'Results Announced', desc: 'Winners declared!' },
]

function getPhaseIndex(current) {
  const idx = PARTICIPANT_PHASES.findIndex((p) => p.key === current)
  // If DRAFT or unknown, show as before registration
  return idx >= 0 ? idx : -1
}

function formatDateNice(d) {
  if (!d) return null
  try {
    const date = new Date(typeof d === 'object' && d.seconds ? d.seconds * 1000 : d)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}

export function ParticipantTimelinePage() {
  usePageSeo({ title: 'Timeline', description: 'Event milestones and deadlines.' })
  const { eventCfg, loading } = useParticipantWorkspace()

  const current = eventCfg?.lifecyclePhase || ''
  const currentIdx = getPhaseIndex(current)

  if (loading) return <Skeleton className="mx-auto h-96 max-w-3xl rounded-2xl" />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">Event Timeline</h1>
        <p className="mt-2 text-sm text-ink-600">
          Track the hackathon progress and upcoming deadlines.
        </p>
      </div>

      {/* Current Phase Highlight */}
      {currentIdx >= 0 && (
        <Card className="border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Current Phase</p>
              <p className="font-display text-lg font-bold text-ink-900">{PARTICIPANT_PHASES[currentIdx].label}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Key Dates */}
      <Card>
        <h2 className="font-display text-base font-semibold text-ink-900">Important Dates</h2>
        <div className="mt-4 space-y-3">
          <DateRow
            icon={Calendar}
            label="Registration Opens"
            date={formatDateNice(eventCfg?.registrationOpensAt)}
            past={currentIdx > 0}
          />
          <DateRow
            icon={Flag}
            label="Registration Closes"
            date={formatDateNice(eventCfg?.registrationClosesAt)}
            past={currentIdx > 1}
            urgent={currentIdx === 0}
          />
          <DateRow
            icon={Send}
            label="Submission Deadline"
            date={formatDateNice(eventCfg?.submissionDeadline)}
            past={currentIdx > 2}
            urgent={currentIdx >= 1 && currentIdx <= 2}
          />
          <DateRow
            icon={Trophy}
            label="Results"
            date={currentIdx >= 5 ? 'Published' : 'After evaluation'}
            past={currentIdx >= 5}
          />
        </div>
      </Card>

      {/* Phase Progress */}
      <Card>
        <h2 className="font-display text-base font-semibold text-ink-900">Event Progress</h2>
        <div className="mt-5 space-y-0">
          {PARTICIPANT_PHASES.map((phase, i) => {
            const isActive = i === currentIdx
            const isPast = currentIdx >= 0 && i < currentIdx
            const isFuture = i > currentIdx

            return (
              <div key={phase.key} className="flex gap-4">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : isPast
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink-200 bg-[rgb(var(--surface))]'
                  }`}>
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Circle className="h-3 w-3 fill-current" /> : <span className="text-[10px] text-ink-400">{i + 1}</span>}
                  </div>
                  {i < PARTICIPANT_PHASES.length - 1 && (
                    <div className={`h-10 w-0.5 ${isPast ? 'bg-emerald-500' : 'bg-ink-200'}`} />
                  )}
                </div>

                {/* Label */}
                <div className="pb-6 pt-1">
                  <p className={`text-sm font-semibold ${isActive ? 'text-brand-700' : isPast ? 'text-emerald-700' : 'text-ink-500'}`}>
                    {phase.label}
                    {isActive && <Badge tone="brand" className="ml-2 text-[9px]">NOW</Badge>}
                    {isPast && <Badge tone="success" className="ml-2 text-[9px]">DONE</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{phase.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function DateRow({ icon: Icon, label, date, past, urgent }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
      urgent ? 'border border-amber-500/30 bg-amber-500/5' :
      past ? 'bg-[rgb(var(--surface-muted))]/50 opacity-60' :
      'bg-[rgb(var(--surface-muted))]/50'
    }`}>
      <Icon className={`h-5 w-5 shrink-0 ${past ? 'text-emerald-500' : urgent ? 'text-amber-600' : 'text-ink-400'}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-ink-900">{label}</p>
      </div>
      <p className={`text-sm ${past ? 'text-emerald-600' : 'text-ink-600'}`}>
        {date || 'TBD'}
      </p>
      {past && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
    </div>
  )
}
