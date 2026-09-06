import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Search, RefreshCw, ChevronDown, ChevronRight, ChevronLeft, ExternalLink,
  Building2, Layers, CalendarClock, AlertTriangle, Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'

const CATEGORY_STYLES = {
  Software: 'bg-blue-50 text-blue-700 border-blue-200',
  Hardware: 'bg-amber-50 text-amber-700 border-amber-200',
}
const catStyle = (c) => CATEGORY_STYLES[c] || 'bg-ink-100 text-ink-700 border-ink-200'

function timeAgo(iso) {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const s = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

function SubmittedBar({ count, max }) {
  if (typeof count !== 'number') return <span className="text-xs text-ink-400">—</span>
  const denom = typeof max === 'number' && max > 0 ? max : null
  const pct = denom ? Math.min(100, Math.round((count / denom) * 100)) : null
  return (
    <div className="min-w-[76px] text-right">
      <p className="font-mono text-sm font-bold text-ink-900">
        {count}
        {denom ? <span className="text-ink-400">/{denom}</span> : ''}
      </p>
      {pct !== null ? (
        <div className="mt-0.5 ml-auto h-1 w-16 overflow-hidden rounded-full bg-ink-100">
          <div
            className={`h-full ${pct >= 80 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Read-only panel that lists the SIH 2026 problem statements scraped live from
 * sih.gov.in, including the live "ideas submitted" count. Shared by the admin
 * Problems tab (with a Refresh button) and the public /problems page.
 *
 * Props:
 *   items        array of { no, psNumber, title, category, theme, organization,
 *                           department, description, submittedCount, submittedMax,
 *                           submittedRaw, deadline }
 *   meta         { lastSyncAt, count, softwareCount, hardwareCount, ok, error, source }
 *   loading      initial load skeleton
 *   onRefresh    optional async () => void  (admin only)
 *   refreshing   bool — a refresh is in flight
 */
export function SihProblemStatements({
  items = [],
  meta = {},
  loading = false,
  onRefresh,
  refreshing = false,
}) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [theme, setTheme] = useState('all')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState(null)
  const pageSize = 25

  const themes = useMemo(
    () => [...new Set(items.map((i) => i.theme).filter(Boolean))].sort(),
    [items],
  )

  const filtered = useMemo(() => {
    let list = items
    if (category !== 'all') list = list.filter((i) => i.category === category)
    if (theme !== 'all') list = list.filter((i) => i.theme === theme)
    if (q.trim()) {
      const s = q.toLowerCase()
      list = list.filter(
        (i) =>
          (i.psNumber || '').toLowerCase().includes(s) ||
          (i.title || '').toLowerCase().includes(s) ||
          (i.organization || '').toLowerCase().includes(s) ||
          (i.theme || '').toLowerCase().includes(s) ||
          (i.description || '').toLowerCase().includes(s),
      )
    }
    return list
  }, [items, category, theme, q])

  useEffect(() => {
    setPage(0)
  }, [q, category, theme])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const swCount = meta.softwareCount ?? items.filter((i) => i.category === 'Software').length
  const hwCount = meta.hardwareCount ?? items.filter((i) => i.category === 'Hardware').length

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
              <Radio className="h-4 w-4" />
            </span>
            <h2 className="font-display text-lg font-bold text-ink-900">SIH 2026 Problem Statements</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Fetched from{' '}
            <a
              href={meta.source || 'https://sih.gov.in/sih2026PS'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-brand-600 hover:underline"
            >
              sih.gov.in <ExternalLink className="h-3 w-3" />
            </a>
            {' · '}
            {meta.count ?? items.length} statements ({swCount} software · {hwCount} hardware)
            {' · '}
            {meta.lastSyncAt
              ? `synced ${timeAgo(meta.lastSyncAt)}`
              : meta.fromSeed
                ? `bundled snapshot${meta.capturedAt ? ` from ${new Date(meta.capturedAt).toLocaleDateString()}` : ''}`
                : 'not synced yet'}
          </p>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="shrink-0 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh from SIH'}
          </Button>
        ) : null}
      </div>

      {/* Stale / blocked notice. sih.gov.in's WAF can reject requests from our
          hosting provider, in which case we serve the snapshot bundled with the
          release — the full list is intact, only the submitted counts are frozen. */}
      {meta.ok === false && meta.error ? (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {meta.fromSeed ? (
              <>
                Live refresh is currently blocked by sih.gov.in ({meta.error}). Showing the complete
                bundled list
                {meta.capturedAt ? ` captured on ${new Date(meta.capturedAt).toLocaleDateString()}` : ''} —
                titles and descriptions are accurate, but the submitted-idea counts are not live.
              </>
            ) : (
              <>
                Live refresh failed ({meta.error}). Showing the last successfully fetched data
                {meta.lastSyncAt ? ` from ${timeAgo(meta.lastSyncAt)}` : ''}.
              </>
            )}
          </span>
        </div>
      ) : null}

      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search PS number, title, organization, theme…"
            className="h-10 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] py-2 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-3 text-sm text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">All categories</option>
          <option value="Software">Software</option>
          <option value="Hardware">Hardware</option>
        </select>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          aria-label="Filter by theme"
          className="h-10 max-w-[220px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-3 text-sm text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="all">All themes</option>
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-ink-500">
          {items.length === 0
            ? 'No SIH problem statements loaded yet. Try refreshing.'
            : 'No problem statements match your filters.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-3 py-2.5">PS #</th>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Theme</th>
                  <th className="px-3 py-2.5 text-right">Submitted</th>
                  <th className="w-8 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((ps) => {
                  const isOpen = openId === ps.psNumber
                  return (
                    <Fragment key={ps.psNumber}>
                      <tr
                        onClick={() => setOpenId(isOpen ? null : ps.psNumber)}
                        className="cursor-pointer border-b border-[rgb(var(--border))]/70 transition-colors hover:bg-brand-50/40"
                      >
                        <td className="px-3 py-3 align-top">
                          <span className="font-mono text-[11px] font-bold text-brand-700">{ps.psNumber}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="line-clamp-2 max-w-xl font-medium text-ink-900">{ps.title}</p>
                          {ps.organization ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-500">{ps.organization}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${catStyle(
                              ps.category,
                            )}`}
                          >
                            {ps.category || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="text-xs text-ink-600">{ps.theme || '—'}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <SubmittedBar count={ps.submittedCount} max={ps.submittedMax} />
                        </td>
                        <td className="px-3 py-3 align-top text-ink-400">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <p className="flex items-center gap-2 text-xs text-ink-600">
                                <Building2 className="h-3.5 w-3.5 text-ink-400" />
                                <span className="font-semibold">Organization:</span> {ps.organization || '—'}
                              </p>
                              <p className="flex items-center gap-2 text-xs text-ink-600">
                                <Layers className="h-3.5 w-3.5 text-ink-400" />
                                <span className="font-semibold">Department:</span> {ps.department || '—'}
                              </p>
                              {ps.deadline ? (
                                <p className="flex items-center gap-2 text-xs text-ink-600">
                                  <CalendarClock className="h-3.5 w-3.5 text-ink-400" />
                                  <span className="font-semibold">Deadline:</span> {ps.deadline}
                                </p>
                              ) : null}
                              {ps.submittedRaw ? (
                                <p className="flex items-center gap-2 text-xs text-ink-600">
                                  <Radio className="h-3.5 w-3.5 text-ink-400" />
                                  <span className="font-semibold">Ideas submitted (live):</span> {ps.submittedRaw}
                                </p>
                              ) : null}
                            </div>
                            {ps.description ? (
                              <div className="mt-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Description</p>
                                <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">
                                  {ps.description}
                                </p>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-4 py-3 sm:flex-row">
            <p className="text-xs text-ink-500">
              Showing <strong className="text-ink-900">{pageRows.length}</strong> of{' '}
              <strong className="text-ink-900">{filtered.length}</strong>
              {filtered.length !== items.length ? ` (of ${items.length} total)` : ''}
            </p>
            {pageCount > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500">
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-md border border-[rgb(var(--border))] p-1.5 text-ink-600 hover:bg-[rgb(var(--surface-muted))] disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="rounded-md border border-[rgb(var(--border))] p-1.5 text-ink-600 hover:bg-[rgb(var(--surface-muted))] disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
