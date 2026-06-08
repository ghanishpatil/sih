import { getDb } from './firebaseAdmin.js'

// Phase 8: Legacy config/event document removed - all config now in events/{eventId}
// This file now only contains default values and utility functions

export const DEFAULT_EVENT_CONFIG = {
  registrationOpen: true,
  entryFeeEnabled: false,
  entryFeeAmount: 0,
  currency: 'INR',
}

function toIso(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate().toISOString()
  if (v instanceof Date) return v.toISOString()
  return null
}

export function isPast(ts) {
  if (!ts) return false
  const d = typeof ts.toDate === 'function' ? ts.toDate() : ts instanceof Date ? ts : null
  if (!d) return false
  return d.getTime() < Date.now()
}

export function registrationWindowOpen(raw, now = Date.now()) {
  if (!raw || !raw.registrationOpen) return false
  const opens = raw.registrationOpensAt
  const closes = raw.registrationClosesAt
  if (opens && typeof opens.toDate === 'function' && opens.toDate().getTime() > now) return false
  if (closes && typeof closes.toDate === 'function' && closes.toDate().getTime() < now) return false
  return true
}

export function teamMaySelectProblem(raw, team) {
  if (!team?.eventRegistered) return { ok: false, reason: 'Team has not registered for the event.' }
  if (raw.entryFeeEnabled) {
    const st = team.paymentStatus || 'pending'
    if (st !== 'paid' && st !== 'waived' && st !== 'not_required') {
      return { ok: false, reason: 'Entry fee must be paid or waived before selecting a problem.' }
    }
  }
  return { ok: true }
}

export function teamMaySubmit(raw, team) {
  const sel = teamMaySelectProblem(raw, team)
  if (!sel.ok) return sel
  if (!team?.problemStatementId) return { ok: false, reason: 'Select a problem statement first.' }
  if (raw.submissionDeadline && isPast(raw.submissionDeadline)) {
    return { ok: false, reason: 'Submission deadline has passed.' }
  }
  return { ok: true }
}

/** Judge may evaluate if their assigned problem statements match the team's selected problem statement. */
export function judgeMayEvaluateTeam(judgeData, team) {
  const teamProblemId = team?.problemStatementId
  if (!teamProblemId) return false
  
  const assignedProblems = judgeData?.assignedProblemStatementIds || []
  return Array.isArray(assignedProblems) && assignedProblems.includes(teamProblemId)
}

