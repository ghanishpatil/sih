import { useEffect, useState } from 'react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { publicApi } from '@/services/api.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

export function AdminHealthPage() {
  usePageSeo({ title: 'System Health', description: 'Operational probes.' })
  const api = useApi()
  const [sys, setSys] = useState(null)
  const [pub, setPub] = useState(null)
  const [apiPing, setApiPing] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.adminSystemHealth(),
      api.health().catch(() => null),
      publicApi.listEvents().catch(() => []),
    ]).then(([s, h, ev]) => {
      if (cancelled) return
      setSys(s)
      setApiPing(h)
      setPub({ events: Array.isArray(ev) ? ev.length : 0 })
    })
    return () => {
      cancelled = true
    }
  }, [api])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">System health</h1>
        <p className="mt-2 text-sm text-ink-600">
          Lightweight probes — extend with uptime monitors + Razorpay webhook dashboards in production.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink-900">API</h2>
          <p className="mt-4 text-sm text-ink-600">
            <code className="rounded bg-[rgb(var(--surface-muted))] px-1.5 py-0.5 text-xs">GET /api/health</code>{' '}
            {apiPing ? (
              <Badge tone="success">reachable</Badge>
            ) : (
              <Badge tone="warn">unreachable</Badge>
            )}
          </p>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink-900">Admin probe</h2>
          {sys ? (
            <ul className="mt-4 space-y-2 text-sm text-ink-600">
              <li className="flex justify-between gap-2">
                Firestore reachable <Badge tone={sys.firestoreReachable ? 'success' : 'warn'}>{String(sys.firestoreReachable)}</Badge>
              </li>
              <li className="flex justify-between gap-2">
                Razorpay configured <Badge tone={sys.razorpayConfigured ? 'success' : 'neutral'}>{String(sys.razorpayConfigured)}</Badge>
              </li>
              <li className="text-xs text-ink-500">{sys.time}</li>
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Loading…</p>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink-900">Public catalog</h2>
          <p className="mt-4 text-sm text-ink-600">
            Listed hackathons (public catalog): <strong>{pub?.events ?? '—'}</strong>
          </p>
        </Card>
      </div>
    </div>
  )
}
