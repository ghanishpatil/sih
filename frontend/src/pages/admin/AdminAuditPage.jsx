import { useCallback, useEffect, useMemo, useState } from 'react'
import { Shield, Users, CreditCard, FileUp, Gavel, Settings, Megaphone, UserPlus, Trash2, Pencil, RefreshCw } from 'lucide-react'
import { formatDate } from '@/utils/format.js'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Card } from '@/components/ui/Card.jsx'

/** Map action codes to human-readable descriptions */
function describeAction(log) {
  const a = log.action || ''
  const meta = log.metadata || {}
  switch (a) {
    case 'event.create': return 'Created a new event'
    case 'event.patch': return `Updated event settings (${(meta.keys || []).filter(k => k !== 'updatedAt' && k !== 'updatedBy').join(', ') || 'config'})`
    case 'team.admin_patch': return `Updated team (${(meta.keys || []).join(', ')})`
    case 'team.registration_delete': return 'Deleted team registration'
    case 'payment.record': return `Recorded payment as "${meta.status}"`
    case 'user.role': return `Changed user role to "${meta.role}"`
    case 'judge.assign_problems': return `Assigned ${meta.count || 0} problem(s) to judge`
    case 'problem_statement.create': return `Created problem statement "${meta.title || ''}"`
    case 'problem_statement.patch': return 'Updated problem statement'
    case 'problem_statement.delete': return 'Deleted problem statement'
    case 'admin.send_payment_reminders': return `Sent payment reminders to ${meta.sent || 0} team(s)`
    case 'admin.send_submission_reminders': return `Sent submission reminders (${meta.hoursLeft || 24}h) to ${meta.sent || 0} team(s)`
    case 'bulk.record_payment': return `Bulk recorded payment "${meta.params?.status}" for ${meta.count || 0} team(s)`
    case 'bulk.update_registration': return `Bulk updated registration for ${meta.count || 0} team(s)`
    case 'bulk.lock_submission': return `Bulk locked submissions for ${meta.count || 0} team(s)`
    case 'bulk.unlock_submission': return `Bulk unlocked submissions for ${meta.count || 0} team(s)`
    case 'bulk.shortlist': return `Bulk shortlisted ${meta.count || 0} team(s)`
    case 'bulk.unshortlist': return `Bulk removed ${meta.count || 0} team(s) from shortlist`
    case 'bulk.send_email': return `Bulk sent email to ${meta.count || 0} team(s)`
    case 'legacy.event_config.patch': return 'Updated legacy config (deprecated)'
    default: return a.replace(/[._]/g, ' ')
  }
}

/** Map action codes to icons */
function actionIcon(action) {
  if (action.startsWith('event')) return Settings
  if (action.startsWith('team')) return Users
  if (action.startsWith('payment') || action.includes('payment')) return CreditCard
  if (action.startsWith('user')) return UserPlus
  if (action.startsWith('judge')) return Gavel
  if (action.startsWith('problem_statement')) return FileUp
  if (action.includes('delete')) return Trash2
  if (action.startsWith('bulk')) return RefreshCw
  if (action.includes('announcement') || action.includes('reminder')) return Megaphone
  return Shield
}

/** Map action codes to badge tones */
function actionTone(action) {
  if (action.includes('delete') || action.includes('reject')) return 'danger'
  if (action.includes('create') || action.includes('paid') || action.includes('shortlist')) return 'success'
  if (action.includes('patch') || action.includes('update') || action.includes('assign')) return 'brand'
  if (action.includes('bulk') || action.includes('reminder')) return 'warn'
  return 'neutral'
}

export function AdminAuditPage() {
  usePageSeo({ title: 'Activity Logs', description: 'Security audit trail.' })
  const api = useApi()
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, usersList] = await Promise.all([
        api.listAuditLogs(300),
        api.listUsers().catch(() => []),
      ])
      setLogs(Array.isArray(rows) ? rows : [])
      const map = new Map()
      for (const u of (Array.isArray(usersList) ? usersList : [])) {
        map.set(u.id, { name: u.displayName || u.email || u.id, email: u.email || '', role: u.role || '' })
      }
      setUsers(map)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  const resolveName = useCallback((uid) => {
    if (!uid) return 'System'
    const u = users.get(uid)
    return u?.name || 'Unknown'
  }, [users])

  const resolveRole = useCallback((uid) => {
    if (!uid) return ''
    const u = users.get(uid)
    return u?.role || ''
  }, [users])

  // Filter logs
  const filtered = useMemo(() => {
    if (!filter) return logs
    const q = filter.toLowerCase()
    return logs.filter((l) =>
      describeAction(l).toLowerCase().includes(q) ||
      resolveName(l.actorUid).toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q)
    )
  }, [logs, filter, resolveName])

  // Stats
  const todayCount = useMemo(() => {
    const today = new Date().toDateString()
    return logs.filter((l) => {
      const d = l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : l.createdAt ? new Date(l.createdAt) : null
      return d && d.toDateString() === today
    }).length
  }, [logs])

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Activity Logs</h1>
          <p className="mt-2 text-sm text-ink-600">
            All admin actions are logged permanently. Use this for security audits and compliance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="brand">{todayCount} today</Badge>
          <Badge tone="neutral">{logs.length} total</Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search logs by action, person..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Activity Feed */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><p className="py-8 text-center text-sm text-ink-400">No activity logs found</p></Card>
        ) : (
          filtered.slice(0, 100).map((log, i) => {
            const Icon = actionIcon(log.action || '')
            const tone = actionTone(log.action || '')
            const actorName = resolveName(log.actorUid)
            const actorRole = resolveRole(log.actorUid)
            const time = formatDate(log.createdAt)

            return (
              <div
                key={log.id || i}
                className="flex gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 transition-colors hover:bg-[rgb(var(--surface-muted))]/50"
              >
                {/* Icon */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  tone === 'danger' ? 'bg-red-500/10 text-red-600' :
                  tone === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                  tone === 'brand' ? 'bg-brand-500/10 text-brand-600' :
                  tone === 'warn' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-[rgb(var(--surface-muted))] text-ink-500'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">
                    <span className="font-semibold">{actorName}</span>
                    {actorRole && <span className="ml-1.5 text-[10px] font-medium uppercase text-ink-400">({actorRole})</span>}
                    <span className="ml-1 text-ink-600">{describeAction(log)}</span>
                  </p>
                  {log.targetType && log.targetId && (
                    <p className="mt-0.5 text-xs text-ink-400">
                      {log.targetType}: {log.targetType === 'user' ? resolveName(log.targetId) : log.targetId.length > 20 ? log.targetId.slice(0, 20) + '…' : log.targetId}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="shrink-0 text-right">
                  <p className="text-xs text-ink-500">{time || '—'}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {filtered.length > 100 && (
        <p className="text-center text-xs text-ink-400">Showing first 100 of {filtered.length} entries. Use search to narrow down.</p>
      )}
    </div>
  )
}
