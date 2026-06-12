import { useCallback, useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Shield, Ban, Trash2, Eye, UserCheck, Crown } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { ROLES } from '@/utils/roles.js'
import { DataTable } from '@/components/admin/DataTable.jsx'
import { AdminDrawer } from '@/components/admin/AdminDrawer.jsx'
import { ConfirmModal } from '@/components/admin/ConfirmModal.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { useAdminFiltersStore } from '@/stores/adminFiltersStore.js'
import { formatDate } from '@/utils/format.js'
const col = createColumnHelper()

// CRIT-03: Super admin emails sourced from the build-time env var so they are
// not hardcoded in source. Set VITE_SUPER_ADMIN_EMAILS as a comma-separated
// list in frontend/.env (never commit real emails to git).
// This is purely a UI hint — the backend enforces the actual protection.
const SUPER_ADMINS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const roleTones = {
  admin: 'danger',
  judge: 'warn',
  mentor: 'success',
  participant: 'neutral',
  banned: 'danger',
}

export function AdminAccessPage() {
  usePageSeo({ title: 'Access Control', description: 'User roles, bans, and account management.' })
  const api = useApi()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerUser, setDrawerUser] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const globalFilter = useAdminFiltersStore((s) => s.accessGlobalFilter)
  const setGlobalFilter = useAdminFiltersStore((s) => s.setAccessGlobalFilter)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await api.listUsers()
      setUsers(Array.isArray(rows) ? rows : [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  const isSuperAdmin = useCallback((email) => {
    return SUPER_ADMINS.includes((email || '').toLowerCase())
  }, [])

  const assignRole = useCallback(async (uid, role) => {
    setBusy(true)
    try {
      await api.updateUserRole(uid, role)
      await load()
    } catch (e) {
      alert(e.message || 'Failed to update role')
    } finally {
      setBusy(false)
    }
  }, [api, load])

  const banUser = useCallback(async (uid) => {
    setConfirm(null)
    setBusy(true)
    try {
      await api.banUser(uid)
      await load()
      setDrawerUser(null)
    } catch (e) {
      alert(e.message || 'Failed to ban user')
    } finally {
      setBusy(false)
    }
  }, [api, load])

  const unbanUser = useCallback(async (uid) => {
    setBusy(true)
    try {
      await api.unbanUser(uid)
      await load()
      setDrawerUser(null)
    } catch (e) {
      alert(e.message || 'Failed to unban user')
    } finally {
      setBusy(false)
    }
  }, [api, load])

  const deleteUser = useCallback(async (uid) => {
    setConfirm(null)
    setBusy(true)
    try {
      await api.deleteUser(uid)
      await load()
      setDrawerUser(null)
    } catch (e) {
      alert(e.message || 'Failed to delete user')
    } finally {
      setBusy(false)
    }
  }, [api, load])

  const toggleSelect = useCallback((uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback((visibleUsers) => {
    setSelectedIds((prev) => {
      const selectableIds = visibleUsers
        .filter((u) => !isSuperAdmin(u.email) && u.id !== currentUser?.uid)
        .map((u) => u.id)
      if (selectableIds.every((id) => prev.has(id)) && selectableIds.length > 0) {
        // All selected → deselect all
        const next = new Set(prev)
        selectableIds.forEach((id) => next.delete(id))
        return next
      }
      // Select all
      const next = new Set(prev)
      selectableIds.forEach((id) => next.add(id))
      return next
    })
  }, [isSuperAdmin, currentUser])

  const bulkDelete = useCallback(async () => {
    setConfirm(null)
    setBulkDeleting(true)
    try {
      const uids = [...selectedIds]
      const result = await api.bulkDeleteUsers(uids)
      setSelectedIds(new Set())
      await load()
      if (result.failed > 0) {
        alert(`Deleted ${result.success}. Failed ${result.failed}: ${result.errors.map((e) => `${e.uid}: ${e.error}`).slice(0, 3).join('; ')}`)
      }
    } catch (e) {
      alert(e.message || 'Bulk delete failed')
    } finally {
      setBulkDeleting(false)
    }
  }, [api, selectedIds, load])

  const columns = useMemo(
    () => [
      col.display({
        id: 'select',
        header: () => null,
        cell: ({ row }) => {
          const u = row.original
          const isProtected = isSuperAdmin(u.email) || u.id === currentUser?.uid
          if (isProtected) return <span className="block w-5" />
          return (
            <input
              type="checkbox"
              checked={selectedIds.has(u.id)}
              onChange={() => toggleSelect(u.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-[rgb(var(--border))] text-brand-600 focus:ring-brand-500"
              aria-label={`Select ${u.displayName || u.email}`}
            />
          )
        },
      }),
      col.accessor('displayName', {
        header: 'Name',
        cell: (i) => (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900">{i.getValue() || '—'}</span>
            {isSuperAdmin(i.row.original.email) && (
              <Crown className="h-3.5 w-3.5 text-amber-500" title="Super Admin" />
            )}
          </div>
        ),
      }),
      col.accessor('email', {
        header: 'Email',
        cell: (i) => <span className="text-sm text-ink-600">{i.getValue() || '—'}</span>,
      }),
      col.accessor('role', {
        header: 'Role',
        cell: ({ row }) => {
          const role = row.original.role || ROLES.PARTICIPANT
          return <Badge tone={roleTones[role] || 'neutral'}>{role}</Badge>
        },
      }),
      col.display({
        id: 'assign',
        header: 'Change Role',
        cell: ({ row }) => {
          const u = row.original
          const isProtected = isSuperAdmin(u.email)
          const isBanned = u.role === 'banned'
          if (isProtected) return <span className="text-[10px] font-medium text-amber-600">Protected</span>
          if (isBanned) return <Badge tone="danger">Banned</Badge>
          return (
            <select
              className="rounded-lg border border-[rgb(var(--border))] bg-transparent px-2 py-1.5 text-xs"
              value={u.role || ROLES.PARTICIPANT}
              disabled={busy}
              onChange={(e) => assignRole(u.id, e.target.value)}
            >
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )
        },
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setDrawerUser(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      }),
    ],
    [assignRole, busy, isSuperAdmin, selectedIds, toggleSelect, currentUser],
  )

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    judges: users.filter((u) => u.role === 'judge').length,
    mentors: users.filter((u) => u.role === 'mentor').length,
    banned: users.filter((u) => u.role === 'banned').length,
  }), [users])

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-brand-600" />
          <h1 className="font-display text-3xl font-bold text-ink-900">Access Control</h1>
        </div>
        <p className="mt-2 text-sm text-ink-600">
          Manage user roles, ban accounts, and view user details. Super admin accounts are protected and cannot be modified.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-ink-500">Total</p>
          <p className="font-display text-lg font-bold text-ink-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-ink-500">Admins</p>
          <p className="font-display text-lg font-bold text-red-600">{stats.admins}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-ink-500">Judges</p>
          <p className="font-display text-lg font-bold text-amber-600">{stats.judges}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-ink-500">Mentors</p>
          <p className="font-display text-lg font-bold text-emerald-600">{stats.mentors}</p>
        </div>
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-ink-500">Banned</p>
          <p className="font-display text-lg font-bold text-ink-600">{stats.banned}</p>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-medium text-ink-700">
            <span className="font-bold text-red-700">{selectedIds.size}</span> user{selectedIds.size > 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={bulkDeleting}
              className="gap-1.5"
              onClick={() => setConfirm({
                title: `Delete ${selectedIds.size} user${selectedIds.size > 1 ? 's' : ''}`,
                body: `Permanently delete ${selectedIds.size} user account${selectedIds.size > 1 ? 's' : ''}? This removes their profile, team membership, evaluations, mentor notes, and notifications. This cannot be undone.`,
                variant: 'danger',
                confirmLabel: `Delete ${selectedIds.size} user${selectedIds.size > 1 ? 's' : ''}`,
                action: bulkDelete,
              })}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onRowClick={(row) => setDrawerUser(row)}
      />

      {/* User Detail Drawer */}
      <AdminDrawer
        open={Boolean(drawerUser)}
        title={drawerUser?.displayName || drawerUser?.email || 'User'}
        onClose={() => setDrawerUser(null)}
        footer={drawerUser && !isSuperAdmin(drawerUser.email) ? (
          <div className="flex flex-wrap gap-2">
            {drawerUser.role === 'banned' ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => unbanUser(drawerUser.id)}>
                <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Unban
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                disabled={busy}
                onClick={() => setConfirm({
                  title: 'Ban user',
                  body: `Ban "${drawerUser.displayName || drawerUser.email}"? They won't be able to access any features.`,
                  variant: 'danger',
                  action: () => banUser(drawerUser.id),
                })}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" /> Ban
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="border-red-500/40 text-red-700 hover:bg-red-500/10"
              disabled={busy}
              onClick={() => setConfirm({
                title: 'Delete user',
                body: `Permanently delete "${drawerUser.displayName || drawerUser.email}"? This removes their profile, team membership, evaluations, mentor notes, and notifications. This cannot be undone.`,
                variant: 'danger',
                confirmLabel: 'Delete permanently',
                action: () => deleteUser(drawerUser.id),
              })}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        ) : drawerUser && isSuperAdmin(drawerUser.email) ? (
          <p className="flex items-center gap-2 text-xs text-amber-600">
            <Crown className="h-4 w-4" /> Super Admin — protected account
          </p>
        ) : null}
      >
        {drawerUser && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Name</dt>
              <dd className="mt-1 text-ink-900">{drawerUser.displayName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Email</dt>
              <dd className="mt-1 text-ink-900">{drawerUser.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Role</dt>
              <dd className="mt-1">
                <Badge tone={roleTones[drawerUser.role] || 'neutral'}>{drawerUser.role || 'participant'}</Badge>
                {isSuperAdmin(drawerUser.email) && <Badge tone="warn" className="ml-2">Super Admin</Badge>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Team</dt>
              <dd className="mt-1 text-ink-700">{drawerUser.teamId || 'No team'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Institute</dt>
              <dd className="mt-1 text-ink-700">{drawerUser.institute || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Joined</dt>
              <dd className="mt-1 text-ink-700">{formatDate(drawerUser.createdAt) || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Last Updated</dt>
              <dd className="mt-1 text-ink-700">{formatDate(drawerUser.updatedAt) || '—'}</dd>
            </div>
            {drawerUser.bannedAt && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-xs font-semibold text-red-700">Banned</p>
                <p className="text-xs text-red-600">At: {formatDate(drawerUser.bannedAt) || '—'}</p>
              </div>
            )}
          </dl>
        )}
      </AdminDrawer>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        variant={confirm?.variant || 'primary'}
        onCancel={() => !busy && setConfirm(null)}
        onConfirm={() => confirm?.action?.()}
        busy={busy}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
      >
        {confirm?.body}
      </ConfirmModal>
    </div>
  )
}
