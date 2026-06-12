/**
 * Incident Management Service
 * Manages security incidents in `securityIncidents` Firestore collection.
 * All writes via Admin SDK — never exposed to client.
 */

import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './firebaseAdmin.js'

export const INCIDENT_STATUS = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
}

export const INCIDENT_SEVERITY = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
}

/**
 * Create a new incident.
 */
export async function createIncident({
  title,
  description,
  severity = INCIDENT_SEVERITY.MEDIUM,
  source,
  actorId = null,
  targetEntity = '',
  metadata = {},
  createdBy = null,
}) {
  const db = getDb()
  if (!db) return null
  const ref = await db.collection('securityIncidents').add({
    title: String(title || '').slice(0, 200),
    description: String(description || '').slice(0, 2000),
    severity: Object.values(INCIDENT_SEVERITY).includes(severity) ? severity : INCIDENT_SEVERITY.MEDIUM,
    status: INCIDENT_STATUS.OPEN,
    source: String(source || '').slice(0, 100),
    actorId: actorId ? String(actorId).slice(0, 128) : null,
    targetEntity: String(targetEntity || '').slice(0, 256),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    notes: [],
    assignedTo: null,
    createdBy: createdBy ? String(createdBy).slice(0, 128) : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    resolvedAt: null,
  })
  return ref.id
}

/**
 * Update incident status.
 */
export async function updateIncidentStatus(incidentId, status, actorUid, note = '') {
  const db = getDb()
  if (!db) return
  const patch = {
    status: Object.values(INCIDENT_STATUS).includes(status) ? status : INCIDENT_STATUS.OPEN,
    updatedAt: FieldValue.serverTimestamp(),
  }
  if (status === INCIDENT_STATUS.RESOLVED) {
    patch.resolvedAt = FieldValue.serverTimestamp()
  }
  if (note) {
    patch.notes = FieldValue.arrayUnion({
      text: String(note).slice(0, 1000),
      actorUid: String(actorUid || '').slice(0, 128),
      timestamp: new Date().toISOString(),
    })
  }
  await db.doc(`securityIncidents/${incidentId}`).set(patch, { merge: true })
}

/**
 * Add a note to an incident.
 */
export async function addIncidentNote(incidentId, actorUid, text) {
  const db = getDb()
  if (!db) return
  await db.doc(`securityIncidents/${incidentId}`).set({
    notes: FieldValue.arrayUnion({
      text: String(text || '').slice(0, 1000),
      actorUid: String(actorUid || '').slice(0, 128),
      timestamp: new Date().toISOString(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
