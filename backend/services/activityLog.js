/**
 * Platform-wide activity logger.
 * Tracks ALL user actions across all roles — participants, judges, mentors, admins.
 * Stored in `activityLog` collection (append-only, Admin SDK only).
 *
 * This powers the "Live Activity" feed in the Security Center.
 */

import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './firebaseAdmin.js'

export const ACTIVITY_TYPE = {
  // Team
  TEAM_CREATED:          'team_created',
  TEAM_JOINED:           'team_joined',
  TEAM_LEFT:             'team_left',
  TEAM_MEMBER_REMOVED:   'team_member_removed',
  TEAM_PROFILE_UPDATED:  'team_profile_updated',
  // Registration
  TEAM_REGISTERED:       'team_registered',
  PAYMENT_INITIATED:     'payment_initiated',
  PAYMENT_VERIFIED:      'payment_verified',
  // Problem
  PROBLEM_SELECTED:      'problem_selected',
  // Submission
  SUBMISSION_UPDATED:    'submission_updated',
  SUBMISSION_FINALIZED:  'submission_finalized',
  // Evaluation (judge)
  EVALUATION_SAVED:      'evaluation_saved',
  EVALUATION_SUBMITTED:  'evaluation_submitted',
  // Mentor
  MENTOR_NOTE_SAVED:     'mentor_note_saved',
  MENTOR_CHAT_SENT:      'mentor_chat_sent',
  // Chat
  CHAT_MESSAGE_SENT:     'chat_message_sent',
  // Auth (participant/judge/mentor login events)
  USER_PROFILE_SYNCED:   'user_profile_synced',
}

/**
 * Log a platform activity event. Fire-and-forget — never throws.
 */
export async function logActivity({
  actorUid,
  actorRole = 'participant',
  actorName = '',
  actorEmail = '',
  activityType,
  teamId = null,
  targetId = null,
  targetType = '',
  description = '',
  metadata = {},
  eventId = '',
}) {
  try {
    const db = getDb()
    if (!db || !actorUid || !activityType) return
    await db.collection('activityLog').add({
      actorUid: String(actorUid).slice(0, 128),
      actorRole: String(actorRole).slice(0, 32),
      actorName: String(actorName || '').slice(0, 100),
      actorEmail: String(actorEmail || '').slice(0, 200),
      activityType: String(activityType).slice(0, 64),
      teamId: teamId ? String(teamId).slice(0, 128) : null,
      targetId: targetId ? String(targetId).slice(0, 256) : null,
      targetType: String(targetType || '').slice(0, 64),
      description: String(description || '').slice(0, 500),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      eventId: String(eventId || '').slice(0, 128),
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch {
    // Never crash the main request
  }
}

/**
 * Helper: extract actor info from Express request profile.
 */
export function actorFromReq(req) {
  const p = req.profile || {}
  return {
    actorUid: req.user?.uid || '',
    actorRole: p.role || 'participant',
    actorName: p.displayName || req.user?.name || '',
    actorEmail: p.email || req.user?.email || '',
    eventId: req.eventId || '',
  }
}
