import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useJuryAssignments } from '@/hooks/useJuryAssignments.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { deriveJuryEvalUiStatus } from '@/utils/juryEvaluationUi.js'

export function JudgeProgressPage() {
  usePageSeo({ title: 'Evaluation Progress', description: 'Workflow tracking.' })
  const { teams, edition, loading, error } = useJuryAssignments()

  const stats = useMemo(() => {
    const total = teams.length
    const breakdown = { pending: 0, 'in-progress': 0, submitted: 0, locked: 0 }
    for (const t of teams) {
      breakdown[deriveJuryEvalUiStatus(t.myEvaluation)] += 1
    }
    // BUG-6 FIX: Count locked evaluations as "done" — a locked eval is finalized
    // and the judge cannot edit it. Showing 0% when all are locked is misleading.
    const done = breakdown.submitted + breakdown.locked
    const pct = total ? Math.round((done / total) * 100) : 0
    return { total, breakdown, pct }
  }, [teams])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-56 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Evaluation progress</h1>
        <p className="mt-2 text-sm text-ink-600">Counts reflect only teams in your jury scope.</p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-semibold text-ink-900">Completion</h2>
        </div>
        <p className="mt-4 font-display text-4xl font-bold text-ink-900">{stats.pct}%</p>
        <p className="mt-1 text-sm text-ink-600">
          {stats.breakdown.submitted} submitted / {stats.total} assigned teams
        </p>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-[width] duration-500"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(stats.breakdown).map(([k, v]) => (
          <Card key={k}>
            <p className="text-xs font-semibold uppercase text-ink-500">{k.replace('-', ' ')}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink-900">Edition status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={edition?.evaluationOpen ? 'success' : 'neutral'}>
            Evaluations {edition?.evaluationOpen ? 'open' : 'closed'}
          </Badge>
          {edition?.lifecyclePhase ? <Badge tone="brand">{edition.lifecyclePhase}</Badge> : null}
        </div>
        <Link to="/judge/evaluate" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
          Return to evaluate queue →
        </Link>
      </Card>
    </div>
  )
}
