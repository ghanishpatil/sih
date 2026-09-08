import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Square, Tag, Layers, BookOpen, Users, Search, ChevronDown, ChevronRight, Upload, Download } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { useEvent } from '@/context/EventContext.jsx'
import { publicApi } from '@/services/api.js'
import {
  displayCategory,
  displayDepartment,
  displayOrganization,
  displayTheme,
} from '@/utils/problemStatementDisplay.js'
import { ROLES } from '@/utils/roles.js'
import { PS_THEMES, PS_CATEGORIES, DEPARTMENTS as APP_DEPARTMENTS } from '@/utils/constants.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Tabs } from '@/components/ui/Tabs.jsx'

/** Normalize a team name/code for case-insensitive matching. */
function normTeamKey(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Parse a CSV/text file of team names — one per line; an optional
 * "team"/"name" header row is skipped. Values may be double-quoted (Excel style).
 */
function parseTeamNameList(text) {
  const cleaned = String(text || '').replace(/^\uFEFF/, '')
  const unquote = (s) => {
    let v = s.trim()
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"')
    return v.trim()
  }
  const lines = cleaned.split(/\r?\n/).map(unquote).filter(Boolean)
  if (lines.length === 0) return []
  const headers = ['team', 'name', 'team name', 'teamname', 'team_name', 'teams']
  const start = headers.includes(lines[0].toLowerCase()) ? 1 : 0
  return lines.slice(start)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOMAINS = PS_THEMES
const TRACKS = PS_CATEGORIES

// Departments come from the shared constants list (same one the participant
// registration form uses). A judge assigned to a department evaluates every team
// whose (leader's) department matches.
const DEPARTMENTS = APP_DEPARTMENTS

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Department jury panel builder.
 *
 * The admin picks a department, sets how many judges will sit on its panel
 * (the limit), then fills the ordered slots — slot 1 is "Judge 1", slot 2 is
 * "Judge 2". Order is a LABEL only; it carries no scoring weight. Every judge
 * on the panel scores each team in that department independently, and the
 * team's final score is the average once all of them submit.
 */
function JuryPanelBuilder({
  departments, panels, judges, teams, teamCounts, teamsWithoutDepartment, maxPanelSize,
  panelDept, onDeptChange, panelRoom, setPanelRoom, panelLimit, setPanelLimit,
  panelSlots, setPanelSlots, saving, onSave, onEditRoom, onAssignTeamRoom,
}) {
  const roomCount = Object.values(panels).reduce((n, p) => n + (p?.rooms?.length || 0), 0)
  const judgeLabel = (uid) => {
    const j = judges.find((u) => u.id === uid)
    return j ? j.email || j.displayName || uid : uid
  }

  // Rooms configured for the department currently being edited.
  const deptRooms = (panelDept && Array.isArray(panels[panelDept]?.rooms)) ? panels[panelDept].rooms : []
  // Teams in the selected department (for the room-assignment table).
  const deptTeams = panelDept
    ? teams
        .filter((t) => String(t.department || '').trim() === panelDept)
        .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)))
    : []
  // How many teams sit in each room of the selected department.
  const roomTeamCount = (room) =>
    deptTeams.filter((t) => String(t.juryRoom || '').trim() === room).length

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
            <Users className="h-4 w-4 text-brand-500" />
            Jury panels (by department &amp; room)
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-600">
            Pick a department, enter a <strong>room</strong>, choose how many judges sit in it, then
            assign Judge 1, Judge 2… Each room&apos;s judges see and score <strong>only the teams assigned
            to that room</strong>, independently — a team&apos;s final score is the{' '}
            <strong>average of its room&apos;s judges</strong>, calculated once all of them submit. Assign
            teams to rooms in the table below.
          </p>
        </div>
        <Badge tone={roomCount > 0 ? 'success' : 'neutral'}>{roomCount} room panel(s) configured</Badge>
      </div>

      {teamsWithoutDepartment > 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          <span className="mt-0.5 shrink-0 font-bold">!</span>
          <p>
            <strong>{teamsWithoutDepartment} team(s) have no department set</strong> — they will not appear
            for any panel and cannot receive a final score. Department is captured from the team
            leader during registration.
          </p>
        </div>
      ) : null}

      {/* Editor */}
      <div className="mt-5 grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="panel-dept" className="mb-1.5 block text-sm font-medium text-ink-700">Department</label>
          <select
            id="panel-dept"
            value={panelDept}
            onChange={(e) => onDeptChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Choose a department…</option>
            {departments.map((d) => {
              const count = teamCounts[d] || 0
              const size = panels[d]?.rooms?.length || 0
              return (
                <option key={d} value={d}>
                  {d} — {count} team(s){size > 0 ? ` · ${size} room(s)` : ''}
                </option>
              )
            })}
          </select>
        </div>
        <div>
          <label htmlFor="panel-room" className="mb-1.5 block text-sm font-medium text-ink-700">Room no.</label>
          <input
            id="panel-room"
            type="text"
            value={panelRoom}
            disabled={!panelDept}
            onChange={(e) => setPanelRoom(e.target.value)}
            placeholder="e.g. 401"
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 disabled:opacity-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label htmlFor="panel-limit" className="mb-1.5 block text-sm font-medium text-ink-700">
            Judges in this room (limit)
          </label>
          <select
            id="panel-limit"
            value={panelLimit}
            disabled={!panelDept}
            onChange={(e) => setPanelLimit(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 disabled:opacity-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {Array.from({ length: maxPanelSize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} judge{n === 1 ? '' : 's'}</option>
            ))}
          </select>
        </div>

        {panelDept ? (
          <div className="sm:col-span-3">
            <p className="mb-2 text-sm font-medium text-ink-700">
              Room judges <span className="text-ink-400">(order is the Judge 1 / Judge 2 label)</span>
            </p>
            <div className="space-y-2">
              {panelSlots.map((uid, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 rounded-lg bg-brand-500/10 px-2 py-1.5 text-center text-xs font-bold text-brand-700">
                    Judge {idx + 1}
                  </span>
                  <select
                    value={uid}
                    onChange={(e) =>
                      setPanelSlots((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                    }
                    aria-label={`Judge ${idx + 1} for ${panelDept} room ${panelRoom || ''}`}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">— empty —</option>
                    {judges.map((u) => (
                      <option key={u.id} value={u.id}>{u.email || u.displayName || u.id}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" disabled={saving || !panelRoom.trim()} onClick={() => void onSave()}>
                {saving ? 'Saving…' : panelRoom.trim() ? `Save room ${panelRoom.trim()}` : 'Enter a room no.'}
              </Button>
              <span className="text-xs text-ink-500">
                Leave every slot empty and save to delete this room.
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-500 sm:col-span-3">
            Pick a department above to build its rooms.
          </p>
        )}
      </div>

      {/* Rooms of the selected department + team assignment */}
      {panelDept ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Existing rooms for this department */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Rooms in {panelDept}
            </p>
            {deptRooms.length === 0 ? (
              <p className="text-sm text-ink-500">No rooms yet — add one above.</p>
            ) : (
              <div className="space-y-2">
                {deptRooms.map((r) => (
                  <div
                    key={r.room}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">Room {r.room}</p>
                      <p className="text-xs text-ink-500">
                        {roomTeamCount(r.room)} team(s) · {r.judges.length} of {r.limit} judge(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.judges.map((uid, i) => (
                        <Badge key={uid} tone="brand" className="text-[10px]">
                          J{i + 1}: {judgeLabel(uid)}
                        </Badge>
                      ))}
                      <Button type="button" size="sm" variant="secondary" onClick={() => onEditRoom(panelDept, r.room)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign teams to rooms */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Assign {panelDept} teams to a room
            </p>
            {deptRooms.length === 0 ? (
              <p className="text-sm text-ink-500">Add at least one room first.</p>
            ) : deptTeams.length === 0 ? (
              <p className="text-sm text-ink-500">No teams in this department yet.</p>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-2">
                {deptTeams.map((t) => {
                  const cur = String(t.juryRoom || '').trim()
                  const known = deptRooms.some((r) => r.room === cur)
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-800" title={t.name || t.id}>
                        {t.name || t.id}
                      </span>
                      <select
                        value={cur}
                        onChange={(e) => onAssignTeamRoom(t.id, e.target.value)}
                        aria-label={`Room for ${t.name || t.id}`}
                        className="h-9 w-32 shrink-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="">— unassigned —</option>
                        {deptRooms.map((r) => (
                          <option key={r.room} value={r.room}>Room {r.room}</option>
                        ))}
                        {cur && !known ? <option value={cur}>Room {cur} (removed)</option> : null}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function MetaRow({ label, value }) {
  const v = String(value || '').trim()
  if (!v) return null
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-ink-800">{v}</dd>
    </div>
  )
}

/** Returns true if a judge's judgeAssignments array covers the given domain+track combo */
function judgeCoversCombo(judgeAssignments, domain, track) {
  if (!Array.isArray(judgeAssignments)) return false
  return judgeAssignments.some((a) => {
    const domainMatch = !a.domain || a.domain === domain
    const trackMatch = !a.track || a.track === track
    return domainMatch && trackMatch
  })
}

/**
 * Get the domain of a PS — stored as `theme` (primary) or `domain` (legacy).
 * This mirrors the backend mentor matching logic.
 */
function getPsDomain(ps) {
  return String(ps.theme || ps.domain || '').trim()
}

/**
 * Get the track of a PS — stored as `category`.
 * This mirrors the backend mentor matching logic.
 */
function getPsTrack(ps) {
  return String(ps.category || '').trim()
}

/** Count how many PS in the list match a domain+track combo */
function countMatchingPs(problems, domain, track) {
  return problems.filter((ps) => {
    const psDomain = getPsDomain(ps)
    const psTrack = getPsTrack(ps)
    const domainMatch = !domain || psDomain === domain
    const trackMatch = !track || psTrack === track
    return domainMatch && trackMatch
  }).length
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProblemAssignmentCard({ ps, checked, onToggle }) {
  const desc = String(ps.description || '').trim()
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-[rgb(var(--border))] p-3 transition-colors hover:bg-[rgb(var(--surface-muted))]/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 shrink-0 rounded border-[rgb(var(--border))]"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium text-ink-900 text-sm">{ps.title || ps.id}</p>
        <p className="font-mono text-[11px] text-ink-400">{ps.id}</p>
        {desc ? (
          <p className="line-clamp-2 text-xs text-ink-600">{desc}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {displayOrganization(ps) ? <Badge tone="neutral" className="text-[10px]">{displayOrganization(ps)}</Badge> : null}
          {displayCategory(ps) ? <Badge tone="brand" className="text-[10px]">{displayCategory(ps)}</Badge> : null}
          {ps.track ? <Badge tone={ps.track === 'Software' ? 'success' : 'warn'} className="text-[10px]">{ps.track}</Badge> : null}
          <span className="text-[11px] text-ink-400">{ps.selectionCount ?? 0} team(s)</span>
        </div>
      </div>
    </label>
  )
}

/** Domain × Track grid cell */
function DomainTrackCell({ domain, track, covered, psCount, onToggle, busy }) {
  return (
    <button
      type="button"
      disabled={busy || psCount === 0}
      onClick={onToggle}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all
        ${covered
          ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30'
          : psCount === 0
            ? 'cursor-not-allowed border-[rgb(var(--border))] opacity-40'
            : 'border-[rgb(var(--border))] hover:border-brand-500/30 hover:bg-[rgb(var(--surface-muted))]/40'
        }
        ${busy ? 'opacity-60' : ''}
      `}
    >
      <div className="flex w-full items-center justify-between gap-2">
        {covered
          ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" />
          : <Square className="h-4 w-4 shrink-0 text-ink-400" />
        }
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${psCount === 0 ? 'text-ink-400' : 'text-ink-600'}`}>
          {psCount} PS
        </span>
      </div>
      <span className="text-xs font-medium text-ink-800 leading-tight">{domain}</span>
      <Badge tone={track === 'Software' ? 'success' : 'warn'} className="text-[10px]">{track}</Badge>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminJuryPage() {
  usePageSeo({ title: 'Jury Management', description: 'Assign judges to problem statements.' })
  const api = useApi()
  const { eventId } = useEvent()

  const [users, setUsers] = useState([])
  const [problems, setProblems] = useState([])
  const [teams, setTeams] = useState([])
  const [judgeId, setJudgeId] = useState('')
  const [selectedProblems, setSelectedProblems] = useState([])
  const [teamSearch, setTeamSearch] = useState('')
  const [statusSearch, setStatusSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | confirmed | qualified | waitlisted | unset
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('domain') // 'domain' | 'ps' | 'team'
  const [hideAssignedElsewhere, setHideAssignedElsewhere] = useState(true) // By Team tab: hide teams already taken by another judge
  const [clearingTeams, setClearingTeams] = useState(false) // By Team tab: bulk-clear in progress
  const [showClearConfirm, setShowClearConfirm] = useState(false) // By Team tab: confirm the bulk clear
  const [bulkCsvResult, setBulkCsvResult] = useState(null) // By Team tab: parsed CSV match result
  const [bulkAssigning, setBulkAssigning] = useState(false) // By Team tab: bulk CSV assign in progress
  // Expandable team rows: show full member details on click.
  const [expandedTeamId, setExpandedTeamId] = useState('')
  const [teamMembers, setTeamMembers] = useState({}) // teamId → { loading, members }

  // ── Jury panels (department-wise, ordered judges) ──────────────────────────
  const [panels, setPanels] = useState({}) // department → { limit, judges: [uid] }
  const [panelTeamCounts, setPanelTeamCounts] = useState({})
  const [teamsWithoutDepartment, setTeamsWithoutDepartment] = useState(0)
  const [maxPanelSize, setMaxPanelSize] = useState(5)
  const [panelDept, setPanelDept] = useState('')
  const [panelRoom, setPanelRoom] = useState('') // room being edited within panelDept
  const [panelLimit, setPanelLimit] = useState(2)
  const [panelSlots, setPanelSlots] = useState([]) // ordered uids; index 0 = Judge 1
  const [panelSaving, setPanelSaving] = useState(false)

  // ── Official per-team final scores (average of the panel's judges) ─────────
  const [finalScores, setFinalScores] = useState([])
  const [scoresLoading, setScoresLoading] = useState(true)
  const [offPanelTotal, setOffPanelTotal] = useState(0)

  const refreshData = useCallback(async () => {
    try {
      const [usersData, problemsData, teamsData, panelData] = await Promise.all([
        api.listUsers(),
        publicApi.listProblemStatements(eventId || undefined),
        api.adminTeams().catch(() => []),
        api.getJudgePanels().catch(() => null),
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setProblems(Array.isArray(problemsData) ? problemsData : [])
      setTeams(Array.isArray(teamsData) ? teamsData : [])
      if (panelData) {
        setPanels(panelData.panels && typeof panelData.panels === 'object' ? panelData.panels : {})
        setPanelTeamCounts(panelData.teamCounts || {})
        setTeamsWithoutDepartment(Number(panelData.teamsWithoutDepartment) || 0)
        if (typeof panelData.maxPanelSize === 'number') setMaxPanelSize(panelData.maxPanelSize)
      }
    } catch {
      setUsers([])
      setProblems([])
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [api, eventId])

  const refreshScores = useCallback(async () => {
    setScoresLoading(true)
    try {
      const res = await api.getTeamFinalScores()
      setFinalScores(Array.isArray(res?.items) ? res.items : [])
      setOffPanelTotal(Number(res?.offPanelTotal) || 0)
    } catch {
      setFinalScores([])
      setOffPanelTotal(0)
    } finally {
      setScoresLoading(false)
    }
  }, [api])

  useEffect(() => { void refreshData() }, [refreshData])
  useEffect(() => { void refreshScores() }, [refreshScores])

  // Switching department resets the editor for a fresh room entry. Rooms are
  // loaded explicitly via editRoom() so typing a new room number never clobbers
  // the judge slots (there is deliberately NO auto-load effect on panelDept).
  function onPanelDeptChange(dept) {
    setPanelDept(dept)
    setPanelRoom('')
    setPanelLimit(2)
    setPanelSlots([])
    setMsg('')
  }

  // Load an existing room's judges into the editor for editing.
  function editRoom(dept, room) {
    const r = (panels[dept]?.rooms || []).find((x) => x.room === room)
    const limit = typeof r?.limit === 'number' && r.limit > 0 ? r.limit : 2
    const judgesList = Array.isArray(r?.judges) ? r.judges : []
    setPanelDept(dept)
    setPanelRoom(room)
    setPanelLimit(limit)
    setPanelSlots(Array.from({ length: limit }, (_, i) => judgesList[i] || ''))
    setMsg('')
  }

  // Assign (or clear) a team's room, then refresh panels + scores.
  async function assignTeamRoom(teamId, room) {
    setMsg('')
    try {
      await api.assignTeamRoom({ teamId, room })
      await refreshData()
      await refreshScores()
    } catch (e) {
      setMsg(e.message || 'Could not assign the room')
    }
  }

  // Keep the number of judge slots in sync with the limit.
  useEffect(() => {
    setPanelSlots((prev) => {
      const next = Array.from({ length: panelLimit }, (_, i) => prev[i] || '')
      return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next
    })
  }, [panelLimit])

  async function savePanel() {
    if (!panelDept) { setMsg('Pick a department first.'); return }
    const room = panelRoom.trim()
    if (!room) { setMsg('Enter a room number/name.'); return }
    const chosen = panelSlots.map((s) => String(s || '').trim()).filter(Boolean)
    if (new Set(chosen).size !== chosen.length) {
      setMsg('The same judge cannot occupy two slots in one room.')
      return
    }
    setPanelSaving(true)
    setMsg('')
    try {
      await api.setJudgePanel({ department: panelDept, room, limit: panelLimit, judges: chosen })
      setMsg(
        chosen.length === 0
          ? `Room ${room} cleared for ${panelDept}.`
          : `Room ${room} saved for ${panelDept} — ${chosen.length} of ${panelLimit} judge(s) assigned.`,
      )
      setPanelRoom('')
      setPanelLimit(2)
      setPanelSlots([])
      await refreshData()
      await refreshScores()
    } catch (e) {
      setMsg(e.message || 'Could not save the room panel')
    } finally {
      setPanelSaving(false)
    }
  }

  // When judge changes, load their current PS assignments
  useEffect(() => {
    if (judgeId) {
      const judge = users.find((u) => u.id === judgeId)
      setSelectedProblems(Array.isArray(judge?.assignedProblemStatementIds) ? judge.assignedProblemStatementIds : [])
    } else {
      setSelectedProblems([])
    }
  }, [judgeId, users])

  const selectedJudge = useMemo(() => users.find((u) => u.id === judgeId), [judgeId, users])
  const judges = useMemo(() => users.filter((u) => u.role === ROLES.JUDGE), [users])

  // Map judge uid → display label (for showing which judge a team is already assigned to)
  const judgeLabelById = useMemo(() => {
    const m = {}
    for (const u of users) m[u.id] = u.email || u.displayName || u.id
    return m
  }, [users])

  // ── PS assignment ──────────────────────────────────────────────────────────

  async function savePsAssignment() {
    setMsg('')
    if (!judgeId) { setMsg('Please select a judge.'); return }
    setSaving(true)
    try {
      await api.assignJudgeProblems({ judgeId, problemStatementIds: selectedProblems, eventId })
      setMsg(selectedProblems.length === 0 ? 'PS assignments cleared.' : 'PS assignments saved.')
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function toggleProblem(psId) {
    setSelectedProblems((prev) => prev.includes(psId) ? prev.filter((id) => id !== psId) : [...prev, psId])
  }

  // ── Domain+Track assignment ────────────────────────────────────────────────

  async function toggleDomainTrack(domain, track) {
    if (!judgeId) return
    setMsg('')
    setSaving(true)
    const judgeAssignments = selectedJudge?.judgeAssignments || []
    const covered = judgeCoversCombo(judgeAssignments, domain, track)
    try {
      if (covered) {
        await api.unassignJudgeDomainTrack({ judgeId, domain, track })
        setMsg(`Removed: ${domain} / ${track}`)
      } else {
        await api.assignJudgeDomainTrack({ judgeId, domain, track })
        setMsg(`Assigned: ${domain} / ${track}`)
      }
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Department assignment ──────────────────────────────────────────────────

  async function toggleDepartment(dept) {
    if (!judgeId) return
    setMsg('')
    setSaving(true)
    const assigned = Array.isArray(selectedJudge?.assignedDepartments) && selectedJudge.assignedDepartments.includes(dept)
    try {
      if (assigned) {
        await api.unassignJudgeDepartment({ judgeId, department: dept })
        setMsg(`Removed department: ${dept}`)
      } else {
        await api.assignJudgeDepartment({ judgeId, department: dept })
        setMsg(`Assigned department: ${dept}`)
      }
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Direct team assignment ─────────────────────────────────────────────────

  async function toggleTeamAssign(teamId) {
    if (!judgeId) return
    setMsg('')
    setSaving(true)
    const team = teams.find((t) => t.id === teamId)
    const assigned = Array.isArray(team?.judgeIds) && team.judgeIds.includes(judgeId)
    try {
      if (assigned) {
        await api.unassignJudgeTeam({ judgeId, teamId })
        setMsg('Removed team assignment.')
      } else {
        await api.assignJudgeTeam({ judgeId, teamId })
        setMsg('Assigned team.')
      }
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  // Bulk reset: clear ALL direct team→judge assignments (round-2) for the event.
  // Domain/track and PS assignments are untouched.
  async function clearAllTeamAssignments() {
    setMsg('')
    setClearingTeams(true)
    try {
      const res = await api.clearJudgeTeamAssignments({ eventId })
      setMsg(`Round-2 team assignments cleared (${res?.cleared ?? 0} team(s)).`)
      setShowClearConfirm(false)
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Could not clear team assignments')
    } finally {
      setClearingTeams(false)
    }
  }

  // CSV bulk assign: parse a file of team names and match against loaded teams.
  function onBulkCsvFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const names = parseTeamNameList(String(reader.result || ''))
      const byName = new Map()
      const byCode = new Map()
      for (const t of teams) {
        const nk = normTeamKey(t.name)
        if (nk) { if (!byName.has(nk)) byName.set(nk, []); byName.get(nk).push(t) }
        const ck = normTeamKey(t.inviteCode)
        if (ck) byCode.set(ck, t)
      }
      const matched = []
      const unmatched = []
      const ambiguous = []
      const seen = new Set()
      const matchedIds = new Set()
      for (const raw of names) {
        const k = normTeamKey(raw)
        if (!k || seen.has(k)) continue
        seen.add(k)
        const nameHits = byName.get(k) || []
        const codeHit = byCode.get(k)
        if (nameHits.length === 1) {
          const t = nameHits[0]
          if (!matchedIds.has(t.id)) { matched.push({ raw, team: t }); matchedIds.add(t.id) }
        } else if (nameHits.length > 1) {
          // Duplicate team names — fall back to a code match, else flag ambiguous.
          if (codeHit && !matchedIds.has(codeHit.id)) { matched.push({ raw, team: codeHit }); matchedIds.add(codeHit.id) }
          else ambiguous.push(raw)
        } else if (codeHit && !matchedIds.has(codeHit.id)) {
          matched.push({ raw, team: codeHit }); matchedIds.add(codeHit.id)
        } else {
          unmatched.push(raw)
        }
      }
      setBulkCsvResult({ matched, unmatched, ambiguous, fileName: file.name })
      setMsg('')
    }
    reader.onerror = () => setMsg('Could not read the file.')
    reader.readAsText(file)
  }

  async function runBulkCsvAssign() {
    if (!judgeId) { setMsg('Please select a judge first.'); return }
    const ids = (bulkCsvResult?.matched || []).map((m) => m.team.id)
    if (ids.length === 0) { setMsg('No matched teams to assign.'); return }
    setBulkAssigning(true)
    setMsg('')
    try {
      const res = await api.assignJudgeTeamsBulk({ judgeId, teamIds: ids })
      setMsg(`Assigned ${res?.assigned ?? ids.length} team(s) to this judge.`)
      setBulkCsvResult(null)
      await refreshData()
    } catch (e) {
      setMsg(e.message || 'Bulk assign failed')
    } finally {
      setBulkAssigning(false)
    }
  }

  // Downloads a ready-to-edit CSV pre-filled with the actual team names (one per
  // line, `team` header). The admin deletes the rows they don't want, then
  // re-uploads — this guarantees exact-name matches with zero typos.
  function downloadTeamTemplate() {
    const esc = (v) => {
      const s = String(v ?? '')
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const names = teams
      .map((t) => t.name)
      .filter((n) => typeof n === 'string' && n.trim())
      .sort((a, b) => a.localeCompare(b))
    const rows = names.length ? names : ['Example Team Name']
    const csv = ['team', ...rows.map(esc)].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'judge-team-assignment-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase()
    let list = q
      ? teams.filter((t) => `${t.name || ''} ${t.inviteCode || ''} ${t.id}`.toLowerCase().includes(q))
      : teams
    // Hide teams already assigned to a DIFFERENT judge (keep unassigned teams and this judge's own).
    if (hideAssignedElsewhere) {
      list = list.filter((t) => {
        const ids = Array.isArray(t.judgeIds) ? t.judgeIds : []
        const assignedToOther = ids.some((id) => id !== judgeId)
        const assignedToCurrent = ids.includes(judgeId)
        return assignedToCurrent || !assignedToOther
      })
    }
    return [...list].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)))
  }, [teams, teamSearch, hideAssignedElsewhere, judgeId])

  const assignedTeamsForJudge = useMemo(
    () => (judgeId ? teams.filter((t) => Array.isArray(t.judgeIds) && t.judgeIds.includes(judgeId)) : []),
    [teams, judgeId],
  )

  // ── Official final scores — the average of the department panel's judges,
  //    calculated only once EVERY judge on that panel has submitted. ──────────

  const statusCounts = useMemo(() => {
    const c = { final: 0, waiting: 0, noPanel: 0 }
    for (const row of finalScores) {
      if (row.expectedCount === 0) c.noPanel++
      else if (row.isFinal) c.final++
      else c.waiting++
    }
    return c
  }, [finalScores])

  const statusTeams = useMemo(() => {
    const q = statusSearch.trim().toLowerCase()
    let list = finalScores
    if (statusFilter === 'final') list = list.filter((r) => r.isFinal)
    else if (statusFilter === 'waiting') list = list.filter((r) => r.expectedCount > 0 && !r.isFinal)
    else if (statusFilter === 'nopanel') list = list.filter((r) => r.expectedCount === 0)
    if (q) {
      list = list.filter((r) =>
        `${r.teamName || ''} ${r.department || ''} ${r.room || ''} ${r.teamId}`.toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => String(a.teamName || a.teamId).localeCompare(String(b.teamName || b.teamId)))
  }, [finalScores, statusFilter, statusSearch])

  // Toggle a team row open and lazily load its member details (leader-entered,
  // stored separately from account UIDs) — same source used by the Teams page.
  const toggleTeamDetails = useCallback(async (teamId) => {
    if (expandedTeamId === teamId) { setExpandedTeamId(''); return }
    setExpandedTeamId(teamId)
    if (teamMembers[teamId]) return // already cached
    setTeamMembers((prev) => ({ ...prev, [teamId]: { loading: true, members: [] } }))
    try {
      const res = await api.teamMemberRegistrations(teamId)
      const members = Array.isArray(res?.registrations) ? res.registrations : []
      setTeamMembers((prev) => ({ ...prev, [teamId]: { loading: false, members } }))
    } catch {
      setTeamMembers((prev) => ({ ...prev, [teamId]: { loading: false, members: [] } }))
    }
  }, [api, expandedTeamId, teamMembers])

  if (loading) return <Skeleton className="h-80 w-full rounded-2xl" />

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Jury Management</h1>
        <p className="mt-2 text-sm text-ink-600">
          Assign judges by <strong>Theme + Category</strong>, by <strong>Department</strong> (matches each team&apos;s
          department, set from its leader), or by specific <strong>Problem Statement</strong>. The methods work
          together — a judge sees teams matched by any of them.
        </p>
        {eventId ? (
          <p className="mt-1 text-xs text-ink-500">
            Event: <span className="font-medium text-ink-700">{eventId}</span>
          </p>
        ) : null}
      </div>

      {/* Status message */}
      {msg ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          msg.includes('Assigned') || msg.includes('saved') || msg.includes('cleared')
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900'
            : msg.includes('Removed')
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-900'
              : 'border-red-500/30 bg-red-500/10 text-red-900'
        }`}>
          {msg}
        </div>
      ) : null}

      {/* ── Jury panels: the ordered judge panel for each department ── */}
      <JuryPanelBuilder
        departments={DEPARTMENTS}
        panels={panels}
        judges={judges}
        teams={teams}
        teamCounts={panelTeamCounts}
        teamsWithoutDepartment={teamsWithoutDepartment}
        maxPanelSize={maxPanelSize}
        panelDept={panelDept}
        onDeptChange={onPanelDeptChange}
        panelRoom={panelRoom}
        setPanelRoom={setPanelRoom}
        panelLimit={panelLimit}
        setPanelLimit={setPanelLimit}
        panelSlots={panelSlots}
        setPanelSlots={setPanelSlots}
        saving={panelSaving}
        onSave={savePanel}
        onEditRoom={editRoom}
        onAssignTeamRoom={assignTeamRoom}
      />

      {/* Team final scores (average of the panel's judges) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-900">Team final scores</h2>
            <p className="mt-1 text-sm text-ink-600">
              Each team is scored independently by every judge on its department panel. The final score is the{' '}
              <strong>average of those judges</strong>, and is only calculated once{' '}
              <strong>all of them have submitted</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{statusCounts.final} final</Badge>
            <Badge tone="warn">{statusCounts.waiting} awaiting judges</Badge>
            <Badge tone="neutral">{statusCounts.noPanel} no panel</Badge>
          </div>
        </div>

        {offPanelTotal > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
            <span className="mt-0.5 shrink-0 font-bold">!</span>
            <p>
              <strong>{offPanelTotal} evaluation(s) are not being counted.</strong> They were submitted
              by judges who are not on the relevant department panel, so they are excluded from the
              average. Expand a team below to see which judge, then either add them to that panel or
              ignore it.
            </p>
          </div>
        ) : null}

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'final', label: 'Final' },
            { id: 'waiting', label: 'Awaiting judges' },
            { id: 'nopanel', label: 'No panel' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.id ? 'bg-brand-500 text-white' : 'bg-[rgb(var(--surface-muted))] text-ink-600 hover:bg-[rgb(var(--border))]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={statusSearch}
            onChange={(e) => setStatusSearch(e.target.value)}
            placeholder="Search team by name or department…"
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2.5 pl-9 pr-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {scoresLoading ? (
          <p className="mt-4 text-sm text-ink-500">Loading final scores…</p>
        ) : finalScores.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No teams found yet.</p>
        ) : statusTeams.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No teams match this filter.</p>
        ) : (
          <div className="mt-4 max-h-[34rem] space-y-2 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-3">
            {statusTeams.map((row) => {
              const t = row
              const isOpen = expandedTeamId === t.teamId
              const detail = teamMembers[t.teamId]
              return (
                <div key={t.teamId} className="rounded-xl border border-[rgb(var(--border))]">
                  <button
                    type="button"
                    onClick={() => toggleTeamDetails(t.teamId)}
                    className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-[rgb(var(--surface-muted))]/40"
                  >
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-brand-600" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-sm font-medium text-ink-900">{t.teamName || 'Unnamed team'}</span>
                      <p className="text-xs text-ink-500">
                        {t.department
                          ? <span>{t.department}</span>
                          : <span className="text-amber-700">No department set</span>}
                        {t.room ? <span> · Room {t.room}</span> : null}
                        {t.problemStatementId ? <span> · PS <span className="font-mono">{t.problemStatementId}</span></span> : ''}
                        {t.expectedCount > 0
                          ? <span> · {t.submittedCount}/{t.expectedCount} judges submitted</span>
                          : null}
                      </p>
                    </div>
                    {t.expectedCount === 0 ? (
                      <Badge tone="neutral" className="shrink-0 text-xs">No panel</Badge>
                    ) : t.isFinal ? (
                      <span className="shrink-0 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-sm font-bold text-emerald-700">
                        {t.finalScore}%
                      </span>
                    ) : (
                      <Badge tone="warn" className="shrink-0 text-xs">
                        {t.submittedCount}/{t.expectedCount} submitted
                      </Badge>
                    )}
                  </button>

                  {isOpen ? (
                    <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-3">
                      {/* Scores from judges who are NOT on this team's panel. They are
                          NOT counted in the average — surfaced so no work is lost silently. */}
                      {t.offPanelJudges && t.offPanelJudges.length > 0 ? (
                        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Not counted — judge(s) off this panel
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {t.offPanelJudges.map((j) => (
                              <div key={j.uid} className="flex items-center justify-between gap-2 text-xs text-amber-900">
                                <span className="min-w-0 truncate">{j.name}</span>
                                <span className="shrink-0 font-mono font-bold">
                                  {typeof j.scorePct === 'number' ? `${j.scorePct}%` : 'submitted'}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[11px] leading-snug text-amber-800">
                            These judges scored this team but are not on the{' '}
                            {t.department || 'department'} panel, so their scores are excluded from the
                            average. Add them to the panel to include them, or ignore.
                          </p>
                        </div>
                      ) : null}

                      {/* Per-judge breakdown for this team's panel */}
                      <div className="mb-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                          Panel {t.department ? `· ${t.department}` : ''}{t.room ? ` · Room ${t.room}` : ''}
                        </p>
                        {t.judges && t.judges.length > 0 ? (
                          <div className="mt-2 space-y-1.5">
                            {t.judges.map((j) => (
                              <div key={j.position} className="flex items-center justify-between gap-2 text-xs">
                                <span className="min-w-0 truncate text-ink-700">
                                  <span className="font-semibold text-ink-500">Judge {j.position}:</span>{' '}
                                  {j.name || j.uid}
                                </span>
                                {j.submitted ? (
                                  <span className="shrink-0 font-mono font-bold text-ink-900">
                                    {typeof j.scorePct === 'number' ? `${j.scorePct}%` : 'submitted'}
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-amber-700">
                                    {j.state === 'in-progress' ? 'in progress' : 'not started'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-ink-500">{t.message}</p>
                        )}
                        <p className="mt-2 border-t border-[rgb(var(--border))] pt-2 text-xs text-ink-600">
                          {t.isFinal ? (
                            <>Final score <strong className="text-ink-900">{t.finalScore}%</strong> — {t.message}</>
                          ) : (
                            t.message
                          )}
                        </p>
                      </div>

                      {detail?.loading ? (
                        <p className="text-xs text-ink-400">Loading team members…</p>
                      ) : detail && detail.members.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                            Team members ({detail.members.length})
                          </p>
                          {detail.members
                            .slice()
                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                            .map((m) => (
                              <div key={m.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-ink-900">{m.name || '—'}</span>
                                  {m.isLeader ? <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Leader</span> : null}
                                </div>
                                <div className="mt-1 grid gap-x-3 gap-y-0.5 text-[11px] text-ink-600 sm:grid-cols-2">
                                  {m.email ? <span className="truncate">✉ {m.email}</span> : null}
                                  {m.phone ? <span>☎ {m.phone}</span> : null}
                                  {m.institute ? <span className="truncate">🏫 {m.institute}</span> : null}
                                  {m.prn ? <span className="truncate">🆔 PRN {m.prn}</span> : null}
                                  {m.yearOfStudy ? <span>🎓 {m.yearOfStudy}</span> : null}
                                  {m.department ? <span className="truncate">🏷 {m.department}</span> : null}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-400">No member details recorded for this team.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Judge selector */}
      <Card>
        <h2 className="font-display text-lg font-semibold text-ink-900">Select judge</h2>
        <div className="mt-4">
          <select
            className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"
            value={judgeId}
            onChange={(e) => { setJudgeId(e.target.value); setMsg('') }}
          >
            <option value="">Choose a judge…</option>
            {judges.map((u) => {
              const psCount = u.assignedProblemStatementIds?.length || 0
              const dtCount = u.judgeAssignments?.length || 0
              const deptCount = u.assignedDepartments?.length || 0
              const summary = [
                psCount > 0 ? `${psCount} PS` : '',
                dtCount > 0 ? `${dtCount} domain/track` : '',
                deptCount > 0 ? `${deptCount} dept` : '',
              ].filter(Boolean).join(', ')
              return (
                <option key={u.id} value={u.id}>
                  {u.email || u.displayName || u.id}
                  {summary ? ` — ${summary}` : ''}
                </option>
              )
            })}
          </select>
          {judges.length === 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              No judges found. Promote users to judge role in Access Control first.
            </p>
          ) : null}
        </div>

        {/* Current assignment summary for selected judge */}
        {selectedJudge ? (
          <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-4 space-y-2">
            <p className="text-sm font-semibold text-ink-900">{selectedJudge.email || selectedJudge.displayName}</p>
            <div className="flex flex-wrap gap-2">
              {(selectedJudge.judgeAssignments || []).map((ja, i) => (
                <Badge key={i} tone="brand" className="text-[10px]">
                  {[ja.domain, ja.track].filter(Boolean).join(' / ')}
                </Badge>
              ))}
              {(selectedJudge.assignedProblemStatementIds || []).map((psId) => (
                <Badge key={psId} tone="neutral" className="font-mono text-[10px]">{psId}</Badge>
              ))}
              {(selectedJudge.assignedDepartments || []).map((dept) => (
                <Badge key={`dept-${dept}`} tone="brand" className="text-[10px]">Dept: {dept}</Badge>
              ))}
              {assignedTeamsForJudge.map((t) => (
                <Badge key={t.id} tone="success" className="text-[10px]">Team: {t.name || t.id}</Badge>
              ))}
              {!selectedJudge.judgeAssignments?.length && !selectedJudge.assignedProblemStatementIds?.length && !selectedJudge.assignedDepartments?.length && assignedTeamsForJudge.length === 0 ? (
                <span className="text-xs text-ink-500">No assignments yet</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Assignment tabs — only show when a judge is selected */}
      {judgeId ? (
        <Card>
          <Tabs
            tabs={[
              { id: 'domain', label: 'By Theme + Category', icon: Tag },
              { id: 'dept', label: 'By Department', icon: Layers },
              { id: 'ps', label: 'By Problem Statement', icon: BookOpen },
              { id: 'team', label: 'By Team', icon: Users },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pill"
          />

          {/* ── Domain + Track grid ── */}
          {activeTab === 'domain' ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-ink-600">
                Click a cell to toggle. A covered cell means the judge evaluates <em>all</em> teams whose problem
                statement belongs to that theme and category — including new ones added later.
                Greyed cells have no problem statements yet.
              </p>

              {/* Grid: rows = domains, cols = tracks */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 w-52">
                        Theme
                      </th>
                      {TRACKS.map((t) => (
                        <th key={t} className="pb-3 px-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500 w-40">
                          <Badge tone={t === 'Software' ? 'success' : 'warn'}>{t}</Badge>
                        </th>
                      ))}
                      <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                        Any category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {DOMAINS.map((domain) => {
                      const judgeAssignments = selectedJudge?.judgeAssignments || []
                      return (
                        <tr key={domain}>
                          <td className="py-2 pr-4 text-sm font-medium text-ink-800">{domain}</td>
                          {TRACKS.map((track) => {
                            const covered = judgeCoversCombo(judgeAssignments, domain, track)
                            const psCount = countMatchingPs(problems, domain, track)
                            return (
                              <td key={track} className="py-2 px-2">
                                <DomainTrackCell
                                  domain={domain}
                                  track={track}
                                  covered={covered}
                                  psCount={psCount}
                                  onToggle={() => toggleDomainTrack(domain, track)}
                                  busy={saving}
                                />
                              </td>
                            )
                          })}
                          {/* "Any track" column — domain only, no track filter */}
                          <td className="py-2 pl-4">
                            <DomainTrackCell
                              domain={domain}
                              track={null}
                              covered={judgeCoversCombo(judgeAssignments, domain, null)}
                              psCount={countMatchingPs(problems, domain, null)}
                              onToggle={() => toggleDomainTrack(domain, null)}
                              busy={saving}
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {/* "Any domain" row — track only, no domain filter */}
                    <tr>
                      <td className="py-2 pr-4 text-sm font-medium text-ink-500 italic">Any theme</td>
                      {TRACKS.map((track) => {
                        const judgeAssignments = selectedJudge?.judgeAssignments || []
                        return (
                          <td key={track} className="py-2 px-2">
                            <DomainTrackCell
                              domain={null}
                              track={track}
                              covered={judgeCoversCombo(judgeAssignments, null, track)}
                              psCount={countMatchingPs(problems, null, track)}
                              onToggle={() => toggleDomainTrack(null, track)}
                              busy={saving}
                            />
                          </td>
                        )
                      })}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-ink-400">
                Changes save immediately on click. No separate save button needed for domain/track assignments.
              </p>
            </div>
          ) : null}

          {/* ── By Department grid ── */}
          {activeTab === 'dept' ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-ink-600">
                Click a department to toggle. The judge then evaluates <em>every team whose department
                matches</em> (the team&apos;s department is set from its leader) — regardless of problem
                statement. The count shows how many registered teams fall in each department.
              </p>

              {/* Access here is NOT panel membership — only panel judges count toward
                  the averaged final score. Warn so scores aren't silently discarded. */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0 font-bold">!</span>
                <p>
                  <strong>This grants access only — it does not build a panel.</strong> A judge added
                  here can score teams, but their score is <strong>excluded from the team&apos;s
                  averaged final score</strong> unless they are also on that department&apos;s panel.
                  Use <strong>Jury panels (by department)</strong> at the top of this page to set who
                  actually counts.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {DEPARTMENTS.map((dept) => {
                  const assigned = Array.isArray(selectedJudge?.assignedDepartments) && selectedJudge.assignedDepartments.includes(dept)
                  const teamCount = teams.filter((t) => String(t.department || '').trim() === dept).length
                  return (
                    <button
                      key={dept}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleDepartment(dept)}
                      aria-pressed={assigned}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all
                        ${assigned
                          ? 'border-brand-500/50 bg-brand-500/10 ring-1 ring-brand-500/30'
                          : 'border-[rgb(var(--border))] hover:border-brand-500/30 hover:bg-[rgb(var(--surface-muted))]/40'
                        }
                        ${saving ? 'opacity-60' : ''}
                      `}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {assigned
                          ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" />
                          : <Square className="h-4 w-4 shrink-0 text-ink-400" />}
                        <span className="truncate text-sm font-medium text-ink-800">{dept}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        {teamCount} team{teamCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="text-xs text-ink-400">Changes save immediately on click.</p>
            </div>
          ) : null}

          {/* ── Problem Statement list ── */}
          {activeTab === 'ps' ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-ink-600">
                Tick specific problem statements. Use this for fine-grained control when domain/track coverage is too broad.
              </p>
              {problems.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No problem statements found. Create them on the{' '}
                  <Link to="/admin/problems" className="font-medium text-brand-600 underline-offset-2 hover:underline">
                    Problem Statements
                  </Link>{' '}
                  page first.
                </p>
              ) : (
                <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-3">
                  {problems.map((ps) => (
                    <ProblemAssignmentCard
                      key={ps.id}
                      ps={ps}
                      checked={selectedProblems.includes(ps.id)}
                      onToggle={() => toggleProblem(ps.id)}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void savePsAssignment()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save PS assignments'}
                </Button>
                <span className="text-xs text-ink-500">
                  {selectedProblems.length} selected
                </span>
              </div>
            </div>
          ) : null}

          {/* ── Direct team assignment ── */}
          {activeTab === 'team' ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-ink-600">
                Assign this judge directly to specific teams. The judge can then evaluate those teams
                regardless of problem statement or domain/track. Changes save immediately.
              </p>

              {/* 2-judge panels are a DEPARTMENT feature — direct team assignment is
                  deliberately limited to a single judge per team, so it cannot be used
                  to build a panel. Warn before the admin discovers this via a 409. */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0 font-bold">!</span>
                <p>
                  <strong>One judge per team only.</strong> Direct team assignment does not support
                  2-judge panels — a second judge will be rejected, and teams assigned this way get
                  no averaged final score. To have two judges score the same team, use{' '}
                  <strong>Jury panels (by department)</strong> above instead.
                </p>
              </div>

              <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={hideAssignedElsewhere}
                  onChange={(e) => setHideAssignedElsewhere(e.target.checked)}
                  className="rounded border-[rgb(var(--border))]"
                />
                Hide teams already assigned to other judges
              </label>

              {/* Bulk reset of round-2 direct team assignments (does NOT touch domain/track or PS assignments) */}
              <div className="flex flex-wrap items-center gap-2">
                {!showClearConfirm ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving || clearingTeams}
                    className="border-red-500/40 text-red-700 hover:bg-red-500/5"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    Clear round-2 team assignments
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                    <span className="text-xs text-red-800">
                      Remove ALL direct team → judge assignments for this event? Domain/track and problem-statement assignments are not affected.
                    </span>
                    <Button type="button" size="sm" variant="danger" disabled={clearingTeams} onClick={() => void clearAllTeamAssignments()}>
                      {clearingTeams ? 'Clearing…' : 'Yes, clear all'}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={clearingTeams} onClick={() => setShowClearConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Bulk assign by CSV of team names → the selected judge */}
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-brand-600" />
                    <p className="text-sm font-semibold text-ink-900">Bulk assign by CSV (team names)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={downloadTeamTemplate}>
                      <Download className="h-3.5 w-3.5" /> Template
                    </Button>
                    <label
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-500/40 ${!judgeId ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Choose CSV
                      <input type="file" accept=".csv,.txt" className="hidden" disabled={!judgeId} onChange={onBulkCsvFile} />
                    </label>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  One team name per line (a “team” header is optional). Matched teams are added to the selected judge.
                  {judgeId ? '' : ' Select a judge above first.'}
                </p>

                {bulkCsvResult ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone="success">{bulkCsvResult.matched.length} matched</Badge>
                      {bulkCsvResult.unmatched.length > 0 ? <Badge tone="warn">{bulkCsvResult.unmatched.length} not found</Badge> : null}
                      {bulkCsvResult.ambiguous.length > 0 ? <Badge tone="danger">{bulkCsvResult.ambiguous.length} ambiguous</Badge> : null}
                      <span className="text-ink-400">from {bulkCsvResult.fileName}</span>
                    </div>
                    {(bulkCsvResult.unmatched.length > 0 || bulkCsvResult.ambiguous.length > 0) ? (
                      <div className="max-h-28 overflow-y-auto rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2 text-[11px] text-ink-600">
                        {bulkCsvResult.unmatched.map((n, i) => (
                          <p key={`u${i}`}>• <span className="font-medium text-amber-700">Not found:</span> {n}</p>
                        ))}
                        {bulkCsvResult.ambiguous.map((n, i) => (
                          <p key={`a${i}`}>• <span className="font-medium text-red-700">Multiple teams named:</span> {n} — use the team code or assign manually</p>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={bulkAssigning || bulkCsvResult.matched.length === 0}
                        onClick={() => void runBulkCsvAssign()}
                      >
                        {bulkAssigning ? 'Assigning…' : `Assign ${bulkCsvResult.matched.length} matched team(s)`}
                      </Button>
                      <Button type="button" size="sm" variant="secondary" disabled={bulkAssigning} onClick={() => setBulkCsvResult(null)}>
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search team by name or code…"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2.5 pl-9 pr-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {teams.length === 0 ? (
                <p className="text-sm text-ink-500">No teams found yet.</p>
              ) : (
                <div className="max-h-[32rem] space-y-2 overflow-y-auto rounded-xl border border-[rgb(var(--border))] p-3">
                  {filteredTeams.map((t) => {
                    const ids = Array.isArray(t.judgeIds) ? t.judgeIds : []
                    const assignedToCurrent = ids.includes(judgeId)
                    const otherJudges = ids.filter((id) => id !== judgeId).map((id) => judgeLabelById[id] || id)
                    const assignedToOther = otherJudges.length > 0
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{t.name || 'Unnamed team'}</p>
                          <p className="text-xs text-ink-500">
                            <span className="font-mono">{t.inviteCode || t.id.slice(0, 6)}</span>
                            {t.problemStatementId ? <span> · PS <span className="font-mono">{t.problemStatementId}</span></span> : ' · no PS selected'}
                          </p>
                          {assignedToOther ? (
                            <p className="mt-1 truncate text-[11px] font-medium text-amber-700">
                              Assigned to {otherJudges.join(', ')}
                            </p>
                          ) : null}
                        </div>
                        {assignedToCurrent ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving}
                            className="shrink-0"
                            onClick={() => void toggleTeamAssign(t.id)}
                          >
                            Assigned ✓ — Remove
                          </Button>
                        ) : assignedToOther ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving}
                            className="shrink-0"
                            onClick={() => void toggleTeamAssign(t.id)}
                          >
                            Also assign
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={saving}
                            className="shrink-0"
                            onClick={() => void toggleTeamAssign(t.id)}
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  {filteredTeams.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-ink-500">
                      {teamSearch.trim()
                        ? 'No teams match your search.'
                        : hideAssignedElsewhere
                          ? 'No unassigned teams left. Uncheck the filter above to see teams assigned to other judges.'
                          : 'No teams found yet.'}
                    </p>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-ink-400">{assignedTeamsForJudge.length} team(s) directly assigned to this judge.</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* ── All judges overview ── */}
      {judges.length > 0 ? (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">All judge assignments</h2>
          <div className="space-y-3">
            {judges.map((judge) => {
              const dtAssignments = judge.judgeAssignments || []
              const psAssignments = judge.assignedProblemStatementIds || []
              const assignedPs = problems.filter((p) => psAssignments.includes(p.id))
              const assignedTeams = teams.filter((t) => Array.isArray(t.judgeIds) && t.judgeIds.includes(judge.id))

              return (
                <div
                  key={judge.id}
                  className="rounded-xl border border-[rgb(var(--border))] p-4 transition-colors hover:bg-[rgb(var(--surface-muted))]/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-900">{judge.email || judge.displayName || judge.id}</p>

                      {/* Domain+Track badges */}
                      {dtAssignments.length > 0 ? (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1.5">Domain / Track</p>
                          <div className="flex flex-wrap gap-1.5">
                            {dtAssignments.map((ja, i) => (
                              <Badge key={i} tone="brand" className="text-[10px]">
                                {[ja.domain || 'Any domain', ja.track || 'Any track'].join(' / ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Specific PS */}
                      {assignedPs.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1.5">Specific PS</p>
                          <ul className="space-y-1.5">
                            {assignedPs.map((ps) => (
                              <li key={ps.id} className="flex items-center gap-2 text-xs text-ink-700">
                                <span className="font-mono text-[10px] text-ink-400">{ps.id}</span>
                                <span>{ps.title || ps.id}</span>
                                {ps.track ? <Badge tone={ps.track === 'Software' ? 'success' : 'warn'} className="text-[10px]">{ps.track}</Badge> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {/* Directly assigned teams */}
                      {assignedTeams.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1.5">Direct teams</p>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedTeams.map((t) => (
                              <Badge key={t.id} tone="success" className="text-[10px]">{t.name || t.id}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {dtAssignments.length === 0 && assignedPs.length === 0 && assignedTeams.length === 0 ? (
                        <p className="mt-1 text-xs text-ink-500">No assignments</p>
                      ) : null}
                    </div>
                    <Button variant="secondary" size="sm" className="shrink-0" onClick={() => { setJudgeId(judge.id); setMsg('') }}>
                      Edit
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
