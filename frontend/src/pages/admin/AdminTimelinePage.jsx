import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Save, Trash2, GripVertical, Calendar,
  CheckCircle2, CircleDot, AlertCircle, Loader2,
} from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { useResolvedEventId } from '@/hooks/useResolvedEventId.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'

/* ── helpers ──────────────────────────────────────────────── */
function statusFromDates(startDate, endDate) {
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : start
  if (!start) return 'upcoming'
  if (now >= start && now <= (end || start)) return 'live'
  if (now > (end || start)) return 'completed'
  return 'upcoming'
}

function formatDateForInput(iso) {
  if (!iso) return ''
  return iso.slice(0, 10) // 'YYYY-MM-DD'
}

function formatDateDisplay(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

const emptyPhase = () => ({
  id: crypto.randomUUID?.() || Date.now().toString(36),
  phase: '',
  startDate: '',
  endDate: '',
  description: '',
})

/* ── main component ───────────────────────────────────────── */
export function AdminTimelinePage() {
  usePageSeo({ title: 'Timeline Management', description: 'Configure hackathon timeline phases.' })
  const api = useApi()
  const { eventId } = useResolvedEventId()

  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTimeline?.()
      const loaded = Array.isArray(data?.phases) ? data.phases : Array.isArray(data) ? data : []
      if (loaded.length > 0) {
        setPhases(loaded.map((p, i) => ({
          ...p,
          id: p.id || `tl-${i}`,
        })))
      } else {
        setPhases([
          { id: '1', phase: 'Registration Opens', startDate: '2026-06-01', endDate: '2026-06-30', description: '' },
          { id: '2', phase: 'Problem Statements Live', startDate: '2026-06-15', endDate: '', description: '' },
          { id: '3', phase: 'Idea Screening', startDate: '2026-07-01', endDate: '2026-07-15', description: '' },
          { id: '4', phase: 'Grand Hackathon', startDate: '2026-08-20', endDate: '2026-08-22', description: '' },
          { id: '5', phase: 'Showcase & Awards', startDate: '2026-08-23', endDate: '', description: '' },
        ])
      }
    } catch {
      setPhases([
        { id: '1', phase: 'Registration Opens', startDate: '2026-06-01', endDate: '2026-06-30', description: '' },
      ])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { load() }, [load])

  /* ── update field ── */
  function updatePhase(id, field, value) {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  /* ── add / remove ── */
  function addPhase() {
    setPhases(prev => [...prev, emptyPhase()])
  }

  function removePhase(id) {
    setPhases(prev => prev.filter(p => p.id !== id))
  }

  /* ── save ── */
  async function saveAll() {
    setSaving(true)
    setToast(null)
    try {
      // Keep id in payload so it persists across reloads
      await api.updateTimeline?.(phases)
      setToast({ type: 'success', msg: 'Timeline saved successfully!' })
      // Reload from server to confirm persistence
      await load()
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Failed to save.' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Timeline Management</h1>
          <p className="mt-2 text-sm text-ink-600">
            Configure hackathon phases and dates. The "Live Now" badge shows automatically when the current date falls within a phase's date range.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={addPhase}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Phase
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save All
          </Button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              toast.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : 'border-red-500/30 bg-red-500/10 text-red-700'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <div className="text-sm text-ink-600">
          <strong className="text-ink-800">How it works:</strong> Each phase has a start and optional end date.
          If today's date is within the range → <span className="font-semibold text-emerald-600">Live Now</span>.
          If today is past the end date → <span className="font-semibold text-brand-600">Completed</span>.
          Otherwise → <span className="font-semibold text-ink-500">Upcoming</span>.
        </div>
      </div>

      {/* Event ID */}
      <p className="text-xs text-ink-500">Active event: <code className="rounded bg-ink-100 px-1.5 py-0.5">{eventId || 'none'}</code></p>

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-[rgb(var(--surface-muted))]" />
          ))}
        </div>
      ) : (
        /* Phase cards */
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {phases.map((p, i) => {
              const status = statusFromDates(p.startDate, p.endDate)
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative overflow-hidden">
                    {/* Status indicator stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      status === 'live' ? 'bg-emerald-500'
                        : status === 'completed' ? 'bg-brand-500'
                          : 'bg-ink-300'
                    }`} />

                    <div className="pl-4">
                      {/* Top row: order + status + delete */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgb(var(--surface-muted))] text-xs font-bold text-ink-500">
                            {i + 1}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            status === 'live'
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : status === 'completed'
                                ? 'bg-brand-500/15 text-brand-700'
                                : 'bg-ink-100 text-ink-600'
                          }`}>
                            {status === 'live' ? <CircleDot className="h-3 w-3" /> : status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {status === 'live' ? 'Live Now' : status === 'completed' ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ink-400 hover:text-red-600"
                          onClick={() => removePhase(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Fields */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Input
                            label="Phase Name"
                            placeholder="e.g. Registration Opens"
                            value={p.phase}
                            onChange={e => updatePhase(p.id, 'phase', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink-700">
                            <Calendar className="mr-1 inline h-3.5 w-3.5 text-ink-400" />
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={formatDateForInput(p.startDate)}
                            onChange={e => updatePhase(p.id, 'startDate', e.target.value)}
                            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-ink-700">
                            <Calendar className="mr-1 inline h-3.5 w-3.5 text-ink-400" />
                            End Date <span className="text-xs text-ink-400">(optional)</span>
                          </label>
                          <input
                            type="date"
                            value={formatDateForInput(p.endDate)}
                            onChange={e => updatePhase(p.id, 'endDate', e.target.value)}
                            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Input
                            label="Description (optional)"
                            placeholder="Brief description of this phase"
                            value={p.description || ''}
                            onChange={e => updatePhase(p.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                        <span>Preview:</span>
                        <span className="font-medium text-ink-700">{p.phase || 'Untitled'}</span>
                        <span>·</span>
                        <span>{formatDateDisplay(p.startDate)}{p.endDate ? ` – ${formatDateDisplay(p.endDate)}` : ''}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom save */}
      {!loading && phases.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save Timeline
          </Button>
        </div>
      )}
    </div>
  )
}
