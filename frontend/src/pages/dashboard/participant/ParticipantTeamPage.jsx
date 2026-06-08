import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Crown, Hash, Link2, LogOut, UserMinus, Users, Pencil, Github, Linkedin, Globe, X, Check, Tag } from 'lucide-react'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useParticipantWorkspace } from '@/hooks/useParticipantWorkspace.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { formatDate } from '@/utils/format.js'

const MAX_TEAM_MEMBERS = 6

export function ParticipantTeamPage() {
  usePageSeo({ title: 'My Team', description: 'Team roster and invites.' })
  const { user, refreshProfile } = useAuth()
  const { api, team, loading, refreshTeam, reload, eventCfg } = useParticipantWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()

  const [teamName, setTeamName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [roster, setRoster] = useState(null)
  const [rosterLoading, setRosterLoading] = useState(false)

  // Auto-fill invite code from URL query parameter (backward compatibility)
  useEffect(() => {
    const inviteFromUrl = searchParams.get('invite')
    if (inviteFromUrl && !team) {
      setJoinCode(inviteFromUrl.toUpperCase())
      setMsg('Invite code auto-filled from link. Click "Join team" to continue.')
      // Clear the query parameter
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, team])

  const loadRoster = useCallback(async () => {
    if (!team?.id) {
      setRoster(null)
      return
    }
    setRosterLoading(true)
    try {
      const data = await api.teamRoster()
      setRoster(data)
    } catch {
      setRoster(null)
    } finally {
      setRosterLoading(false)
    }
  }, [api, team?.id])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const formationClosed = (() => {
    if (!eventCfg) return false
    
    // Match backend logic from eventLifecycle.js allowTeamFormation()
    
    // Block if event is archived
    if (eventCfg.lifecyclePhase === 'ARCHIVED') return true
    
    // Check if using multi-phase system
    const phases = Array.isArray(eventCfg.competitionPhases) ? eventCfg.competitionPhases : []
    if (phases.length > 0) {
      // Multi-phase mode: allow team formation if any phase is not yet completed/archived
      const hasActiveOrUpcomingPhase = phases.some(p => 
        ['DRAFT', 'UPCOMING', 'ACTIVE', 'SUBMISSION_LOCKED', 'EVALUATION', 'SHORTLISTING'].includes(p.status)
      )
      
      if (!hasActiveOrUpcomingPhase) return true // All phases concluded
      
      // Allow team formation during active phases
      return false
    }
    
    // Legacy system: Block if submission deadline has passed (no point forming teams)
    if (eventCfg.submissionDeadline) {
      const deadline = new Date(eventCfg.submissionDeadline).getTime()
      const now = Date.now()
      if (deadline < now) return true
    }
    
    // Otherwise allow team formation
    return false
  })()

  async function createTeam() {
    // Pre-flight check: validate on frontend using real-time eventCfg before API call
    if (formationClosed) {
      setMsg('Team formation is not allowed at this time. Please wait for organizers to reopen registration.')
      return
    }
    
    setBusy(true)
    setMsg('')
    try {
      await api.createTeam(teamName || 'Untitled team')
      await refreshProfile()
      await refreshTeam()
      await loadRoster()
      setTeamName('')
      setMsg('Team created.')
    } catch (e) {
      setMsg(e.message || 'Could not create team')
    } finally {
      setBusy(false)
    }
  }

  async function joinTeam() {
    // Pre-flight check: validate on frontend using real-time eventCfg before API call
    if (formationClosed) {
      setMsg('Team formation is not allowed at this time. Please wait for organizers to reopen registration.')
      return
    }
    
    setBusy(true)
    setMsg('')
    try {
      await api.joinTeam(joinCode.trim().toUpperCase())
      await refreshProfile()
      await refreshTeam()
      await loadRoster()
      setJoinCode('')
      setMsg('Joined team.')
    } catch (e) {
      setMsg(e.message || 'Could not join team')
    } finally {
      setBusy(false)
    }
  }

  async function copyInviteLink() {
    const code = roster?.inviteCode || team?.inviteCode
    if (!code) return
    
    // Generate proper invite link: /join/:inviteCode (auto-detects domain)
    const url = `${globalThis.location.origin}/join/${encodeURIComponent(code)}`
    
    try {
      await navigator.clipboard.writeText(url)
      setMsg('Invite link copied to clipboard.')
    } catch {
      setMsg(`Share this link manually: ${url}`)
    }
  }

  async function removeMember(uid) {
    if (!globalThis.confirm('Remove this member from the team?')) return
    setBusy(true)
    setMsg('')
    try {
      await api.removeTeamMember(uid)
      await refreshProfile()
      await refreshTeam()
      await loadRoster()
      setMsg('Member removed.')
    } catch (e) {
      setMsg(e.message || 'Could not remove member')
    } finally {
      setBusy(false)
    }
  }

  async function leaveTeam() {
    if (!globalThis.confirm('Leave this team? You may need a new invite to rejoin.')) return
    setBusy(true)
    setMsg('')
    try {
      await api.leaveTeam()
      await refreshProfile()
      await reload()
      setRoster(null)
      setMsg('You left the team.')
    } catch (e) {
      setMsg(e.message || 'Could not leave team')
    } finally {
      setBusy(false)
    }
  }

  const uid = user?.uid
  const isLeader = roster?.leaderId === uid || team?.leaderId === uid
  const membersCount = team?.memberIds?.length ?? roster?.members?.length ?? 0
  const canInviteMore = membersCount < MAX_TEAM_MEMBERS

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-ink-900"
        >
          My team
        </motion.h1>
        <p className="mt-2 text-sm text-ink-600">
          Maximum {MAX_TEAM_MEMBERS} members per team (enforced on the server). Roster changes follow the same registration
          window as joining.
        </p>
      </div>

      {formationClosed ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-950">
            Team formation is closed for this phase or schedule. You cannot invite new members until the organizers reopen
            registration.
          </p>
        </Card>
      ) : null}

      {msg ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-4 py-3 text-sm">{msg}</p>
      ) : null}

      {!team ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Create a team</h2>
            <p className="mt-2 text-xs text-ink-500">You become the team leader and receive an invite code.</p>
            <Input
              className="mt-4"
              label="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team Phoenix"
            />
            <Button className="mt-4 w-full" disabled={busy || formationClosed} onClick={createTeam}>
              Create team
            </Button>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink-900">Join with code</h2>
            <p className="mt-2 text-xs text-ink-500">Ask your leader for the six-character code for this edition.</p>
            <Input
              className="mt-4"
              label="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="AB12CD"
            />
            <Button variant="secondary" className="mt-4 w-full gap-2" disabled={busy || formationClosed} onClick={joinTeam}>
              <Hash className="h-4 w-4" />
              Join team
            </Button>
          </Card>
        </div>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-600" />
                  <h2 className="font-display text-xl font-semibold text-ink-900">{team.name}</h2>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                  <span>Invite code:</span>
                  <Badge tone="brand">{roster?.inviteCode || team.inviteCode}</Badge>
                  <span>· {membersCount}/{MAX_TEAM_MEMBERS} members</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" className="gap-2" disabled={busy || !canInviteMore} onClick={copyInviteLink}>
                  <Link2 className="h-4 w-4" />
                  Copy invite link
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-red-600" disabled={busy} onClick={leaveTeam}>
                  <LogOut className="h-4 w-4" />
                  Leave team
                </Button>
              </div>
            </div>
            {!canInviteMore ? (
              <p className="mt-3 text-xs text-amber-700">Team is full — no additional invites.</p>
            ) : null}
          </Card>

          <Card>
            <h3 className="font-display text-lg font-semibold text-ink-900">Members</h3>
            {loading || rosterLoading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[rgb(var(--border))]">
                {(roster?.members || []).map((m) => (
                  <li key={m.uid} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 font-display text-sm font-semibold text-brand-800">
                        {(m.displayName || m.email || m.uid).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink-900">
                          {m.displayName || 'Participant'}
                          {m.uid === uid ? (
                            <span className="ml-2 text-xs font-normal text-ink-500">(you)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-ink-500">{m.email || `${m.uid.slice(0, 8)}…`}</p>
                        {team.memberDesignations?.[m.uid] && (
                          <p className="mt-0.5 text-xs text-brand-600">{team.memberDesignations[m.uid]}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.isLeader ? (
                        <Badge tone="brand" className="gap-1">
                          <Crown className="h-3 w-3" /> Leader
                        </Badge>
                      ) : null}
                      {/* Designation edit */}
                      <MemberDesignationEdit
                        memberUid={m.uid}
                        currentDesignation={team.memberDesignations?.[m.uid] || ''}
                        isLeader={isLeader}
                        isSelf={m.uid === uid}
                        api={api}
                        onSaved={loadRoster}
                        busy={busy}
                      />
                      {isLeader && m.uid !== uid ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          disabled={busy || formationClosed || Boolean(team.submissionLocked)}
                          title={team.submissionLocked ? 'Unlock submission before roster edits (admin).' : undefined}
                          onClick={() => removeMember(m.uid)}
                        >
                          <UserMinus className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only">Remove</span>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Team Profile Section */}
          <TeamProfileCard team={team} isLeader={isLeader} api={api} onSaved={refreshTeam} />

          <Card>
            <h3 className="font-display text-lg font-semibold text-ink-900">Activity</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-600">
              <li className="flex gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                <span>
                  Team record · created {team.createdAt ? formatDate(team.createdAt) : '—'}
                </span>
              </li>
              <li className="flex gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                <span>Event registration · {team.eventRegistered ? formatDate(team.eventRegisteredAt) || 'yes' : 'not yet'}</span>
              </li>
              {team.submissionLocked ? (
                <li className="flex gap-2 text-amber-800">
                  <span className="font-medium">Submission locked</span> — roster changes may be restricted.
                </li>
              ) : null}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}


/** Team Profile Editor (bio, skills, social links) */
function TeamProfileCard({ team, isLeader, api, onSaved }) {
  const profile = team?.profile || {}
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile.bio || '')
  const [skills, setSkills] = useState((profile.skills || []).join(', '))
  const [github, setGithub] = useState(profile.socialLinks?.github || '')
  const [linkedin, setLinkedin] = useState(profile.socialLinks?.linkedin || '')
  const [website, setWebsite] = useState(profile.socialLinks?.website || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      await api.updateTeamProfile({
        bio,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        socialLinks: { github, linkedin, website },
      })
      setEditing(false)
      setMsg('Profile saved.')
      onSaved?.()
    } catch (e) {
      setMsg(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink-900">Team Profile</h3>
        {isLeader && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>

      {msg && <p className="mt-2 text-xs text-brand-600">{msg}</p>}

      {editing ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700">Team Bio</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-3 py-2 text-sm"
              rows={3}
              maxLength={500}
              placeholder="Tell judges about your team..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-400">{bio.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700">Skills / Tech Stack</label>
            <Input
              className="mt-1"
              placeholder="React, Python, ML, IoT (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Github className="h-3.5 w-3.5" /> GitHub
              </label>
              <Input className="mt-1" placeholder="https://github.com/..." value={github} onChange={(e) => setGithub(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </label>
              <Input className="mt-1" placeholder="https://linkedin.com/..." value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Globe className="h-3.5 w-3.5" /> Website
              </label>
              <Input className="mt-1" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Bio */}
          {profile.bio ? (
            <p className="text-sm text-ink-600">{profile.bio}</p>
          ) : (
            <p className="text-sm italic text-ink-400">{isLeader ? 'No bio yet — click Edit to add one.' : 'No team bio set.'}</p>
          )}

          {/* Skills */}
          {(profile.skills || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-700">
                  <Tag className="h-3 w-3" /> {s}
                </span>
              ))}
            </div>
          )}

          {/* Social links */}
          {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
            <div className="flex flex-wrap gap-3">
              {profile.socialLinks.github && (
                <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-600">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              )}
              {profile.socialLinks.linkedin && (
                <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-600">
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              )}
              {profile.socialLinks.website && (
                <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-ink-600 hover:text-brand-600">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/** Inline member designation editor */
function MemberDesignationEdit({ memberUid, currentDesignation, isLeader, isSelf, api, onSaved, busy }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentDesignation)
  const [saving, setSaving] = useState(false)

  // Only leader or self can edit
  if (!isLeader && !isSelf) {
    return currentDesignation ? null : null // designation shown in parent
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-ink-400 hover:text-brand-600"
        disabled={busy}
        onClick={() => { setValue(currentDesignation); setEditing(true) }}
        title="Set role/designation"
      >
        <Pencil className="h-3 w-3" />
      </Button>
    )
  }

  async function save() {
    setSaving(true)
    try {
      await api.updateMemberDesignation(memberUid, value.trim())
      setEditing(false)
      onSaved?.()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        className="h-7 w-28 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-2 text-xs sm:w-36"
        placeholder="e.g. Frontend Dev"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={60}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        autoFocus
      />
      <button type="button" onClick={save} disabled={saving} className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => setEditing(false)} className="rounded p-1 text-ink-400 hover:bg-ink-200/50">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
