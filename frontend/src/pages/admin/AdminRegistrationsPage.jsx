import { useCallback, useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { DataTable } from '@/components/admin/DataTable.jsx'
import { AdminDrawer } from '@/components/admin/AdminDrawer.jsx'
import { ConfirmModal } from '@/components/admin/ConfirmModal.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { useAdminFiltersStore } from '@/stores/adminFiltersStore.js'
import { formatDate } from '@/utils/format.js'
import {
  deriveRegistrationStatus,
  REGISTRATION_STATUSES,
  teamHasRegistrationRecord,
} from '@/utils/teamRegistrationDisplay.js'

const col = createColumnHelper()

const FILTERS = ['all', ...REGISTRATION_STATUSES]

function toneForRegStatus(s) {
  switch (s) {
    case 'registered':
      return 'success'
    case 'pending':
      return 'neutral'
    case 'blocked':
      return 'warn'
    case 'rejected':
      return 'warn'
    default:
      return 'neutral'
  }
}

export function AdminRegistrationsPage() {
  usePageSeo({ title: 'Registrations', description: 'Registered teams.' })
  const api = useApi()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState({})
  const [drawerTeam, setDrawerTeam] = useState(null)
  const [bulkStatus, setBulkStatus] = useState('registered')
  const [confirm, setConfirm] = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const globalFilter = useAdminFiltersStore((s) => s.registrationsGlobalFilter)
  const setGlobalFilter = useAdminFiltersStore((s) => s.setRegistrationsGlobalFilter)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.adminTeams()
      setTeams(Array.isArray(rows) ? rows : [])
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  /** Only teams that started or completed registration — not every team in the DB. */
  const registrationTeams = useMemo(() => teams.filter((t) => teamHasRegistrationRecord(t)), [teams])

  const drawerId = drawerTeam?.id
  useEffect(() => {
    if (!drawerId) return
    const fresh = registrationTeams.find((t) => t.id === drawerId)
    if (fresh) setDrawerTeam(fresh)
    else setDrawerTeam(null)
  }, [registrationTeams, drawerId])

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return registrationTeams
    return registrationTeams.filter((t) => deriveRegistrationStatus(t) === statusFilter)
  }, [registrationTeams, statusFilter])

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((id) => rowSelection[id]), [rowSelection])

  const patchRegistration = useCallback(
    async (teamId, registrationStatus) => {
      await api.patchAdminTeam(teamId, { registrationStatus })
      await load()
    },
    [api, load],
  )

  const runBulkRegistration = useCallback(
    async (registrationStatus) => {
      setConfirm(null)
      setBulkBusy(true)
      try {
        for (const id of selectedIds) {
          await api.patchAdminTeam(id, { registrationStatus })
        }
        setRowSelection({})
        await load()
      } catch (e) {
        globalThis.alert(e.message || 'Bulk update failed')
      } finally {
        setBulkBusy(false)
      }
    },
    [api, load, selectedIds],
  )

  const deleteRegistration = useCallback(
    async (teamId) => {
      await api.deleteAdminTeamRegistration(teamId)
      await load()
      setDrawerTeam((prev) => (prev?.id === teamId ? null : prev))
    },
    [api, load],
  )

  const runBulkDeleteRegistration = useCallback(async () => {
    setConfirm(null)
    setBulkBusy(true)
    try {
      for (const id of selectedIds) {
        const row = registrationTeams.find((t) => t.id === id)
        if (row) await api.deleteAdminTeamRegistration(id)
      }
      setRowSelection({})
      await load()
    } catch (e) {
      globalThis.alert(e.message || 'Bulk delete failed')
    } finally {
      setBulkBusy(false)
    }
  }, [api, load, selectedIds, registrationTeams])

  const columns = useMemo(
    () => [
      col.accessor('name', { header: 'Team', cell: (i) => i.getValue() || '—' }),
      col.accessor('inviteCode', { header: 'Code', cell: (i) => <span className="font-mono text-xs">{i.getValue()}</span> }),
      col.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const s = deriveRegistrationStatus(row.original)
          return <Badge tone={toneForRegStatus(s)}>{s}</Badge>
        },
      }),
      col.accessor('paymentStatus', {
        header: 'Payment',
        cell: (i) => <Badge tone="neutral">{String(i.getValue() || '—')}</Badge>,
      }),
      col.accessor('problemStatementId', {
        header: 'Problem',
        cell: (i) => <span className="font-mono text-[11px]">{String(i.getValue() || '—').slice(0, 14)}</span>,
      }),
      col.display({
        id: 'members',
        header: 'Members',
        cell: ({ row }) => (Array.isArray(row.original.memberIds) ? row.original.memberIds.length : 0),
      }),
    ],
    [],
  )

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Registrations</h1>
        <p className="mt-2 text-sm text-ink-600">
          Teams that have started or completed event registration. <strong>Delete registration</strong> clears payment and
          registration fields in Firestore (the team row stays under Teams). Use{' '}
          <code className="rounded bg-[rgb(var(--surface-muted))] px-1 font-mono text-[11px]">registrationStatus</code>{' '}
          to block or approve without deleting.
        </p>
      </div>

      <div className="sticky top-14 z-[5] flex flex-wrap items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/60 px-3 py-3 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase text-ink-500">Status</span>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              statusFilter === f
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-[rgb(var(--surface))] text-ink-700 hover:bg-[rgb(var(--surface-muted))]',
            ].join(' ')}
            onClick={() => {
              setStatusFilter(f)
              setRowSelection({})
            }}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {selectedIds.length > 0 ? (
        <div className="sticky top-[7.5rem] z-[5] flex flex-wrap items-center gap-2 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3">
          <span className="text-sm font-medium text-ink-800">{selectedIds.length} selected</span>
          <select
            className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            {REGISTRATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                Set → {s}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" type="button" disabled={bulkBusy} onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
          <Button
            size="sm"
            variant="primary"
            type="button"
            disabled={bulkBusy}
            onClick={() =>
              setConfirm({
                title: `Set registration to “${bulkStatus}”`,
                body:
                  bulkStatus === 'blocked' || bulkStatus === 'rejected'
                    ? 'Participants on these teams will be blocked from payments, problem selection, and submissions until an admin sets status back to registered or pending.'
                    : 'This updates Firestore and writes audit entries per team.',
                variant: bulkStatus === 'blocked' || bulkStatus === 'rejected' ? 'danger' : 'primary',
                action: () => runBulkRegistration(bulkStatus),
              })
            }
          >
            Apply to selected
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={bulkBusy}
            className="border-red-500/40 text-red-700 hover:bg-red-500/10"
            onClick={() =>
              setConfirm({
                title: 'Delete registration for selected teams',
                body:
                  'Removes registration, payment, and problem-selection fields from each team document in Firestore. Teams and members are kept. This cannot be undone.',
                variant: 'danger',
                confirmLabel: 'Delete from database',
                action: () => runBulkDeleteRegistration(),
              })
            }
          >
            Delete registration
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={filteredByStatus}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        onRowClick={(row) => setDrawerTeam(row)}
      />

      <AdminDrawer
        open={Boolean(drawerTeam)}
        title={drawerTeam ? `${drawerTeam.name} · registration` : ''}
        onClose={() => setDrawerTeam(null)}
        footer={
          drawerTeam ? (
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs text-ink-600">
                Set status
                <select
                  className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-1.5 text-xs"
                  value={deriveRegistrationStatus(drawerTeam)}
                  onChange={(e) => void patchRegistration(drawerTeam.id, e.target.value)}
                >
                  {REGISTRATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {teamHasRegistrationRecord(drawerTeam) || drawerTeam.problemStatementId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  className="border-red-500/40 text-red-700 hover:bg-red-500/10"
                  onClick={() =>
                    setConfirm({
                      title: 'Delete registration',
                      body: `Remove all registration and payment data for “${drawerTeam.name}” from Firestore? Problem selection will be cleared. The team and members stay.`,
                      variant: 'danger',
                      confirmLabel: 'Delete from database',
                      action: async () => {
                        setConfirm(null)
                        setBulkBusy(true)
                        try {
                          await deleteRegistration(drawerTeam.id)
                        } catch (e) {
                          globalThis.alert(e.message || 'Delete failed')
                        } finally {
                          setBulkBusy(false)
                        }
                      },
                    })
                  }
                >
                  Delete registration
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {drawerTeam ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-ink-500">Team id</dt>
              <dd className="font-mono text-xs">{drawerTeam.id}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-500">Computed status</dt>
              <dd>
                <Badge tone={toneForRegStatus(deriveRegistrationStatus(drawerTeam))}>{deriveRegistrationStatus(drawerTeam)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-500">Payment</dt>
              <dd>
                <Badge tone="neutral">{String(drawerTeam.paymentStatus || '—')}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-500">Problem statement</dt>
              <dd className="font-mono text-[11px]">{drawerTeam.problemStatementId || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-500">Members</dt>
              <dd className="font-mono text-[11px]">{(drawerTeam.memberIds || []).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-500">Registered at</dt>
              <dd className="text-xs text-ink-600">{formatDate(drawerTeam.eventRegisteredAt) || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </AdminDrawer>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        variant={confirm?.variant || 'primary'}
        onCancel={() => !bulkBusy && setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
        busy={bulkBusy}
        confirmLabel={confirm?.confirmLabel || 'Apply'}
      >
        {confirm?.body}
      </ConfirmModal>
    </div>
  )
}
