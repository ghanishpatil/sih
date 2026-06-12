import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Search, X } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useParticipantWorkspace } from '@/hooks/useParticipantWorkspace.js'
import {
  displayCategory,
  displayDepartment,
  displayOrganization,
  displayTheme,
} from '@/utils/problemStatementDisplay.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'

export function ParticipantProblemsPage() {
  usePageSeo({ title: 'Problem Statements', description: 'Browse and select your track.' })
  const { problems, team, api, loading, refreshTeam, eventCfg } = useParticipantWorkspace()
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState('all')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [detail, setDetail] = useState(null)

  const domains = useMemo(() => {
    const set = new Set()
    for (const p of problems) {
      const c = displayCategory(p)
      if (c) set.add(c)
    }
    return ['all', ...Array.from(set).sort()]
  }, [problems])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return problems.filter((p) => {
      if (p.published === false) return false
      if (domain !== 'all' && displayCategory(p) !== domain) return false
      if (!s) return true
      return (
        String(p.title || '').toLowerCase().includes(s) ||
        String(p.description || '').toLowerCase().includes(s) ||
        displayCategory(p).toLowerCase().includes(s) ||
        displayTheme(p).toLowerCase().includes(s) ||
        displayOrganization(p).toLowerCase().includes(s) ||
        displayDepartment(p).toLowerCase().includes(s) ||
        String(p.id || '').toLowerCase().includes(s)
      )
    })
  }, [problems, q, domain])

  const payOk =
    !eventCfg?.entryFeeEnabled ||
    (eventCfg?.entryFeeAmount ?? 0) <= 0 ||
    ['paid', 'waived', 'not_required'].includes(team?.paymentStatus || '')
  const canSelect = Boolean(team?.eventRegistered && payOk)

  async function select(pid) {
    if (!team) return
    setBusy(true)
    setMsg('')
    try {
      await api.selectProblem(pid)
      await refreshTeam()
      setMsg('Problem statement updated.')
      setDetail(null)
    } catch (e) {
      setMsg(e.message || 'Could not select problem')
    } finally {
      setBusy(false)
    }
  }

  const selectionLocked =
    eventCfg?.lifecyclePhase &&
    !['REGISTRATION_OPEN', 'SUBMISSION_OPEN'].includes(eventCfg.lifecyclePhase)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-ink-900"
        >
          Problem statements
        </motion.h1>
        <p className="mt-2 text-sm text-ink-600">
          Popularity reflects live selection counts. Changing tracks follows server phase rules and payment gates.
        </p>
      </div>

      {!team?.eventRegistered ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-950">
            Register your team (and complete payment if required) before selecting a problem.
          </p>
        </Card>
      ) : null}

      {team?.eventRegistered &&
      eventCfg?.entryFeeEnabled &&
      (eventCfg?.entryFeeAmount ?? 0) > 0 &&
      team?.paymentStatus === 'pending' ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-950">
            Entry fee still pending — complete payment on the registration page to unlock selection.
          </p>
        </Card>
      ) : null}

      {selectionLocked ? (
        <Card className="border-red-500/20 bg-red-500/10">
          <p className="text-sm text-red-900">
            Problem selection is closed for the current phase ({eventCfg?.lifecyclePhase || '—'}).
          </p>
        </Card>
      ) : null}

      {msg ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-4 py-3 text-sm">{msg}</p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            className="pl-10"
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, domain, keywords…"
          />
        </div>
        <div className="sm:w-56">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">Domain</span>
          <select
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            {domains.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All domains' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-500">No published problems match your filters.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => {
            const count = typeof p.selectionCount === 'number' ? p.selectionCount : 0
            const maxTeams = typeof p.maxTeams === 'number' ? p.maxTeams : null
            const full = maxTeams != null && count >= maxTeams
            const popular = count >= 8
            const selected = team?.problemStatementId === p.id
            return (
              <li key={p.id}>
                <Card className={`h-full transition ${selected ? 'border-brand-500/60 ring-2 ring-brand-500/20' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] text-ink-500">{p.id}</p>
                      <p className="font-display font-semibold text-ink-900">{p.title}</p>
                      <p className="mt-1 text-xs text-ink-500">{displayCategory(p) || '—'}</p>
                      {displayTheme(p) ? <p className="mt-0.5 text-xs text-ink-500">{displayTheme(p)}</p> : null}
                      {displayOrganization(p) ? (
                        <p className="mt-0.5 text-xs text-ink-400">{displayOrganization(p)}</p>
                      ) : null}
                      {displayDepartment(p) ? (
                        <p className="mt-0.5 text-[11px] text-ink-400">{displayDepartment(p)}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {popular ? (
                        <Badge tone="warn" className="gap-1 text-[10px]">
                          <Flame className="h-3 w-3" /> Popular
                        </Badge>
                      ) : null}
                      {full ? <Badge tone="neutral">Full</Badge> : <Badge tone="brand">{count} teams</Badge>}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-ink-600">{p.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setDetail(p)}>
                      Details
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || full || selectionLocked || !canSelect}
                      onClick={() => select(p.id)}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <AnimatePresence>
        {detail ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ps-modal-title"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 id="ps-modal-title" className="font-display text-xl font-semibold text-ink-900">
                  {detail.title}
                </h2>
                <button
                  type="button"
                  className="rounded-lg p-2 text-ink-500 hover:bg-[rgb(var(--surface-muted))]"
                  onClick={() => setDetail(null)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 font-mono text-[11px] text-ink-500">{detail.id}</p>
              <div className="mt-2 space-y-1 text-xs text-ink-600">
                <p>
                  <span className="font-medium text-ink-700">Category: </span>
                  {displayCategory(detail) || '—'}
                </p>
                {displayTheme(detail) ? (
                  <p>
                    <span className="font-medium text-ink-700">Theme: </span>
                    {displayTheme(detail)}
                  </p>
                ) : null}
                {displayOrganization(detail) ? (
                  <p>
                    <span className="font-medium text-ink-700">Organization: </span>
                    {displayOrganization(detail)}
                  </p>
                ) : null}
                {displayDepartment(detail) ? (
                  <p>
                    <span className="font-medium text-ink-700">Department: </span>
                    {displayDepartment(detail)}
                  </p>
                ) : null}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-ink-600">{detail.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  disabled={
                    busy ||
                    (typeof detail.maxTeams === 'number' &&
                      typeof detail.selectionCount === 'number' &&
                      detail.selectionCount >= detail.maxTeams) ||
                    selectionLocked ||
                    !canSelect
                  }
                  onClick={() => select(detail.id)}
                >
                  Select this problem
                </Button>
                <Button variant="ghost" type="button" onClick={() => setDetail(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
