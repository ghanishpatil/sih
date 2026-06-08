import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './firebaseAdmin.js'

/**
 * Append-only audit entries (Admin SDK only from API).
 */
export async function appendAuditLog({
  actorUid,
  action,
  targetType,
  targetId,
  eventId,
  metadata,
}) {
  const db = getDb()
  if (!db || !actorUid || !action) return
  await db.collection('auditLogs').add({
    actorUid,
    action: String(action).slice(0, 128),
    targetType: targetType ? String(targetType).slice(0, 64) : '',
    targetId: targetId ? String(targetId).slice(0, 256) : '',
    eventId: eventId ? String(eventId).slice(0, 128) : '',
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    createdAt: FieldValue.serverTimestamp(),
  })
}
