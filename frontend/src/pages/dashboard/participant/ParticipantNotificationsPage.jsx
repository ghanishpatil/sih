import { Link } from 'react-router-dom'
import { formatDate } from '@/utils/format.js'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { useParticipantNotifications } from '@/hooks/useParticipantNotifications.js'
import { Card } from '@/components/ui/Card.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

export function ParticipantNotificationsPage() {
  usePageSeo({ title: 'Notifications', description: 'In-app alerts for your account.' })
  const { user } = useAuth()
  const { items, loading, unreadCount } = useParticipantNotifications(user?.uid, 60)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Notifications</h1>
          <p className="mt-2 text-sm text-ink-600">
            Read-only inbox synced from Firestore. Mark-as-read will require a future API if you want persistent state beyond{' '}
            <code className="rounded bg-[rgb(var(--surface-muted))] px-1 font-mono text-xs">read</code> flags.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Badge tone="warn">{unreadCount} unread</Badge>
        ) : (
          <Badge tone="neutral">All caught up</Badge>
        )}
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink-900">Deadline reminders</h2>
        <p className="mt-2 text-sm text-ink-600">
          Synthetic reminders will appear here once the API writes notification documents (e.g. 24h before submission). Until then,
          use the <Link to="/dashboard/timeline" className="font-medium text-brand-600 hover:underline">timeline</Link>{' '}
          for dates.
        </p>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-ink-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li key={n.id}>
              <Card className={n.read === true ? 'opacity-90' : 'border-brand-500/25'}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">{n.title || 'Notice'}</p>
                    <p className="text-xs text-ink-500">{formatDate(n.createdAt)}</p>
                  </div>
                  {n.read !== true ? (
                    <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />
                  ) : null}
                </div>
                {n.body ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-ink-600">{n.body}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
