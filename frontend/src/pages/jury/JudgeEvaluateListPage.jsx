import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useJuryAssignments } from '@/hooks/useJuryAssignments.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { deriveJuryEvalUiStatus } from '@/utils/juryEvaluationUi.js'

const FILTERS = ['all', 'pending', 'in-progress', 'submitted', 'locked']

function toneForStatus(s) {
  switch (s) {
    case 'submitted':
      return 'success'
    case 'in-progress':
      return 'brand'
    case 'locked':
      return 'warn'
    case 'pending':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function JudgeEvaluateListPage() {
  usePageSeo({ title: 'Evaluate Teams', description: 'Evaluation queue.' })
  const { teams, edition, loading, error } = useJuryAssignments()
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    if (filter === 'all') return teams
    return teams.filter((t) => deriveJuryEvalUiStatus(t.myEvaluation) === filter)
  }, [teams, filter])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Evaluate teams</h1>
        <p className="mt-2 text-sm text-ink-600">
          Queue is limited to teams the API returns for your account — tampering with URLs outside this list returns access denied.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={edition?.evaluationOpen ? 'success' : 'neutral'}>
            Phase: {edition?.evaluationOpen ? 'accepting scores' : 'read-only / closed'}
          </Badge>
        </div>
      </div>

      <div className="sticky top-14 z-[5] flex flex-wrap gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-3 py-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-[rgb(var(--surface))]'}`}
            onClick={() => setFilter(f)}
          >
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-600">No teams match this filter.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((t) => {
            const ui = deriveJuryEvalUiStatus(t.myEvaluation)
            return (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-display font-semibold text-ink-900">{t.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-500">{t.problemStatementId || '—'}</p>
                    <Badge tone={toneForStatus(ui)} className="mt-2 text-[10px]">
                      {ui}
                    </Badge>
                  </div>
                  <Link to={`/judge/evaluate/${t.id}`}>
                    <Button size="sm" className="gap-2" type="button">
                      <ClipboardList className="h-4 w-4" />
                      Open review
                    </Button>
                  </Link>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
