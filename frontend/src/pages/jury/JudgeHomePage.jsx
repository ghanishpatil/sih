import { Link } from 'react-router-dom'
import { ClipboardList, Layers, Clock, Megaphone } from 'lucide-react'
import { formatDate } from '@/utils/format.js'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useJuryAssignments } from '@/hooks/useJuryAssignments.js'
import { useAnnouncements } from '@/hooks/useAnnouncements.js'
import { useEvent } from '@/context/EventContext.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { deriveJuryEvalUiStatus } from '@/utils/juryEvaluationUi.js'

export function JudgeHomePage() {
  usePageSeo({ title: 'Jury Home', description: 'Evaluation workspace.' })
  const { eventId } = useEvent()
  const { teams, problems, edition, loading, error } = useJuryAssignments()
  const { items: announcements, loading: annLoading } = useAnnouncements(6, { eventId, juryFeed: true })

  const pending = teams.filter((t) => deriveJuryEvalUiStatus(t.myEvaluation) === 'pending').length
  const inProg = teams.filter((t) => deriveJuryEvalUiStatus(t.myEvaluation) === 'in-progress').length
  const done = teams.filter((t) => deriveJuryEvalUiStatus(t.myEvaluation) === 'submitted').length
  const locked = teams.filter((t) => deriveJuryEvalUiStatus(t.myEvaluation) === 'locked').length

  const recent = [...teams]
    .filter((t) => t.myEvaluation?.updatedAt || t.myEvaluation?.submittedAt)
    .sort((a, b) => String(b.myEvaluation?.submittedAt || b.myEvaluation?.updatedAt).localeCompare(String(a.myEvaluation?.submittedAt || a.myEvaluation?.updatedAt)))
    .slice(0, 5)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Jury home</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Scoped to your assigned problem statements and direct team assignments only. There is no global directory — open teams from{' '}
          <Link to="/judge/evaluate" className="font-medium text-brand-600 hover:underline">
            Evaluate Teams
          </Link>
          .
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={edition?.evaluationOpen ? 'success' : 'neutral'}>
            Evaluations {edition?.evaluationOpen ? 'open' : 'closed'}
          </Badge>
          {edition?.lifecyclePhase ? <Badge tone="brand">{edition.lifecyclePhase}</Badge> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-500/15 bg-brand-500/5">
          <div className="flex items-center gap-2 text-brand-700">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Assigned PS</span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{problems.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-ink-500">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Pending</span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{pending}</p>
        </Card>
        <Card>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">In progress</span>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{inProg}</p>
        </Card>
        <Card>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Submitted</span>
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{done}</p>
          {locked > 0 ? <p className="mt-1 text-xs text-ink-500">{locked} locked</p> : null}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-500" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Upcoming deadlines</h2>
          </div>
          <p className="mt-3 text-sm text-ink-600">
            Submission deadline (edition):{' '}
            <strong className="text-ink-900">
              {edition?.submissionDeadline
                ? (() => {
                    try {
                      return new Date(edition.submissionDeadline).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    } catch {
                      return edition.submissionDeadline
                    }
                  })()
                : '—'}
            </strong>
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Tip: finalize evaluations before organizers lock scores. You cannot edit after submitting unless organizers reopen your sheet.
          </p>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent evaluation activity</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No saves yet — open a team from Evaluate Teams.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-[rgb(var(--border))] px-3 py-2">
                  <span className="font-medium text-ink-900">{t.name}</span>
                  <Badge tone="neutral">{deriveJuryEvalUiStatus(t.myEvaluation)}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link to="/judge/evaluate">
            <Button className="mt-4 w-full sm:w-auto" variant="secondary" size="sm" type="button">
              Open evaluate queue
            </Button>
          </Link>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-ink-500" />
          <h2 className="font-display text-lg font-semibold text-ink-900">Announcements</h2>
        </div>
        {annLoading ? (
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        ) : announcements.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No jury-visible announcements for this edition.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 px-4 py-3">
                <p className="text-xs text-ink-500">{formatDate(a.createdAt)}</p>
                <p className="font-medium text-ink-900">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-ink-600">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
        <Link to="/judge/announcements" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          View all announcements
        </Link>
      </Card>
    </div>
  )
}
