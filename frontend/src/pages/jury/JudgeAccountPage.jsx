import { useAuth } from '@/context/AuthContext.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useEvent } from '@/context/EventContext.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { ROLES } from '@/utils/roles.js'

export function JudgeAccountPage() {
  usePageSeo({ title: 'Jury Account', description: 'Profile & edition.' })
  const { user, profile } = useAuth()
  const { eventId } = useEvent()

  const assignedPs = Array.isArray(profile?.assignedProblemStatementIds) ? profile.assignedProblemStatementIds : []

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Account</h1>
        <p className="mt-2 text-sm text-ink-600">Read-only summary — role changes are admin-only.</p>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink-900">Identity</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-ink-500">Email</dt>
            <dd className="text-ink-900">{user?.email || profile?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-500">Role</dt>
            <dd>
              <Badge tone="brand">{profile?.role || ROLES.JUDGE}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-500">Hackathon scope</dt>
            <dd className="font-mono text-xs text-ink-800">{eventId}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink-900">Problem scope</h2>
        <p className="mt-2 text-sm text-ink-600">
          IDs configured by organizers on your user profile. You may also be assigned directly on teams.
        </p>
        {assignedPs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No PS ids on profile — rely on per-team judge assignments.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {assignedPs.map((id) => (
              <li key={id}>
                <span className="rounded-lg bg-[rgb(var(--surface-muted))] px-2 py-1 font-mono text-[11px] text-ink-800">
                  {id}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
