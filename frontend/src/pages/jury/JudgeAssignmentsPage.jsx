import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Layers } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useJuryAssignments } from '@/hooks/useJuryAssignments.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { deriveJuryEvalUiStatus } from '@/utils/juryEvaluationUi.js'
import {
  displayCategory,
  displayDepartment,
  displayOrganization,
  displayTheme,
} from '@/utils/problemStatementDisplay.js'

export function JudgeAssignmentsPage() {
  usePageSeo({ title: 'Assignments', description: 'Scoped problem statements & teams.' })
  const { teams, problems, loading, error } = useJuryAssignments()
  const [psFilter, setPsFilter] = useState('all')

  const teamsByPs = useMemo(() => {
    const m = new Map()
    for (const t of teams) {
      const pid = t.problemStatementId || '_none'
      if (!m.has(pid)) m.set(pid, [])
      m.get(pid).push(t)
    }
    return m
  }, [teams])

  const filteredProblems = useMemo(() => {
    if (psFilter === 'all') return problems
    return problems.filter((p) => p.id === psFilter)
  }, [problems, psFilter])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Assignments</h1>
        <p className="mt-2 text-sm text-ink-600">
          Problem statements and teams visible here are the same set returned by the secured jury API — nothing outside your scope is listed.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="sticky top-14 z-[5] flex flex-wrap items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-3 py-3 backdrop-blur-sm">
        <Layers className="h-4 w-4 text-ink-400" />
        <span className="text-xs font-semibold uppercase text-ink-500">Problem filter</span>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${psFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-[rgb(var(--surface))]'}`}
          onClick={() => setPsFilter('all')}
        >
          All assigned
        </button>
        {problems.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`max-w-[200px] truncate rounded-lg px-3 py-1.5 text-xs font-medium ${psFilter === p.id ? 'bg-brand-600 text-white' : 'bg-[rgb(var(--surface))]'}`}
            title={p.title}
            onClick={() => setPsFilter(p.id)}
          >
            {p.title || p.id}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {filteredProblems.map((p) => {
          const list = teamsByPs.get(p.id) || []
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge tone="brand" className="mb-2">
                    Problem statement
                  </Badge>
                  <h2 className="font-display text-xl font-semibold text-ink-900">{p.title || p.id}</h2>
                  <dl className="mt-2 space-y-0.5 text-xs text-ink-500">
                    {displayOrganization(p) ? (
                      <div>
                        <dt className="inline font-medium text-ink-600">Organization </dt>
                        <dd className="inline">{displayOrganization(p)}</dd>
                      </div>
                    ) : null}
                    {displayDepartment(p) ? (
                      <div>
                        <dt className="inline font-medium text-ink-600">Department </dt>
                        <dd className="inline">{displayDepartment(p)}</dd>
                      </div>
                    ) : null}
                    {displayCategory(p) ? (
                      <div>
                        <dt className="inline font-medium text-ink-600">Category </dt>
                        <dd className="inline">{displayCategory(p)}</dd>
                      </div>
                    ) : null}
                    {displayTheme(p) ? (
                      <div>
                        <dt className="inline font-medium text-ink-600">Theme </dt>
                        <dd className="inline">{displayTheme(p)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {p.description ? <p className="mt-3 line-clamp-4 text-sm text-ink-600">{p.description}</p> : null}
                </div>
                <div className="text-right text-xs text-ink-500">
                  <span className="font-mono">{p.id}</span>
                  <p className="mt-1">{typeof p.selectionCount === 'number' ? `${p.selectionCount} selections` : ''}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-[rgb(var(--border))] pt-6">
                <h3 className="text-sm font-semibold text-ink-800">Teams under this problem</h3>
                {list.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No teams yet for this problem in your scope.</p>
                ) : (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {list.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{t.name}</p>
                          <Badge tone="neutral" className="mt-1 text-[10px]">
                            {deriveJuryEvalUiStatus(t.myEvaluation)}
                          </Badge>
                        </div>
                        <Link to={`/judge/evaluate/${t.id}`}>
                          <Button size="sm" variant="secondary" type="button" className="gap-1 shrink-0">
                            <ClipboardList className="h-4 w-4" />
                            Review
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {problems.length === 0 && !error ? (
        <Card>
          <p className="text-sm text-ink-600">
            You do not have assigned problem statements yet. Ask an organizer to attach PS IDs to your jury profile or assign you directly on teams.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
