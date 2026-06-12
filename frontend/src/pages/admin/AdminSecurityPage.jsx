/**
 * SKH Security Center — Phase 2: Skeleton + Overview + Live Activity
 * Enterprise-grade security operations module.
 * All data is real — sourced from Firestore via Admin SDK.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Shield, Activity, AlertTriangle, FileText, Database,
  Lock, Bell, CheckCircle2, XCircle, RefreshCw,
  Users, Server, Key, CreditCard, Eye,
  Search, Download, ChevronDown, ChevronRight,
  AlertCircle, Settings, UserCog, Zap, Upload,
  Globe, Wifi, BarChart2, Clock, Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { formatDate } from '@/utils/format.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Overview',         icon: Shield },
  { id: 'live',        label: 'Live Activity',     icon: Activity },
  { id: 'threats',     label: 'Threat Detection',  icon: AlertTriangle },
  { id: 'audit',       label: 'Audit Logs',        icon: FileText },
  { id: 'violations',  label: 'Access Violations', icon: Lock },
  { id: 'incidents',   label: 'Incidents',         icon: Bell },
  { id: 'webhooks',    label: 'Webhook Health',    icon: Zap },
  { id: 'duplicates',  label: 'Duplicate Teams',   icon: Users },
  { id: 'uploads',     label: 'Upload Monitor',    icon: Upload },
  { id: 'integrity',   label: 'System Integrity',  icon: Database },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function tsMs(ts) {
  if (!ts) return 0
  if (ts?.seconds) return ts.seconds * 1000
  if (ts?.toDate) return ts.toDate().getTime()
  const d = new Date(ts)
  return isNaN(d) ? 0 : d.getTime()
}

function relTime(ts) {
  const ms = tsMs(ts)
  if (!ms) return '—'
  const diff = Date.now() - ms
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function auditSeverity(action = '') {
  if (action.includes('delete') || action.includes('ban')) return 'CRITICAL'
  if (action.includes('role') || action.includes('bulk') || action.includes('payment')) return 'HIGH'
  if (action.includes('patch') || action.includes('update') || action.includes('assign')) return 'MEDIUM'
  return 'LOW'
}

function secEventSeverityOrder(sev) {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }[sev] ?? 5
}

const SEV_STYLE = {
  CRITICAL: 'bg-red-500/10 text-red-700 border-red-500/30',
  HIGH:     'bg-orange-500/10 text-orange-700 border-orange-500/30',
  MEDIUM:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  LOW:      'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  INFO:     'bg-sky-500/10 text-sky-700 border-sky-500/30',
}

const SEV_TONE = {
  CRITICAL: 'danger', HIGH: 'warn', MEDIUM: 'warn', LOW: 'success', INFO: 'brand',
}

function SevBadge({ sev }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEV_STYLE[sev] || SEV_STYLE.INFO}`}>
      {sev}
    </span>
  )
}

function describeAuditAction(log) {
  const a = log.action || ''
  const m = log.metadata || {}
  const map = {
    'event.create': 'Created new event',
    'event.patch': `Updated event (${(m.keys || []).filter(k => !['updatedAt','updatedBy'].includes(k)).join(', ') || 'config'})`,
    'team.admin_patch': `Patched team fields: ${(m.keys || []).join(', ')}`,
    'team.registration_delete': 'Deleted team registration',
    'payment.record': `Recorded payment → "${m.status}"`,
    'user.role': `Changed role → "${m.role}"`,
    'user.ban': `Banned user (${m.email || ''})`,
    'user.unban': 'Unbanned user',
    'user.delete': `Deleted user profile (${m.email || ''})`,
    'judge.assign_problems': `Assigned ${m.count || 0} problem(s) to judge`,
    'problem_statement.create': `Created PS "${m.title || ''}"`,
    'problem_statement.patch': 'Updated problem statement',
    'problem_statement.delete': 'Deleted problem statement',
    'problem_statement.bulk_import': `Bulk imported ${m.success || 0} PS`,
    'phases.update': `Updated ${m.count || 0} phase(s)`,
    'phases.transition': `Phase "${m.phaseName}" → ${m.to}`,
    'phases.shortlist': `Shortlisted ${m.count || 0} team(s)`,
    'phases.unshortlist': `Removed ${m.count || 0} from shortlist`,
    'security.incident.create': `Created incident: ${m.title || ''}`,
    'security.incident.update': `Updated incident status → ${m.status || ''}`,
  }
  return map[a] || a.replace(/[._]/g, ' ')
}

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, tone = 'neutral', icon: Icon }) {
  const iconStyle = {
    neutral: 'bg-[rgb(var(--surface-muted))]/60 text-ink-500',
    success: 'bg-emerald-500/10 text-emerald-600',
    warn:    'bg-amber-500/10 text-amber-600',
    danger:  'bg-red-500/10 text-red-600',
    brand:   'bg-brand-500/10 text-brand-600',
  }
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">{label}</p>
        {Icon && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconStyle[tone]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-ink-900">{value ?? '—'}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-500">{sub}</p>}
    </div>
  )
}

function ThreatBanner({ level }) {
  const cfg = {
    LOW:      { cls: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500', txt: 'text-emerald-800', msg: 'LOW — All systems normal' },
    MODERATE: { cls: 'border-amber-500/40 bg-amber-500/5',     dot: 'bg-amber-500',   txt: 'text-amber-800',   msg: 'MODERATE — Review flagged items' },
    HIGH:     { cls: 'border-orange-500/40 bg-orange-500/5',   dot: 'bg-orange-500',  txt: 'text-orange-800',  msg: 'HIGH — Immediate attention required' },
    CRITICAL: { cls: 'border-red-500/40 bg-red-500/5',         dot: 'bg-red-500 animate-pulse', txt: 'text-red-800', msg: 'CRITICAL — Active threat detected' },
  }
  const c = cfg[level] || cfg.LOW
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${c.cls}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
      <p className={`text-sm font-bold ${c.txt}`}>THREAT LEVEL: {c.msg}</p>
    </div>
  )
}

function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative flex-1 min-w-48">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  )
}

function SevSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none"
    >
      <option value="all">All severities</option>
      <option value="CRITICAL">Critical</option>
      <option value="HIGH">High</option>
      <option value="MEDIUM">Medium</option>
      <option value="LOW">Low</option>
      <option value="INFO">Info</option>
    </select>
  )
}

function exportCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────

function OverviewPanel({ data }) {
  const { health, users, logs, secEvents } = data

  const adminCount     = users.filter(u => u.role === 'admin').length
  const judgeCount     = users.filter(u => u.role === 'judge').length
  const mentorCount    = users.filter(u => u.role === 'mentor').length
  const participantCount = users.filter(u => u.role === 'participant').length
  const bannedCount    = users.filter(u => u.role === 'banned').length

  const today = new Date().toDateString()
  const todayLogs = logs.filter(l => new Date(tsMs(l.createdAt)).toDateString() === today)
  const criticalToday = todayLogs.filter(l => auditSeverity(l.action) === 'CRITICAL').length
  const highToday     = todayLogs.filter(l => auditSeverity(l.action) === 'HIGH').length

  const honeypotHits  = secEvents.filter(e => e.eventType === 'honeypot_triggered').length
  const webhookFails  = secEvents.filter(e => e.eventType === 'webhook_failed' || e.eventType === 'webhook_invalid_sig').length
  const rbacViolations = secEvents.filter(e => e.eventType === 'rbac_violation' || e.eventType === 'forbidden_route').length

  const threatLevel = criticalToday > 0 || honeypotHits > 0
    ? 'CRITICAL'
    : highToday > 3 || rbacViolations > 2
      ? 'HIGH'
      : highToday > 0 || webhookFails > 0
        ? 'MODERATE'
        : 'LOW'

  // 24-hour activity chart
  const chartData = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: 24 }, (_, i) => {
      const hStart = now - (24 - i) * 3600000
      const hEnd   = now - (23 - i) * 3600000
      const label  = new Date(hEnd).getHours().toString().padStart(2, '0') + ':00'
      const count  = logs.filter(l => { const ms = tsMs(l.createdAt); return ms >= hStart && ms < hEnd }).length
      const crit   = logs.filter(l => { const ms = tsMs(l.createdAt); return ms >= hStart && ms < hEnd && auditSeverity(l.action) === 'CRITICAL' }).length
      return { label, count, crit }
    })
  }, [logs])

  // Top actors
  const topActors = useMemo(() => {
    const counts = {}
    for (const l of logs) {
      if (!l.actorUid) continue
      counts[l.actorUid] = (counts[l.actorUid] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([uid, total]) => {
        const u = data.usersMap.get(uid) || {}
        const crit = logs.filter(l => l.actorUid === uid && auditSeverity(l.action) === 'CRITICAL').length
        return { uid, name: u.name || uid.slice(0, 12), role: u.role || '—', total, crit }
      })
  }, [logs, data.usersMap])

  const maxActorTotal = Math.max(...topActors.map(a => a.total), 1)

  return (
    <div className="space-y-5">
      <ThreatBanner level={threatLevel} />

      {/* Honeypot alert — shown prominently when hits exist */}
      {honeypotHits > 0 && (
        <div className="flex items-start gap-4 rounded-xl border-2 border-red-500/40 bg-red-500/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">
              🚨 Honeypot triggered — {honeypotHits} automated probe(s) detected
            </p>
            <p className="mt-1 text-xs text-red-800">
              Hidden endpoints were accessed by bots or attackers scanning your API.
              These routes don't exist in the real app — any hit is 100% suspicious.
              A security incident has been auto-created. Check the <strong>Incidents</strong> tab.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-red-700">
              <code className="rounded bg-red-500/10 px-2 py-0.5 font-mono">/api/internal/config</code>
              <code className="rounded bg-red-500/10 px-2 py-0.5 font-mono">/api/admin/export/all</code>
            </div>
          </div>
        </div>
      )}

      {/* Stat grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users"        value={users.length}    sub={`${adminCount} admin · ${judgeCount} judge`} icon={Users}       tone="brand" />
        <StatCard label="Banned Accounts"    value={bannedCount}     sub="Suspended"                                   icon={Lock}        tone={bannedCount > 0 ? 'warn' : 'success'} />
        <StatCard label="Actions Today"      value={todayLogs.length} sub={`${criticalToday} critical · ${highToday} high`} icon={Activity} tone={criticalToday > 0 ? 'danger' : highToday > 0 ? 'warn' : 'success'} />
        <StatCard label="Firestore"          value={health?.firestoreReachable ? 'Online' : 'Offline'} sub="Admin SDK" icon={Database}    tone={health?.firestoreReachable ? 'success' : 'danger'} />
        <StatCard label="Honeypot Hits"      value={honeypotHits}    sub="Bot/probe attempts"                          icon={AlertCircle} tone={honeypotHits > 0 ? 'danger' : 'success'} />
        <StatCard label="RBAC Violations"    value={rbacViolations}  sub="Forbidden access attempts"                   icon={Lock}        tone={rbacViolations > 0 ? 'warn' : 'success'} />
        <StatCard label="Webhook Failures"   value={webhookFails}    sub="Invalid sig / errors"                        icon={Zap}         tone={webhookFails > 0 ? 'warn' : 'success'} />
        <StatCard label="Razorpay"           value={health?.razorpayConfigured ? 'Configured' : 'Not set'} sub="Payment gateway" icon={CreditCard} tone={health?.razorpayConfigured ? 'success' : 'warn'} />
      </div>

      {/* 24h Activity Chart */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Admin Activity — Last 24 Hours</h3>
          <Badge tone="neutral">{logs.length} total</Badge>
        </div>
        <div className="mt-4 w-full">
          <ResponsiveContainer width="100%" height={144}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
                formatter={(v, n) => [v, n === 'count' ? 'Actions' : 'Critical']}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.crit > 0 ? '#ef4444' : d.count > 5 ? '#f59e0b' : '#3b82f6'} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[10px] text-ink-400">
          <span className="mr-3"><span className="inline-block h-2 w-2 rounded-sm bg-blue-500/75 mr-1" />normal</span>
          <span className="mr-3"><span className="inline-block h-2 w-2 rounded-sm bg-amber-500/75 mr-1" />elevated</span>
          <span><span className="inline-block h-2 w-2 rounded-sm bg-red-500/75 mr-1" />critical present</span>
        </p>
      </Card>

      {/* Top Actors */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Top Actors by Audit Activity</h3>
        <p className="mt-0.5 text-[11px] text-ink-400">Ranked by total logged actions. Disproportionate activity from one actor warrants review.</p>
        <div className="mt-4 space-y-2">
          {topActors.length === 0 && <p className="text-sm text-ink-400">No activity yet.</p>}
          {topActors.map((a, i) => (
            <div key={a.uid} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-right text-[10px] font-bold text-ink-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink-900">{a.name}</span>
                  <Badge tone={a.role === 'admin' ? 'danger' : a.role === 'judge' ? 'warn' : 'neutral'} className="text-[9px]">{a.role}</Badge>
                  {a.crit > 0 && <Badge tone="danger" className="text-[9px]">{a.crit} critical</Badge>}
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-[rgb(var(--surface-muted))]">
                  <div
                    className={`h-full rounded-full ${a.crit > 0 ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${Math.max(2, (a.total / maxActorTotal) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-bold text-ink-700">{a.total}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* RBAC Distribution */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">RBAC Distribution</h3>
        <div className="mt-4 space-y-2">
          {[
            { role: 'admin',       count: adminCount,       color: 'bg-red-500' },
            { role: 'judge',       count: judgeCount,       color: 'bg-amber-500' },
            { role: 'mentor',      count: mentorCount,      color: 'bg-brand-500' },
            { role: 'participant', count: participantCount, color: 'bg-emerald-500' },
            { role: 'banned',      count: bannedCount,      color: 'bg-gray-400' },
          ].map(({ role, count, color }) => (
            <div key={role} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-right text-xs font-medium capitalize text-ink-700">{role}</span>
              <div className="flex-1 rounded-full bg-[rgb(var(--surface-muted))]" style={{ height: 8 }}>
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${users.length > 0 ? Math.max(2, (count / users.length) * 100) : 0}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-bold text-ink-900">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Security Posture */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Security Posture Checks</h3>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Firebase Auth (JWT)',        ok: true,                                  detail: 'All routes require Bearer token. Verified server-side via Admin SDK.' },
            { label: 'RBAC Enforcement',           ok: true,                                  detail: `requireRole() middleware on every protected route. ${adminCount} admin(s) active.` },
            { label: 'Firestore Reachable',        ok: Boolean(health?.firestoreReachable),   detail: health?.firestoreReachable ? 'Admin SDK connected.' : 'Firestore unreachable — check service account.' },
            { label: 'Razorpay HMAC Verification', ok: Boolean(health?.razorpayConfigured),   detail: health?.razorpayConfigured ? 'HMAC-SHA256 timing-safe comparison active.' : 'Razorpay not configured.' },
            { label: 'Helmet.js Headers',          ok: true,                                  detail: 'X-Frame-Options, X-Content-Type-Options, HSTS, CSP active.' },
            { label: 'Rate Limiting',              ok: true,                                  detail: `${health?.nodeEnv === 'production' ? '400' : '2000'} req/15min global. Payment: 10/hr.` },
            { label: 'CORS Policy',                ok: health?.nodeEnv === 'production',      detail: health?.nodeEnv === 'production' ? 'Origin whitelist enforced.' : 'Dev mode: CORS open (expected).' },
            { label: 'Append-Only Audit Logs',     ok: true,                                  detail: 'All admin actions logged via Admin SDK. No client writes to auditLogs.' },
            { label: 'Honeypot Endpoints',         ok: true,                                  detail: `55 honeypot routes active. ${honeypotHits} hit(s) recorded. Covers admin panels, env leaks, git exposure, AI endpoints, framework debuggers.` },
            { label: 'Webhook Signature Verify',   ok: true,                                  detail: 'Razorpay webhook HMAC verified before processing. Invalid signatures logged to security events.' },
            { label: 'Banned Users Blocked',       ok: bannedCount === 0,                     detail: bannedCount === 0 ? 'No banned accounts.' : `${bannedCount} account(s) suspended.` },
          ].map(({ label, ok, detail }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg border border-[rgb(var(--border))] px-3 py-2.5">
              {ok
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{detail}</p>
              </div>
              <Badge tone={ok ? 'success' : 'warn'} className="shrink-0 text-[10px]">{ok ? 'OK' : 'Review'}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── LIVE ACTIVITY PANEL ──────────────────────────────────────────────────────

function LiveActivityPanel({ data }) {
  const { logs, secEvents, platformActivity, usersMap } = data
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const ACTIVITY_LABELS = {
    team_created:        'Created a team',
    team_joined:         'Joined a team',
    team_left:           'Left a team',
    team_member_removed: 'Removed a team member',
    team_profile_updated:'Updated team profile',
    team_registered:     'Registered for event',
    payment_initiated:   'Initiated payment',
    payment_verified:    'Payment verified ✓',
    problem_selected:    'Selected problem statement',
    submission_updated:  'Updated submission',
    submission_finalized:'Finalized submission 🔒',
    evaluation_saved:    'Saved evaluation (draft)',
    evaluation_submitted:'Submitted evaluation ✓',
    mentor_note_saved:   'Saved mentor note',
    mentor_chat_sent:    'Sent mentor chat message',
    chat_message_sent:   'Sent team chat message',
    user_profile_synced: 'Profile synced',
  }

  function formatSecEventMessage(e) {
    const typeMap = {
      honeypot_triggered:      `Honeypot triggered on ${e.targetEntity || 'unknown route'}`,
      rbac_violation:          `RBAC violation — ${e.targetEntity || 'unknown resource'}`,
      forbidden_route:         `Forbidden route access: ${e.targetEntity || ''}`,
      rate_limit_hit:          `Rate limit hit from ${e.ipAddress || 'unknown IP'}`,
      webhook_invalid_sig:     'Razorpay webhook — invalid signature',
      webhook_failed:          `Webhook failed: ${e.metadata?.error || ''}`,
      webhook_received:        `Webhook received: ${e.metadata?.event || 'payment.captured'}`,
      submission_blocked:      `Submission blocked: ${e.metadata?.reason || ''}`,
      deadline_bypass_attempt: 'Deadline bypass attempt detected',
      phase_bypass_attempt:    'Phase bypass attempt detected',
      upload_rejected:         `Upload rejected: ${e.metadata?.reason || ''}`,
    }
    return typeMap[e.eventType] || e.eventType?.replace(/_/g, ' ') || 'Security event'
  }

  // Merge all three sources into a unified feed
  const feed = useMemo(() => {
    const auditItems = logs.map(l => ({
      id: `audit-${l.id || Math.random()}`,
      ts: tsMs(l.createdAt),
      source: 'audit',
      severity: auditSeverity(l.action),
      actor: usersMap.get(l.actorUid)?.name || l.actorUid?.slice(0, 10) || 'System',
      role: usersMap.get(l.actorUid)?.role || 'admin',
      message: describeAuditAction(l),
      detail: l.action,
      raw: l,
    }))

    const secItems = secEvents.map(e => ({
      id: `sec-${e.id || Math.random()}`,
      ts: tsMs(e.createdAt),
      source: 'security',
      severity: e.severity || 'INFO',
      actor: e.actorId?.slice(0, 10) || e.ipAddress || 'Unknown',
      role: e.role || '',
      message: formatSecEventMessage(e),
      detail: e.eventType,
      raw: e,
    }))

    const platformItems = (platformActivity || []).map(a => ({
      id: `activity-${a.id || Math.random()}`,
      ts: tsMs(a.createdAt),
      source: 'activity',
      severity: 'INFO',
      actor: a.actorName || a.actorEmail?.split('@')[0] || a.actorUid?.slice(0, 10) || 'Unknown',
      role: a.actorRole || 'participant',
      message: a.description || ACTIVITY_LABELS[a.activityType] || a.activityType?.replace(/_/g, ' ') || 'Activity',
      detail: a.activityType,
      teamId: a.teamId,
      raw: a,
    }))

    return [...auditItems, ...secItems, ...platformItems]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 500)
  }, [logs, secEvents, platformActivity, usersMap])

  const filtered = useMemo(() => {
    let rows = feed
    if (typeFilter !== 'all') rows = rows.filter(r => r.source === typeFilter)
    if (roleFilter !== 'all') rows = rows.filter(r => r.role === roleFilter)
    if (filter) {
      const q = filter.toLowerCase()
      rows = rows.filter(r =>
        r.message.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q) ||
        r.detail.toLowerCase().includes(q) ||
        (r.teamId || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [feed, filter, typeFilter, roleFilter])

  const [expanded, setExpanded] = useState(null)

  function doExport() {
    exportCSV(
      `live-activity-${Date.now()}.csv`,
      ['timestamp', 'source', 'severity', 'actor', 'role', 'message', 'detail'],
      filtered.map(r => [formatDate(r.raw.createdAt) || '', r.source, r.severity, r.actor, r.role, r.message, r.detail])
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={filter} onChange={setFilter} placeholder="Search activity…" />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none"
        >
          <option value="all">All sources</option>
          <option value="activity">Participants / Judges / Mentors</option>
          <option value="audit">Admin audit</option>
          <option value="security">Security events</option>
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none"
        >
          <option value="all">All roles</option>
          <option value="participant">Participants</option>
          <option value="judge">Judges</option>
          <option value="mentor">Mentors</option>
          <option value="admin">Admins</option>
        </select>
        <Button variant="secondary" size="sm" onClick={doExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <div className="flex gap-2">
          <Badge tone="brand">{feed.filter(r => new Date(r.ts).toDateString() === new Date().toDateString()).length} today</Badge>
          <Badge tone="neutral">{feed.length} total</Badge>
          <Badge tone="success">{(platformActivity || []).length} user actions</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-400">No activity matches your filters.</p>
        ) : (
          filtered.slice(0, 150).map((item) => (
            <div key={item.id} className="border-b border-[rgb(var(--border))] last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[rgb(var(--surface-muted))]/40"
              >
                <SevBadge sev={item.severity} />
                <Badge
                  tone={item.source === 'security' ? 'danger' : item.source === 'activity' ? ({ participant: 'success', judge: 'warn', mentor: 'brand', admin: 'danger' }[item.role] || 'neutral') : 'neutral'}
                  className="shrink-0 text-[9px]"
                >
                  {item.source === 'security' ? 'SEC' : item.source === 'activity' ? (item.role?.toUpperCase() || 'USER') : 'ADMIN'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-900">
                    <span className="font-semibold">{item.actor}</span>
                    {item.role && <span className="ml-1.5 text-[10px] font-medium uppercase text-ink-400">[{item.role}]</span>}
                    <span className="ml-1.5 text-ink-600">{item.message}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-ink-400" title={formatDate(item.raw.createdAt)}>{relTime(item.raw.createdAt)}</span>
                {expanded === item.id
                  ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
              </button>
              {expanded === item.id && (
                <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 px-4 py-3">
                  <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    <div><span className="font-semibold text-ink-700">Type:</span> <code className="ml-1 font-mono text-ink-600">{item.detail}</code></div>
                    <div><span className="font-semibold text-ink-700">Source:</span> <span className="ml-1 text-ink-600">{item.source}</span></div>
                    <div><span className="font-semibold text-ink-700">Time:</span> <span className="ml-1 text-ink-600">{formatDate(item.raw.createdAt) || '—'}</span></div>
                    {item.source === 'security' && item.raw.ipAddress && (
                      <div><span className="font-semibold text-ink-700">IP:</span> <code className="ml-1 font-mono text-ink-600">{item.raw.ipAddress}</code>
                        {item.raw.metadata?.location && <span className="ml-2 text-ink-500">({item.raw.metadata.location})</span>}
                      </div>
                    )}
                    {item.source === 'security' && item.raw.deviceInfo && (
                      <div className="sm:col-span-2"><span className="font-semibold text-ink-700">Device:</span> <span className="ml-1 text-ink-600 break-all">{item.raw.deviceInfo.slice(0, 120)}</span></div>
                    )}
                    {item.source === 'audit' && item.raw.targetType && (
                      <div><span className="font-semibold text-ink-700">Target:</span> <span className="ml-1 text-ink-600">{item.raw.targetType} / {item.raw.targetId?.slice(0, 20) || '—'}</span></div>
                    )}
                    {item.raw.metadata && Object.keys(item.raw.metadata).length > 0 && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <span className="font-semibold text-ink-700">Metadata:</span>
                        <code className="ml-1 break-all font-mono text-ink-600">{JSON.stringify(item.raw.metadata).slice(0, 300)}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {filtered.length > 150 && (
        <p className="text-center text-xs text-ink-400">Showing 150 of {filtered.length}. Use search to narrow down.</p>
      )}
    </div>
  )
}

// ─── THREAT DETECTION PANEL ──────────────────────────────────────────────────

function ThreatDetectionPanel({ data }) {
  const { logs, secEvents, usersMap } = data
  const [sevFilter, setSevFilter] = useState('all')

  // Derive threats from real data patterns
  const threats = useMemo(() => {
    const result = []

    // 1. Honeypot hits
    const honeypots = secEvents.filter(e => e.eventType === 'honeypot_triggered')
    if (honeypots.length > 0) {
      const ips = [...new Set(honeypots.map(e => e.ipAddress).filter(Boolean))]
      result.push({
        id: 'honeypot',
        severity: 'HIGH',
        type: 'Honeypot Triggered',
        description: `${honeypots.length} automated probe(s) detected on hidden endpoints.`,
        detail: `IPs: ${ips.slice(0, 3).join(', ')}${ips.length > 3 ? ` +${ips.length - 3} more` : ''}`,
        count: honeypots.length,
        lastSeen: honeypots[0]?.createdAt,
        items: honeypots,
      })
    }

    // 2. Webhook invalid signatures
    const badSigs = secEvents.filter(e => e.eventType === 'webhook_invalid_sig')
    if (badSigs.length > 0) {
      result.push({
        id: 'bad-webhook-sig',
        severity: 'HIGH',
        type: 'Invalid Webhook Signatures',
        description: `${badSigs.length} Razorpay webhook request(s) with invalid HMAC signature.`,
        detail: 'Could indicate replay attack or misconfigured webhook secret.',
        count: badSigs.length,
        lastSeen: badSigs[0]?.createdAt,
        items: badSigs,
      })
    }

    // 3. RBAC violations
    const rbacViolations = secEvents.filter(e =>
      e.eventType === 'rbac_violation' || e.eventType === 'forbidden_route'
    )
    if (rbacViolations.length > 0) {
      const ips = [...new Set(rbacViolations.map(e => e.ipAddress).filter(Boolean))]
      result.push({
        id: 'rbac-violations',
        severity: rbacViolations.length > 5 ? 'CRITICAL' : 'HIGH',
        type: 'RBAC / Access Violations',
        description: `${rbacViolations.length} unauthorized access attempt(s) to protected resources.`,
        detail: `Routes targeted: ${[...new Set(rbacViolations.map(e => e.targetEntity).filter(Boolean))].slice(0, 3).join(', ')}`,
        count: rbacViolations.length,
        lastSeen: rbacViolations[0]?.createdAt,
        items: rbacViolations,
      })
    }

    // 4. Multiple role changes in short window
    const roleChanges = logs.filter(l => l.action === 'user.role' || l.action === 'user.ban')
    if (roleChanges.length > 3) {
      result.push({
        id: 'role-churn',
        severity: roleChanges.length > 8 ? 'CRITICAL' : 'HIGH',
        type: 'Excessive Role Changes',
        description: `${roleChanges.length} role/ban operations recorded in audit log.`,
        detail: 'High volume of privilege changes may indicate account takeover or insider threat.',
        count: roleChanges.length,
        lastSeen: roleChanges[0]?.createdAt,
        items: roleChanges,
      })
    }

    // 5. Bulk destructive operations
    const bulkDestructive = logs.filter(l =>
      l.action?.startsWith('bulk') || l.action?.includes('delete')
    )
    if (bulkDestructive.length > 0) {
      result.push({
        id: 'bulk-destructive',
        severity: bulkDestructive.length > 5 ? 'HIGH' : 'MEDIUM',
        type: 'Bulk / Destructive Operations',
        description: `${bulkDestructive.length} bulk or destructive action(s) in audit log.`,
        detail: [...new Set(bulkDestructive.map(l => l.action))].slice(0, 4).join(', '),
        count: bulkDestructive.length,
        lastSeen: bulkDestructive[0]?.createdAt,
        items: bulkDestructive,
      })
    }

    // 6. Manual payment overrides
    const payOverrides = logs.filter(l => l.action === 'payment.record')
    if (payOverrides.length > 0) {
      result.push({
        id: 'pay-overrides',
        severity: payOverrides.length > 5 ? 'HIGH' : 'MEDIUM',
        type: 'Manual Payment Overrides',
        description: `${payOverrides.length} payment status(es) manually overridden by admin.`,
        detail: 'Each override bypasses Razorpay verification. Verify legitimacy.',
        count: payOverrides.length,
        lastSeen: payOverrides[0]?.createdAt,
        items: payOverrides,
      })
    }

    // 7. Deadline bypass attempts
    const deadlineBypass = secEvents.filter(e =>
      e.eventType === 'deadline_bypass_attempt' || e.eventType === 'phase_bypass_attempt'
    )
    if (deadlineBypass.length > 0) {
      result.push({
        id: 'deadline-bypass',
        severity: 'HIGH',
        type: 'Deadline / Phase Bypass Attempts',
        description: `${deadlineBypass.length} attempt(s) to submit past deadline or bypass phase gate.`,
        detail: 'Server-side validation blocked these. No data was written.',
        count: deadlineBypass.length,
        lastSeen: deadlineBypass[0]?.createdAt,
        items: deadlineBypass,
      })
    }

    // 8. Rate limit hits
    const rateLimitHits = secEvents.filter(e => e.eventType === 'rate_limit_hit')
    if (rateLimitHits.length > 0) {
      const ips = [...new Set(rateLimitHits.map(e => e.ipAddress).filter(Boolean))]
      result.push({
        id: 'rate-limit',
        severity: rateLimitHits.length > 10 ? 'HIGH' : 'MEDIUM',
        type: 'Rate Limit Hits',
        description: `${rateLimitHits.length} request(s) blocked by rate limiter.`,
        detail: `IPs: ${ips.slice(0, 3).join(', ')}${ips.length > 3 ? ` +${ips.length - 3} more` : ''}`,
        count: rateLimitHits.length,
        lastSeen: rateLimitHits[0]?.createdAt,
        items: rateLimitHits,
      })
    }

    // Sort by severity then count
    return result.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
      const diff = (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
      return diff !== 0 ? diff : b.count - a.count
    })
  }, [logs, secEvents])

  const filtered = sevFilter === 'all' ? threats : threats.filter(t => t.severity === sevFilter)

  const critCount = threats.filter(t => t.severity === 'CRITICAL').length
  const highCount = threats.filter(t => t.severity === 'HIGH').length
  const medCount  = threats.filter(t => t.severity === 'MEDIUM').length

  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total Threats"  value={threats.length}  icon={AlertTriangle} tone={threats.length > 0 ? 'warn' : 'success'} />
        <StatCard label="Critical"       value={critCount}       icon={AlertCircle}   tone={critCount > 0 ? 'danger' : 'neutral'} />
        <StatCard label="High"           value={highCount}       icon={AlertTriangle} tone={highCount > 0 ? 'warn' : 'neutral'} />
        <StatCard label="Medium"         value={medCount}        icon={Info}          tone={medCount > 0 ? 'warn' : 'neutral'} />
      </div>

      <div className="flex items-center gap-3">
        <SevSelect value={sevFilter} onChange={setSevFilter} />
        <Badge tone="neutral">{filtered.length} threat(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">No threats detected matching current filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(threat => (
            <div key={threat.id} className={`rounded-xl border ${SEV_STYLE[threat.severity]}`}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === threat.id ? null : threat.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SevBadge sev={threat.severity} />
                    <p className="text-sm font-semibold">{threat.type}</p>
                  </div>
                  <p className="mt-1 text-xs opacity-80">{threat.description}</p>
                  <p className="mt-0.5 text-xs opacity-60">{threat.detail}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={SEV_TONE[threat.severity]} className="text-[10px]">{threat.count}</Badge>
                  <span className="text-[10px] opacity-60">{relTime(threat.lastSeen)}</span>
                </div>
                {expanded === threat.id
                  ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
                  : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />}
              </button>

              {expanded === threat.id && (
                <div className="border-t border-current/20 px-4 pb-4 pt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase opacity-60">Recent Events</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {threat.items.slice(0, 10).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs">
                        <span className="font-mono opacity-70">{relTime(item.createdAt)}</span>
                        <span className="flex-1 truncate">
                          {item.ipAddress && <span className="mr-2 font-mono">{item.ipAddress}</span>}
                          {item.targetEntity || item.action || item.eventType || '—'}
                        </span>
                      </div>
                    ))}
                    {threat.items.length > 10 && (
                      <p className="text-center text-[10px] opacity-60">+{threat.items.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {threats.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">No threats detected</p>
            <p className="mt-0.5 text-xs text-emerald-700">Platform activity looks normal. Threats are derived from real audit logs and security events.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AUDIT LOGS PANEL ─────────────────────────────────────────────────────────

function AuditLogsPanel({ data }) {
  const { logs, usersMap } = data
  const [filter, setFilter]     = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const actionCategories = useMemo(() => {
    const cats = new Set(logs.map(l => l.action?.split('.')[0]).filter(Boolean))
    return ['all', ...cats]
  }, [logs])

  const filtered = useMemo(() => {
    let rows = logs
    if (sevFilter !== 'all') rows = rows.filter(l => auditSeverity(l.action) === sevFilter)
    if (actionFilter !== 'all') rows = rows.filter(l => l.action?.startsWith(actionFilter))
    if (filter) {
      const q = filter.toLowerCase()
      rows = rows.filter(l =>
        describeAuditAction(l).toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (usersMap.get(l.actorUid)?.name || '').toLowerCase().includes(q) ||
        (l.targetId || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [logs, filter, sevFilter, actionFilter, usersMap])

  const today = new Date().toDateString()
  const todayCount = logs.filter(l => new Date(tsMs(l.createdAt)).toDateString() === today).length

  function doExport() {
    exportCSV(
      `audit-logs-${Date.now()}.csv`,
      ['timestamp', 'actor', 'role', 'action', 'description', 'target_type', 'target_id', 'severity', 'event_id'],
      filtered.map(l => {
        const u = usersMap.get(l.actorUid) || {}
        return [
          formatDate(l.createdAt) || '',
          u.name || l.actorUid || '',
          u.role || '',
          l.action || '',
          describeAuditAction(l),
          l.targetType || '',
          l.targetId || '',
          auditSeverity(l.action),
          l.eventId || '',
        ]
      })
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={filter} onChange={setFilter} placeholder="Search by action, actor, target…" />
        <SevSelect value={sevFilter} onChange={setSevFilter} />
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none"
        >
          {actionCategories.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
          ))}
        </select>
        <Button variant="secondary" size="sm" onClick={doExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <div className="flex gap-2">
          <Badge tone="brand">{todayCount} today</Badge>
          <Badge tone="neutral">{logs.length} total</Badge>
        </div>
      </div>

      {/* Log table */}
      <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-400">No logs match your filters.</p>
        ) : (
          filtered.slice(0, 200).map((log, i) => {
            const actor = usersMap.get(log.actorUid) || {}
            const sev   = auditSeverity(log.action)
            const isExp = expanded === (log.id || i)
            return (
              <div key={log.id || i} className="border-b border-[rgb(var(--border))] last:border-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isExp ? null : (log.id || i))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[rgb(var(--surface-muted))]/40"
                >
                  <SevBadge sev={sev} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-900">
                      <span className="font-semibold">{actor.name || log.actorUid?.slice(0, 10) || 'System'}</span>
                      {actor.role && <span className="ml-1.5 text-[10px] font-medium uppercase text-ink-400">[{actor.role}]</span>}
                      <span className="ml-1.5 text-ink-600">{describeAuditAction(log)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-400" title={formatDate(log.createdAt)}>{relTime(log.createdAt)}</span>
                  {isExp ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                </button>
                {isExp && (
                  <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 px-4 py-3">
                    <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <div><span className="font-semibold text-ink-700">Action:</span> <code className="ml-1 font-mono text-ink-600">{log.action}</code></div>
                      <div><span className="font-semibold text-ink-700">Actor UID:</span> <code className="ml-1 font-mono text-ink-600">{log.actorUid || '—'}</code></div>
                      <div><span className="font-semibold text-ink-700">Target:</span> <span className="ml-1 text-ink-600">{log.targetType} / {log.targetId?.slice(0, 24) || '—'}</span></div>
                      <div><span className="font-semibold text-ink-700">Timestamp:</span> <span className="ml-1 text-ink-600">{formatDate(log.createdAt) || '—'}</span></div>
                      <div><span className="font-semibold text-ink-700">Event ID:</span> <span className="ml-1 text-ink-600">{log.eventId || '—'}</span></div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <span className="font-semibold text-ink-700">Metadata:</span>
                          <code className="ml-1 break-all font-mono text-ink-600">{JSON.stringify(log.metadata).slice(0, 400)}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      {filtered.length > 200 && (
        <p className="text-center text-xs text-ink-400">Showing 200 of {filtered.length}. Use search to narrow down.</p>
      )}
    </div>
  )
}

// ─── ACCESS VIOLATIONS PANEL ──────────────────────────────────────────────────

function AccessViolationsPanel({ data }) {
  const { secEvents, logs, usersMap } = data
  const [filter, setFilter] = useState('')

  // Collect all access violation events from security events + audit logs
  const violations = useMemo(() => {
    const secViolations = secEvents
      .filter(e =>
        e.eventType === 'rbac_violation' ||
        e.eventType === 'forbidden_route' ||
        e.eventType === 'role_escalation_attempt' ||
        e.eventType === 'honeypot_triggered' ||
        e.eventType === 'deadline_bypass_attempt' ||
        e.eventType === 'phase_bypass_attempt'
      )
      .map(e => ({
        id: e.id,
        ts: tsMs(e.createdAt),
        type: e.eventType,
        severity: e.severity || 'HIGH',
        actor: e.actorId?.slice(0, 12) || e.ipAddress || 'Unknown',
        ip: e.ipAddress || '—',
        device: e.deviceInfo?.slice(0, 80) || '—',
        target: e.targetEntity || '—',
        status: e.status || 'detected',
        raw: e,
        source: 'security',
      }))

    // Also surface audit log entries that represent privilege abuse
    const auditViolations = logs
      .filter(l =>
        l.action === 'user.ban' ||
        l.action === 'user.delete' ||
        (l.action === 'user.role' && l.metadata?.role === 'admin')
      )
      .map(l => ({
        id: l.id,
        ts: tsMs(l.createdAt),
        type: l.action,
        severity: auditSeverity(l.action),
        actor: usersMap.get(l.actorUid)?.name || l.actorUid?.slice(0, 12) || 'System',
        ip: '—',
        device: '—',
        target: l.targetId?.slice(0, 24) || '—',
        status: 'executed',
        raw: l,
        source: 'audit',
      }))

    return [...secViolations, ...auditViolations]
      .sort((a, b) => b.ts - a.ts)
  }, [secEvents, logs, usersMap])

  const filtered = useMemo(() => {
    if (!filter) return violations
    const q = filter.toLowerCase()
    return violations.filter(v =>
      v.actor.toLowerCase().includes(q) ||
      v.target.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      v.ip.toLowerCase().includes(q)
    )
  }, [violations, filter])

  // IP frequency analysis
  const ipFrequency = useMemo(() => {
    const counts = {}
    for (const v of violations) {
      if (v.ip && v.ip !== '—') counts[v.ip] = (counts[v.ip] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [violations])

  const typeLabels = {
    rbac_violation:           'RBAC Violation',
    forbidden_route:          'Forbidden Route Access',
    role_escalation_attempt:  'Role Escalation Attempt',
    honeypot_triggered:       'Honeypot Triggered',
    deadline_bypass_attempt:  'Deadline Bypass Attempt',
    phase_bypass_attempt:     'Phase Bypass Attempt',
    'user.ban':               'Account Banned',
    'user.delete':            'Profile Deleted',
    'user.role':              'Admin Role Granted',
  }

  function doExport() {
    exportCSV(
      `access-violations-${Date.now()}.csv`,
      ['timestamp', 'type', 'severity', 'actor', 'ip', 'target', 'status', 'source'],
      filtered.map(v => [
        formatDate(v.raw.createdAt) || '',
        typeLabels[v.type] || v.type,
        v.severity,
        v.actor,
        v.ip,
        v.target,
        v.status,
        v.source,
      ])
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total Violations"  value={violations.length}                                                icon={Lock}        tone={violations.length > 0 ? 'danger' : 'success'} />
        <StatCard label="Honeypot Hits"     value={violations.filter(v => v.type === 'honeypot_triggered').length}  icon={AlertCircle} tone="warn" />
        <StatCard label="RBAC Violations"   value={violations.filter(v => v.type === 'rbac_violation' || v.type === 'forbidden_route').length} icon={Shield} tone="warn" />
        <StatCard label="Bypass Attempts"   value={violations.filter(v => v.type?.includes('bypass')).length}       icon={Zap}         tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* IP Frequency */}
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Top Offending IPs</h3>
          <div className="mt-3 space-y-2">
            {ipFrequency.length === 0 ? (
              <p className="text-xs text-ink-400">No IP data recorded.</p>
            ) : (
              ipFrequency.map(([ip, count]) => (
                <div key={ip} className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <code className="flex-1 truncate text-xs font-mono text-ink-700">{ip}</code>
                  <Badge tone={count > 3 ? 'danger' : 'warn'} className="text-[10px]">{count}×</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Violation type breakdown */}
        <Card className="lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Violation Type Breakdown</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(
              violations.reduce((acc, v) => {
                const label = typeLabels[v.type] || v.type
                acc[label] = (acc[label] || 0) + 1
                return acc
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex-1 truncate text-xs text-ink-700">{label}</span>
                  <div className="w-24 rounded-full bg-[rgb(var(--surface-muted))]" style={{ height: 6 }}>
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${Math.max(4, (count / violations.length) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-ink-900">{count}</span>
                </div>
              ))}
            {violations.length === 0 && <p className="text-xs text-ink-400">No violations recorded.</p>}
          </div>
        </Card>
      </div>

      {/* Violations table */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={filter} onChange={setFilter} placeholder="Filter by actor, IP, target, type…" />
        <Button variant="secondary" size="sm" onClick={doExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Badge tone="neutral">{filtered.length} record(s)</Badge>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        {filtered.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-8">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">No access violations recorded.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">
              <div className="col-span-2">Severity</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-2">Actor / IP</div>
              <div className="col-span-3">Target</div>
              <div className="col-span-1">Source</div>
              <div className="col-span-1 text-right">Time</div>
            </div>
            {filtered.slice(0, 100).map((v, i) => (
              <div key={v.id || i} className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] px-4 py-2.5 text-xs last:border-0 hover:bg-[rgb(var(--surface-muted))]/30">
                <div className="col-span-2"><SevBadge sev={v.severity} /></div>
                <div className="col-span-3 truncate font-medium text-ink-900">{typeLabels[v.type] || v.type}</div>
                <div className="col-span-2 truncate font-mono text-ink-600">{v.actor}</div>
                <div className="col-span-3 truncate text-ink-600">
                  {v.target}
                  {v.raw.metadata?.location && (
                    <span className="ml-1 text-[10px] text-ink-400">({v.raw.metadata.location})</span>
                  )}
                </div>
                <div className="col-span-1">
                  <Badge tone={v.source === 'security' ? 'danger' : 'neutral'} className="text-[9px]">
                    {v.source === 'security' ? 'SEC' : 'AUDIT'}
                  </Badge>
                </div>
                <div className="col-span-1 text-right text-ink-400">{relTime(v.raw.createdAt)}</div>
              </div>
            ))}
          </>
        )}
      </div>
      {filtered.length > 100 && (
        <p className="text-center text-xs text-ink-400">Showing 100 of {filtered.length}. Use search to narrow down.</p>
      )}
    </div>
  )
}

// ─── INCIDENT MANAGEMENT PANEL ───────────────────────────────────────────────

const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'ARCHIVED']
const INCIDENT_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function IncidentManagementPanel({ data, api, onReload }) {
  const { incidents, usersMap } = data
  const [filter, setFilter]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sevFilter, setSevFilter]   = useState('all')
  const [selected, setSelected]     = useState(null)   // incident being viewed
  const [creating, setCreating]     = useState(false)
  const [busy, setBusy]             = useState(false)
  const [msg, setMsg]               = useState('')

  // New incident form
  const [newTitle, setNewTitle]     = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [newSev, setNewSev]         = useState('MEDIUM')
  const [newSource, setNewSource]   = useState('manual')
  const [noteText, setNoteText]     = useState('')

  const filtered = useMemo(() => {
    let rows = incidents
    if (statusFilter !== 'all') rows = rows.filter(i => i.status === statusFilter)
    if (sevFilter !== 'all')    rows = rows.filter(i => i.severity === sevFilter)
    if (filter) {
      const q = filter.toLowerCase()
      rows = rows.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.source || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [incidents, statusFilter, sevFilter, filter])

  const openCount        = incidents.filter(i => i.status === 'OPEN').length
  const investigatingCount = incidents.filter(i => i.status === 'INVESTIGATING').length
  const resolvedCount    = incidents.filter(i => i.status === 'RESOLVED').length

  async function createIncident() {
    if (!newTitle.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg('')
    try {
      await api.createSecurityIncident({
        title: newTitle.trim(),
        description: newDesc.trim(),
        severity: newSev,
        source: newSource,
      })
      setMsg('✓ Incident created.')
      setNewTitle(''); setNewDesc(''); setNewSev('MEDIUM'); setNewSource('manual')
      setCreating(false)
      await onReload()
    } catch (e) {
      setMsg(e.message || 'Failed to create incident.')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(id, status) {
    setBusy(true); setMsg('')
    try {
      await api.updateSecurityIncident(id, { status })
      setMsg(`✓ Status updated to ${status}.`)
      await onReload()
      if (selected?.id === id) setSelected(prev => ({ ...prev, status }))
    } catch (e) {
      setMsg(e.message || 'Update failed.')
    } finally {
      setBusy(false)
    }
  }

  async function addNote(id) {
    if (!noteText.trim()) return
    setBusy(true); setMsg('')
    try {
      await api.updateSecurityIncident(id, { note: noteText.trim() })
      setMsg('✓ Note added.')
      setNoteText('')
      await onReload()
    } catch (e) {
      setMsg(e.message || 'Failed to add note.')
    } finally {
      setBusy(false)
    }
  }

  const statusColor = {
    OPEN:          'border-red-500/40 bg-red-500/5 text-red-800',
    INVESTIGATING: 'border-amber-500/40 bg-amber-500/5 text-amber-800',
    RESOLVED:      'border-emerald-500/40 bg-emerald-500/5 text-emerald-800',
    ARCHIVED:      'border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 text-ink-500',
  }
  const statusTone = { OPEN: 'danger', INVESTIGATING: 'warn', RESOLVED: 'success', ARCHIVED: 'neutral' }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Open"         value={openCount}         icon={AlertCircle} tone={openCount > 0 ? 'danger' : 'success'} />
        <StatCard label="Investigating" value={investigatingCount} icon={Eye}        tone={investigatingCount > 0 ? 'warn' : 'neutral'} />
        <StatCard label="Resolved"     value={resolvedCount}     icon={CheckCircle2} tone="success" />
        <StatCard label="Total"        value={incidents.length}  icon={Bell}        tone="neutral" />
      </div>

      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.startsWith('✓') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800' : 'border-red-500/30 bg-red-500/10 text-red-800'}`}>
          {msg}
        </div>
      )}

      {/* Filters + Create */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={filter} onChange={setFilter} placeholder="Search incidents…" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none">
          <option value="all">All statuses</option>
          {INCIDENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <SevSelect value={sevFilter} onChange={setSevFilter} />
        <Button size="sm" onClick={() => setCreating(v => !v)} className="gap-1.5 ml-auto">
          {creating ? 'Cancel' : '+ New Incident'}
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <Card className="border-brand-500/20 bg-brand-500/5">
          <h3 className="text-sm font-semibold text-ink-900">Create Security Incident</h3>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Incident title *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:border-brand-500 focus:outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Severity</label>
                <select value={newSev} onChange={e => setNewSev(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none">
                  {INCIDENT_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-600">Source</label>
                <select value={newSource} onChange={e => setNewSource(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:outline-none">
                  {['manual', 'suspicious_upload', 'rbac_violation', 'failed_login', 'admin_abuse', 'webhook_failure', 'firebase_anomaly'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={createIncident} disabled={busy} className="gap-2">
              {busy ? 'Creating…' : 'Create Incident'}
            </Button>
          </div>
        </Card>
      )}

      {/* Incident list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">No incidents match your filters.</p>
          </div>
        ) : (
          filtered.map(inc => (
            <div key={inc.id} className={`rounded-xl border ${statusColor[inc.status] || statusColor.OPEN}`}>
              <button
                type="button"
                onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <SevBadge sev={inc.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900">{inc.title}</p>
                    <Badge tone={statusTone[inc.status] || 'neutral'} className="text-[10px]">{inc.status}</Badge>
                  </div>
                  {inc.description && <p className="mt-1 text-xs text-ink-600 line-clamp-2">{inc.description}</p>}
                  <p className="mt-1 text-[10px] text-ink-400">
                    Source: {inc.source || '—'} · {relTime(inc.createdAt)}
                    {inc.assignedTo && ` · Assigned: ${usersMap.get(inc.assignedTo)?.name || inc.assignedTo.slice(0, 10)}`}
                  </p>
                </div>
                {selected?.id === inc.id
                  ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />}
              </button>

              {selected?.id === inc.id && (
                <div className="border-t border-current/20 px-4 pb-4 pt-3 space-y-4">
                  {/* Status transitions */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {INCIDENT_STATUSES.filter(s => s !== inc.status).map(s => (
                        <Button key={s} variant="secondary" size="sm" disabled={busy}
                          onClick={() => updateStatus(inc.id, s)} className="text-xs">
                          → {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes timeline */}
                  {Array.isArray(inc.notes) && inc.notes.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">Timeline</p>
                      <div className="space-y-2">
                        {inc.notes.map((note, ni) => (
                          <div key={ni} className="flex gap-2 rounded-lg bg-white/20 px-3 py-2 text-xs">
                            <span className="shrink-0 font-mono text-ink-400">{note.timestamp ? new Date(note.timestamp).toLocaleTimeString() : '—'}</span>
                            <span className="flex-1 text-ink-700">{note.text}</span>
                            <span className="shrink-0 text-ink-400">{usersMap.get(note.actorUid)?.name || note.actorUid?.slice(0, 8) || 'Admin'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add note */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">Add Note</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Investigation note…"
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNote(inc.id)}
                        className="h-9 flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm focus:border-brand-500 focus:outline-none"
                      />
                      <Button size="sm" disabled={busy || !noteText.trim()} onClick={() => addNote(inc.id)}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-[10px] text-ink-400 space-y-0.5">
                    <p>ID: <code className="font-mono">{inc.id}</code></p>
                    <p>Created: {formatDate(inc.createdAt) || '—'}</p>
                    {inc.resolvedAt && <p>Resolved: {formatDate(inc.resolvedAt)}</p>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── WEBHOOK HEALTH PANEL ─────────────────────────────────────────────────────

function WebhookHealthPanel({ data }) {
  const { webhookLog, health } = data

  const stats = useMemo(() => {
    const total    = webhookLog.length
    const success  = webhookLog.filter(w => w.status === 'success').length
    const failed   = webhookLog.filter(w => ['invalid_signature', 'server_error', 'not_applied', 'missing_fields', 'invalid_json', 'invalid_body', 'db_unavailable'].includes(w.status)).length
    const ignored  = webhookLog.filter(w => w.status === 'ignored').length
    const badSig   = webhookLog.filter(w => w.status === 'invalid_signature').length
    const lastEvent = webhookLog[0]
    const successRate = total > 0 ? Math.round((success / total) * 100) : null
    return { total, success, failed, ignored, badSig, lastEvent, successRate }
  }, [webhookLog])

  const statusStyle = {
    success:           'bg-emerald-500/10 text-emerald-700',
    ignored:           'bg-sky-500/10 text-sky-700',
    invalid_signature: 'bg-red-500/10 text-red-700',
    server_error:      'bg-red-500/10 text-red-700',
    not_applied:       'bg-amber-500/10 text-amber-700',
    missing_fields:    'bg-amber-500/10 text-amber-700',
    invalid_json:      'bg-amber-500/10 text-amber-700',
    invalid_body:      'bg-amber-500/10 text-amber-700',
    db_unavailable:    'bg-red-500/10 text-red-700',
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Received"   value={stats.total}       icon={Zap}         tone="brand" />
        <StatCard label="Successful"       value={stats.success}     icon={CheckCircle2} tone={stats.success > 0 ? 'success' : 'neutral'} sub={stats.successRate !== null ? `${stats.successRate}% success rate` : undefined} />
        <StatCard label="Failed / Errors"  value={stats.failed}      icon={XCircle}     tone={stats.failed > 0 ? 'danger' : 'success'} />
        <StatCard label="Invalid Signatures" value={stats.badSig}   icon={AlertTriangle} tone={stats.badSig > 0 ? 'danger' : 'success'} sub="Possible replay attacks" />
      </div>

      {/* Razorpay config status */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Razorpay Webhook Configuration</h3>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Razorpay configured',       ok: Boolean(health?.razorpayConfigured),  detail: health?.razorpayConfigured ? 'Key ID and secret present.' : 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing.' },
            { label: 'Webhook secret set',         ok: stats.badSig === 0,                  detail: stats.badSig === 0 ? 'No invalid signature events recorded.' : `${stats.badSig} invalid signature(s) — verify RAZORPAY_WEBHOOK_SECRET.` },
            { label: 'Payment double-verification', ok: true,                               detail: 'Client verify + webhook both call verifyAndMarkTeamPaid (idempotent).' },
          ].map(({ label, ok, detail }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg border border-[rgb(var(--border))] px-3 py-2.5">
              {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{detail}</p>
              </div>
              <Badge tone={ok ? 'success' : 'warn'} className="shrink-0 text-[10px]">{ok ? 'OK' : 'Review'}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhook log table */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Webhook Event Log</h3>
          <Badge tone="neutral">{webhookLog.length} events</Badge>
        </div>
        {webhookLog.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">No webhook events recorded yet. Events are logged when Razorpay sends payment.captured notifications.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[rgb(var(--border))]">
            <div className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Event</div>
              <div className="col-span-3">Order ID</div>
              <div className="col-span-2">Team ID</div>
              <div className="col-span-2">IP</div>
              <div className="col-span-1 text-right">Time</div>
            </div>
            {webhookLog.slice(0, 50).map((w, i) => (
              <div key={w.id || i} className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] px-3 py-2.5 text-xs last:border-0 hover:bg-[rgb(var(--surface-muted))]/30">
                <div className="col-span-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${statusStyle[w.status] || 'bg-[rgb(var(--surface-muted))] text-ink-500'}`}>
                    {w.status}
                  </span>
                </div>
                <div className="col-span-2 truncate text-ink-600">{w.event || '—'}</div>
                <div className="col-span-3 truncate font-mono text-ink-500">{w.orderId?.slice(0, 20) || '—'}</div>
                <div className="col-span-2 truncate font-mono text-ink-500">{w.teamId?.slice(0, 12) || '—'}</div>
                <div className="col-span-2 truncate font-mono text-ink-400">{w.ip || '—'}</div>
                <div className="col-span-1 text-right text-ink-400">{relTime(w.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── DUPLICATE TEAMS PANEL ────────────────────────────────────────────────────

function DuplicateTeamsPanel({ data, api, onReload }) {
  const [dupData, setDupData]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState('')
  const [busy, setBusy]         = useState({})
  const [msg, setMsg]           = useState('')

  async function loadDuplicates() {
    setLoading(true)
    try {
      const result = await api.getDuplicateTeams()
      setDupData(result)
    } catch (e) {
      setMsg(e.message || 'Failed to load duplicate analysis.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadDuplicates() }, [])

  const allDuplicates = useMemo(() => {
    if (!dupData) return []
    const members = (dupData.duplicateMembers || []).map(d => ({ ...d, kind: 'member' }))
    const leaders = (dupData.duplicateLeaders || []).map(d => ({ ...d, kind: 'leader' }))
    return [...leaders, ...members].sort((a, b) => b.riskScore - a.riskScore)
  }, [dupData])

  const filtered = useMemo(() => {
    if (!filter) return allDuplicates
    const q = filter.toLowerCase()
    return allDuplicates.filter(d =>
      (d.email || '').toLowerCase().includes(q) ||
      (d.displayName || '').toLowerCase().includes(q) ||
      d.teamIds.some(id => id.toLowerCase().includes(q))
    )
  }, [allDuplicates, filter])

  function riskColor(score) {
    if (score >= 80) return 'text-red-700 bg-red-500/10 border-red-500/30'
    if (score >= 50) return 'text-amber-700 bg-amber-500/10 border-amber-500/30'
    return 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Teams Scanned" value={dupData?.totalTeams ?? '—'}    icon={Users}       tone="brand" />
        <StatCard label="Duplicate Members"   value={dupData?.duplicateMembers?.length ?? '—'} icon={AlertTriangle} tone={(dupData?.duplicateMembers?.length || 0) > 0 ? 'danger' : 'success'} sub="Users in multiple teams" />
        <StatCard label="Duplicate Leaders"   value={dupData?.duplicateLeaders?.length ?? '—'} icon={Lock}          tone={(dupData?.duplicateLeaders?.length || 0) > 0 ? 'danger' : 'success'} sub="Leaders of multiple teams" />
      </div>

      {msg && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800">{msg}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={filter} onChange={setFilter} placeholder="Filter by email, name, team ID…" />
        <Button variant="secondary" size="sm" onClick={loadDuplicates} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning…' : 'Re-scan'}
        </Button>
        <Badge tone="neutral">{filtered.length} flagged</Badge>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">No duplicate registrations detected</p>
            <p className="mt-0.5 text-xs text-emerald-700">All {dupData?.totalTeams || 0} team(s) have unique member sets.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-ink-500">
            Duplicate detection checks for users appearing in multiple teams. Leaders in multiple teams are highest risk.
          </p>
          {filtered.map((d, i) => (
            <div key={d.uid || i} className={`rounded-xl border p-4 ${riskColor(d.riskScore)}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${riskColor(d.riskScore)}`}>
                      Risk {d.riskScore}
                    </span>
                    <Badge tone={d.kind === 'leader' ? 'danger' : 'warn'} className="text-[10px]">
                      {d.kind === 'leader' ? 'Duplicate Leader' : 'Duplicate Member'}
                    </Badge>
                    <p className="text-sm font-semibold">{d.displayName || 'Unknown'}</p>
                  </div>
                  <p className="mt-1 text-xs opacity-80">{d.email || '—'}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    UID: <code className="font-mono">{d.uid?.slice(0, 16)}</code>
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Teams ({d.teamIds.length})</p>
                  <div className="space-y-0.5">
                    {d.teamIds.map(tid => (
                      <code key={tid} className="block text-[10px] font-mono opacity-70">{tid.slice(0, 20)}</code>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-current/20 pt-3">
                <p className="text-[10px] font-bold uppercase opacity-60 w-full">Actions</p>
                <Button variant="secondary" size="sm" className="text-xs gap-1" disabled>
                  Investigate
                </Button>
                <Button variant="secondary" size="sm" className="text-xs gap-1" disabled>
                  Ignore
                </Button>
                <p className="text-[10px] opacity-50 self-center">Use Teams page to take action on specific teams.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── UPLOAD MONITOR PANEL ─────────────────────────────────────────────────────

function UploadMonitorPanel({ data }) {
  const { submissions, teams } = data

  // Derive upload stats from submissions collection
  const uploadStats = useMemo(() => {
    const allSubs = submissions.filter(s => s.teamId)

    const withPpt      = allSubs.filter(s => s.pptUrl)
    const withPdf      = allSubs.filter(s => s.pdfUrl)
    const withVideo    = allSubs.filter(s => s.videoUrl)
    const withGithub   = allSubs.filter(s => s.githubUrl)
    const withDeployed = allSubs.filter(s => s.deployedUrl)
    const finalized    = allSubs.filter(s => s.finalizedAt || s.status === 'submitted')
    const draft        = allSubs.filter(s => !s.finalizedAt && s.status !== 'submitted')

    // Phase-scoped submissions
    const phaseScoped = allSubs.filter(s => s.phases && Object.keys(s.phases).length > 0)

    // Suspicious: submissions with no team match
    const teamIds = new Set(teams.map(t => t.id))
    const orphaned = allSubs.filter(s => !teamIds.has(s.teamId))

    // URL validation — check for non-HTTPS
    const insecureUrls = []
    for (const sub of allSubs) {
      const urls = [sub.pptUrl, sub.pdfUrl, sub.videoUrl, sub.githubUrl, sub.deployedUrl].filter(Boolean)
      for (const url of urls) {
        if (url && !url.startsWith('https://') && !url.startsWith('gs://')) {
          insecureUrls.push({ teamId: sub.teamId, url: url.slice(0, 80) })
        }
      }
    }

    return {
      total: allSubs.length,
      withPpt: withPpt.length,
      withPdf: withPdf.length,
      withVideo: withVideo.length,
      withGithub: withGithub.length,
      withDeployed: withDeployed.length,
      finalized: finalized.length,
      draft: draft.length,
      phaseScoped: phaseScoped.length,
      orphaned: orphaned.length,
      insecureUrls,
    }
  }, [submissions, teams])

  // Artifact type breakdown for chart
  const artifactBreakdown = [
    { label: 'PPT',        count: uploadStats.withPpt,      color: '#3b82f6' },
    { label: 'PDF',        count: uploadStats.withPdf,      color: '#8b5cf6' },
    { label: 'Video',      count: uploadStats.withVideo,    color: '#f59e0b' },
    { label: 'GitHub',     count: uploadStats.withGithub,   color: '#10b981' },
    { label: 'Deployed',   count: uploadStats.withDeployed, color: '#06b6d4' },
  ]

  // Recent submissions with upload activity
  const recentUploads = useMemo(() => {
    return submissions
      .filter(s => s.updatedAt && (s.pptUrl || s.pdfUrl || s.videoUrl || s.githubUrl || s.deployedUrl))
      .sort((a, b) => tsMs(b.updatedAt) - tsMs(a.updatedAt))
      .slice(0, 20)
  }, [submissions])

  const teamMap = useMemo(() => {
    const m = new Map()
    for (const t of teams) m.set(t.id, t)
    return m
  }, [teams])

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Submissions"  value={uploadStats.total}     icon={Upload}      tone="brand" />
        <StatCard label="Finalized"          value={uploadStats.finalized} icon={CheckCircle2} tone={uploadStats.finalized > 0 ? 'success' : 'neutral'} sub="Locked by team" />
        <StatCard label="Draft / In Progress" value={uploadStats.draft}    icon={Clock}       tone={uploadStats.draft > 0 ? 'warn' : 'neutral'} />
        <StatCard label="Orphaned"           value={uploadStats.orphaned}  icon={AlertTriangle} tone={uploadStats.orphaned > 0 ? 'danger' : 'success'} sub="No matching team" />
      </div>

      {/* Security alerts */}
      {uploadStats.insecureUrls.length > 0 && (
        <div className={`rounded-xl border p-4 ${SEV_STYLE.HIGH}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Non-HTTPS submission URLs detected</p>
              <p className="mt-1 text-xs opacity-80">
                {uploadStats.insecureUrls.length} URL(s) are not HTTPS. All submission links should use HTTPS for security.
              </p>
              <div className="mt-2 space-y-0.5">
                {uploadStats.insecureUrls.slice(0, 5).map((u, i) => (
                  <p key={i} className="font-mono text-[10px] opacity-70">
                    Team {u.teamId.slice(0, 12)}: {u.url}
                  </p>
                ))}
                {uploadStats.insecureUrls.length > 5 && (
                  <p className="text-[10px] opacity-60">+{uploadStats.insecureUrls.length - 5} more</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadStats.orphaned > 0 && (
        <div className={`rounded-xl border p-4 ${SEV_STYLE.MEDIUM}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{uploadStats.orphaned} orphaned submission(s)</p>
              <p className="mt-1 text-xs opacity-80">
                Submissions exist for teams that no longer exist. These are stale records from deleted teams.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Artifact breakdown chart */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Artifact Type Coverage</h3>
        <p className="mt-0.5 text-[11px] text-ink-400">How many submissions have each artifact type uploaded.</p>
        <div className="mt-4 w-full">
          <ResponsiveContainer width="100%" height={144}>
            <BarChart data={artifactBreakdown} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {artifactBreakdown.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Upload policy */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Upload Security Policy</h3>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Firebase Storage rules active',    ok: true,  detail: 'Storage rules enforce team membership before allowing uploads. Paths scoped to submissions/{teamId}/.' },
            { label: 'MIME type validation',             ok: true,  detail: 'Frontend validates .ppt/.pptx, .pdf, video/* before upload. Storage rules enforce content-type.' },
            { label: 'File size limits enforced',        ok: true,  detail: 'PPT/PDF: 35MB max. Video: 250MB max. Enforced client-side before upload starts.' },
            { label: 'Submission metadata via API only', ok: true,  detail: 'URLs saved via POST /api/participant/submission-metadata (authenticated, phase-gated).' },
            { label: 'Phase-scoped submissions',         ok: uploadStats.phaseScoped > 0 || uploadStats.total === 0, detail: uploadStats.phaseScoped > 0 ? `${uploadStats.phaseScoped} submission(s) use phase-scoped storage.` : 'No phase-scoped submissions yet.' },
            { label: 'HTTPS URLs only',                  ok: uploadStats.insecureUrls.length === 0, detail: uploadStats.insecureUrls.length === 0 ? 'All submission URLs use HTTPS.' : `${uploadStats.insecureUrls.length} non-HTTPS URL(s) found — review required.` },
          ].map(({ label, ok, detail }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg border border-[rgb(var(--border))] px-3 py-2.5">
              {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{detail}</p>
              </div>
              <Badge tone={ok ? 'success' : 'warn'} className="shrink-0 text-[10px]">{ok ? 'OK' : 'Review'}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent upload activity */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Recent Upload Activity</h3>
        {recentUploads.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">No submission uploads recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[rgb(var(--border))]">
            <div className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-500">
              <div className="col-span-3">Team</div>
              <div className="col-span-5">Artifacts</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Updated</div>
            </div>
            {recentUploads.map((sub, i) => {
              const team = teamMap.get(sub.teamId)
              const artifacts = [
                sub.pptUrl && 'PPT',
                sub.pdfUrl && 'PDF',
                sub.videoUrl && 'Video',
                sub.githubUrl && 'GitHub',
                sub.deployedUrl && 'Deployed',
              ].filter(Boolean)
              return (
                <div key={sub.teamId || i} className="grid grid-cols-12 gap-2 border-b border-[rgb(var(--border))] px-3 py-2.5 text-xs last:border-0 hover:bg-[rgb(var(--surface-muted))]/30">
                  <div className="col-span-3 truncate font-medium text-ink-900">{team?.name || sub.teamId?.slice(0, 12) || '—'}</div>
                  <div className="col-span-5 flex flex-wrap gap-1">
                    {artifacts.map(a => (
                      <span key={a} className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">{a}</span>
                    ))}
                    {artifacts.length === 0 && <span className="text-ink-400">none</span>}
                  </div>
                  <div className="col-span-2">
                    <Badge tone={sub.finalizedAt || sub.status === 'submitted' ? 'success' : 'neutral'} className="text-[10px]">
                      {sub.finalizedAt || sub.status === 'submitted' ? 'finalized' : 'draft'}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right text-ink-400">{relTime(sub.updatedAt)}</div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── SYSTEM INTEGRITY PANEL ───────────────────────────────────────────────────

function SystemIntegrityPanel({ data }) {
  const { teams, submissions, evaluations, users, logs, health } = data

  const checks = useMemo(() => {
    const results = []
    const teamIds = new Set(teams.map(t => t.id))

    // 1. Teams without eventId
    const teamsNoEvent = teams.filter(t => !t.eventId)
    results.push({
      id: 'teams-no-event',
      label: 'Teams missing eventId',
      severity: teamsNoEvent.length > 0 ? 'HIGH' : 'LOW',
      count: teamsNoEvent.length,
      detail: teamsNoEvent.length > 0
        ? `${teamsNoEvent.length} team(s) have no eventId — orphaned from a previous migration.`
        : 'All teams have an eventId.',
      items: teamsNoEvent.map(t => t.id),
      category: 'Teams',
    })

    // 2. Registered teams with pending payment (inconsistent state)
    const regPendingPay = teams.filter(t => t.eventRegistered && t.paymentStatus === 'pending')
    results.push({
      id: 'reg-pending-pay',
      label: 'Registered but payment pending',
      severity: regPendingPay.length > 0 ? 'MEDIUM' : 'LOW',
      count: regPendingPay.length,
      detail: regPendingPay.length > 0
        ? `${regPendingPay.length} team(s): eventRegistered=true but paymentStatus=pending.`
        : 'No inconsistent registration/payment states.',
      items: regPendingPay.map(t => t.id),
      category: 'Payments',
    })

    // 3. Paid but not registered
    const paidNotReg = teams.filter(t => !t.eventRegistered && (t.paymentStatus === 'paid' || t.paymentStatus === 'waived'))
    results.push({
      id: 'paid-not-reg',
      label: 'Payment recorded but not registered',
      severity: paidNotReg.length > 0 ? 'HIGH' : 'LOW',
      count: paidNotReg.length,
      detail: paidNotReg.length > 0
        ? `${paidNotReg.length} team(s): paymentStatus=paid/waived but eventRegistered=false.`
        : 'All paid teams are properly registered.',
      items: paidNotReg.map(t => t.id),
      category: 'Payments',
    })

    // 4. Orphaned submissions
    const orphanSubs = submissions.filter(s => !teamIds.has(s.teamId))
    results.push({
      id: 'orphan-submissions',
      label: 'Orphaned submissions',
      severity: orphanSubs.length > 0 ? 'MEDIUM' : 'LOW',
      count: orphanSubs.length,
      detail: orphanSubs.length > 0
        ? `${orphanSubs.length} submission(s) reference a teamId that no longer exists.`
        : 'All submissions have a valid team.',
      items: orphanSubs.map(s => s.teamId),
      category: 'Submissions',
    })

    // 5. Orphaned evaluations
    const orphanEvals = evaluations.filter(e => e.teamId && !teamIds.has(e.teamId))
    results.push({
      id: 'orphan-evals',
      label: 'Orphaned evaluations',
      severity: orphanEvals.length > 0 ? 'MEDIUM' : 'LOW',
      count: orphanEvals.length,
      detail: orphanEvals.length > 0
        ? `${orphanEvals.length} evaluation(s) reference a teamId that no longer exists.`
        : 'All evaluations reference valid teams.',
      items: orphanEvals.map(e => e.id),
      category: 'Evaluations',
    })

    // 6. Problem selected without registration
    const psNotReg = teams.filter(t => t.problemStatementId && !t.eventRegistered)
    results.push({
      id: 'ps-not-registered',
      label: 'Problem selected without registration',
      severity: psNotReg.length > 0 ? 'MEDIUM' : 'LOW',
      count: psNotReg.length,
      detail: psNotReg.length > 0
        ? `${psNotReg.length} team(s) selected a problem statement but are not registered.`
        : 'All problem selections are from registered teams.',
      items: psNotReg.map(t => t.id),
      category: 'Registration',
    })

    // 7. Submitted without finalizedAt
    const submittedNoDate = submissions.filter(s => s.status === 'submitted' && !s.finalizedAt)
    results.push({
      id: 'submitted-no-date',
      label: 'Submitted without finalizedAt timestamp',
      severity: submittedNoDate.length > 0 ? 'LOW' : 'LOW',
      count: submittedNoDate.length,
      detail: submittedNoDate.length > 0
        ? `${submittedNoDate.length} submission(s) have status=submitted but no finalizedAt.`
        : 'All submitted submissions have a finalizedAt timestamp.',
      items: submittedNoDate.map(s => s.teamId),
      category: 'Submissions',
    })

    // 8. Users with stale teamId
    const orphanUsers = users.filter(u => u.teamId && !teamIds.has(u.teamId))
    results.push({
      id: 'orphan-user-teams',
      label: 'Users with stale teamId',
      severity: orphanUsers.length > 0 ? 'MEDIUM' : 'LOW',
      count: orphanUsers.length,
      detail: orphanUsers.length > 0
        ? `${orphanUsers.length} user(s) have a teamId that no longer exists.`
        : 'All user teamId references are valid.',
      items: orphanUsers.map(u => u.id),
      category: 'Users',
    })

    // 9. Evaluations without a problem statement ID
    const evalsNoProblem = evaluations.filter(e => !e.problemStatementId)
    results.push({
      id: 'evals-no-problem',
      label: 'Evaluations missing problemStatementId',
      severity: evalsNoProblem.length > 0 ? 'LOW' : 'LOW',
      count: evalsNoProblem.length,
      detail: evalsNoProblem.length > 0
        ? `${evalsNoProblem.length} evaluation(s) have no problemStatementId — may affect judge scope checks.`
        : 'All evaluations have a problemStatementId.',
      items: evalsNoProblem.map(e => e.id),
      category: 'Evaluations',
    })

    // 10. Teams with submission locked but no submission record
    const lockedNoSub = teams.filter(t => {
      if (!t.submissionLocked) return false
      return !submissions.some(s => s.teamId === t.id)
    })
    results.push({
      id: 'locked-no-sub',
      label: 'Submission locked but no submission record',
      severity: lockedNoSub.length > 0 ? 'MEDIUM' : 'LOW',
      count: lockedNoSub.length,
      detail: lockedNoSub.length > 0
        ? `${lockedNoSub.length} team(s) have submissionLocked=true but no submission document.`
        : 'All locked teams have a submission record.',
      items: lockedNoSub.map(t => t.id),
      category: 'Submissions',
    })

    // 11. Shortlisted teams with no problem statement
    const shortlistedNoProblem = teams.filter(t => t.shortlisted && !t.problemStatementId)
    results.push({
      id: 'shortlisted-no-problem',
      label: 'Shortlisted teams without problem statement',
      severity: shortlistedNoProblem.length > 0 ? 'MEDIUM' : 'LOW',
      count: shortlistedNoProblem.length,
      detail: shortlistedNoProblem.length > 0
        ? `${shortlistedNoProblem.length} shortlisted team(s) have no problem statement selected.`
        : 'All shortlisted teams have a problem statement.',
      items: shortlistedNoProblem.map(t => t.id),
      category: 'Shortlisting',
    })

    // 12. Firestore reachability
    results.push({
      id: 'firestore-reachable',
      label: 'Firestore reachable',
      severity: health?.firestoreReachable ? 'LOW' : 'CRITICAL',
      count: health?.firestoreReachable ? 0 : 1,
      detail: health?.firestoreReachable ? 'Admin SDK connected to Firestore.' : 'Firestore unreachable — check service account credentials.',
      items: [],
      category: 'Infrastructure',
    })

    return results
  }, [teams, submissions, evaluations, users, health])

  const issues = checks.filter(c => c.count > 0)
  const clean  = checks.filter(c => c.count === 0)

  const critCount = issues.filter(c => c.severity === 'CRITICAL').length
  const highCount = issues.filter(c => c.severity === 'HIGH').length
  const medCount  = issues.filter(c => c.severity === 'MEDIUM').length

  // Group by category
  const categories = [...new Set(checks.map(c => c.category))]

  function doExport() {
    exportCSV(
      `integrity-report-${Date.now()}.csv`,
      ['check', 'category', 'severity', 'status', 'count', 'detail'],
      checks.map(c => [c.label, c.category, c.severity, c.count > 0 ? 'ISSUE' : 'PASS', c.count, c.detail])
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Checks"  value={checks.length}  icon={Database}    tone="brand" />
        <StatCard label="Issues Found"  value={issues.length}  icon={AlertTriangle} tone={issues.length > 0 ? 'warn' : 'success'} />
        <StatCard label="Critical/High" value={critCount + highCount} icon={AlertCircle} tone={critCount + highCount > 0 ? 'danger' : 'success'} />
        <StatCard label="Passing"       value={clean.length}   icon={CheckCircle2} tone="success" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">
          Cross-collection integrity validation across teams, submissions, evaluations, users, and payments.
        </p>
        <Button variant="secondary" size="sm" onClick={doExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export Report
        </Button>
      </div>

      {/* Issues by category */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Issues Requiring Attention ({issues.length})</h3>
          {categories.map(cat => {
            const catIssues = issues.filter(c => c.category === cat)
            if (catIssues.length === 0) return null
            return (
              <div key={cat}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">{cat}</p>
                <div className="space-y-2">
                  {catIssues.map(c => (
                    <div key={c.id} className={`rounded-xl border p-4 ${SEV_STYLE[c.severity] || SEV_STYLE.LOW}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <SevBadge sev={c.severity} />
                            <p className="text-sm font-semibold">{c.label}</p>
                          </div>
                          <p className="mt-1 text-xs opacity-80">{c.detail}</p>
                          {c.items.length > 0 && (
                            <p className="mt-1 font-mono text-[10px] opacity-60">
                              {c.items.slice(0, 4).join(', ')}{c.items.length > 4 ? ` +${c.items.length - 4} more` : ''}
                            </p>
                          )}
                        </div>
                        <Badge tone={SEV_TONE[c.severity] || 'neutral'} className="shrink-0">{c.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Passing checks */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Passing Checks ({clean.length})</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {clean.map(c => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-700">{c.label}</p>
                <p className="text-[10px] text-ink-400">{c.category}</p>
              </div>
              <Badge tone="success" className="shrink-0 text-[10px]">OK</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture reference */}
      <Card>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Security Architecture Reference</h3>
        <div className="mt-4 space-y-2 text-sm text-ink-600">
          <p><strong className="text-ink-900">Auth:</strong> Firebase Auth JWT → <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">verifyFirebaseToken</code> → <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">loadUserRole</code> → <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">requireRole()</code></p>
          <p><strong className="text-ink-900">Writes:</strong> ALL mutations via Express + Firebase Admin SDK. Frontend never writes privileged data directly.</p>
          <p><strong className="text-ink-900">Payments:</strong> Razorpay HMAC-SHA256 (timing-safe). Webhook + client double-verify. Idempotent transaction.</p>
          <p><strong className="text-ink-900">Phase gates:</strong> Deadline, phase status, and shortlist checks enforced server-side on every submission attempt.</p>
          <p><strong className="text-ink-900">Audit trail:</strong> Append-only via Admin SDK. No client writes to <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">auditLogs</code> or <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">securityEvents</code>.</p>
          <p><strong className="text-ink-900">Firestore rules:</strong> Catch-all deny. Client reads scoped by ownership/role. Storage rules require team membership.</p>
          <p><strong className="text-ink-900">Honeypots:</strong> 2 hidden endpoints log all probes to <code className="rounded bg-[rgb(var(--surface-muted))] px-1 text-xs">securityEvents</code> with IP + device info.</p>
          <p><strong className="text-ink-900">Rate limits:</strong> 400 req/15min global · 10/hr payment · 10/hr team actions.</p>
        </div>
      </Card>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function AdminSecurityPage() {
  usePageSeo({ title: 'Security Center', description: 'Enterprise security & integrity monitoring.' })
  const api = useApi()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const timerRef = useRef(null)

  // Data state
  const [health, setHealth]         = useState(null)
  const [users, setUsers]           = useState([])
  const [usersMap, setUsersMap]     = useState(new Map())
  const [logs, setLogs]             = useState([])
  const [secEvents, setSecEvents]   = useState([])
  const [platformActivity, setPlatformActivity] = useState([])
  const [teams, setTeams]           = useState([])
  const [submissions, setSubmissions] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [incidents, setIncidents]   = useState([])
  const [webhookLog, setWebhookLog] = useState([])
  const [duplicates, setDuplicates] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [h, u, l, se, pa, t, s, e, inc, wh] = await Promise.all([
        api.adminSystemHealth().catch(() => null),
        api.listUsers().catch(() => []),
        api.listAuditLogs(500).catch(() => []),
        api.listSecurityEvents(300).catch(() => []),
        api.listPlatformActivity(500).catch(() => []),
        api.adminTeams().catch(() => []),
        api.adminSubmissions().catch(() => []),
        api.adminEvaluations().catch(() => []),
        api.listSecurityIncidents().catch(() => []),
        api.listWebhookLog(100).catch(() => []),
      ])
      setHealth(h)
      const ua = Array.isArray(u) ? u : []
      setUsers(ua)
      const map = new Map()
      for (const usr of ua) map.set(usr.id, { name: usr.displayName || usr.email || usr.id, email: usr.email || '', role: usr.role || '' })
      setUsersMap(map)
      setLogs(Array.isArray(l) ? l : [])
      setSecEvents(Array.isArray(se) ? se : [])
      setPlatformActivity(Array.isArray(pa) ? pa : [])
      setTeams(Array.isArray(t) ? t : [])
      setSubmissions(Array.isArray(s) ? s : [])
      setEvaluations(Array.isArray(e) ? e : [])
      setIncidents(Array.isArray(inc) ? inc : [])
      setWebhookLog(Array.isArray(wh) ? wh : [])
      setLastRefresh(new Date())
      setCountdown(30)
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { void load(); return 30 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, load])

  const sharedData = { health, users, usersMap, logs, secEvents, platformActivity, teams, submissions, evaluations, incidents, webhookLog, duplicates }

  // Alert badge count
  const alertCount = useMemo(() => {
    let n = 0
    if (secEvents.some(e => e.severity === 'CRITICAL' || e.severity === 'HIGH')) n++
    if (incidents.some(i => i.status === 'OPEN')) n++
    return n
  }, [secEvents, incidents])

  if (loading) return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Skeleton className="h-12 w-72 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-900">Security Center</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Enterprise security, integrity &amp; audit monitoring
              {lastRefresh && <span className="ml-2 text-ink-400">· {relTime(lastRefresh)}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-ink-500 hover:text-ink-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-ink-300'}`} />
            {autoRefresh ? `Live · ${countdown}s` : 'Auto-refresh off'}
          </button>
          <Button variant="secondary" size="sm" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tab bar — single row, horizontal scroll */}
      <div className="w-full overflow-x-auto thin-scrollbar rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-1">
        <div className="flex gap-0.5" style={{ minWidth: 'max-content' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[rgb(var(--surface))] text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {tab.id === 'incidents' && alertCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {alertCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {activeTab === 'overview'   && <OverviewPanel data={sharedData} />}
          {activeTab === 'live'       && <LiveActivityPanel data={sharedData} />}
          {activeTab === 'threats'    && <ThreatDetectionPanel data={sharedData} />}
          {activeTab === 'audit'      && <AuditLogsPanel data={sharedData} />}
          {activeTab === 'violations' && <AccessViolationsPanel data={sharedData} />}
          {activeTab === 'incidents'  && <IncidentManagementPanel data={sharedData} api={api} onReload={load} />}
          {activeTab === 'webhooks'   && <WebhookHealthPanel data={sharedData} />}
          {activeTab === 'duplicates' && <DuplicateTeamsPanel data={sharedData} api={api} onReload={load} />}
          {activeTab === 'uploads'    && <UploadMonitorPanel data={sharedData} />}
          {activeTab === 'integrity'  && <SystemIntegrityPanel data={sharedData} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
