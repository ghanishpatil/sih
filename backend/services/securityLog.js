/**
 * Security Event Logger — append-only, Admin SDK only.
 * Writes to `securityEvents` collection (never exposed to client writes via Firestore rules).
 *
 * Every security event includes:
 *   timestamp, actorId, role, ipAddress, deviceInfo,
 *   eventType, targetEntity, severity, status, metadata
 */

import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './firebaseAdmin.js'

export const SEVERITY = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
}

export const EVENT_TYPE = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  // RBAC
  RBAC_VIOLATION: 'rbac_violation',
  ROLE_ESCALATION_ATTEMPT: 'role_escalation_attempt',
  FORBIDDEN_ROUTE: 'forbidden_route',
  // Rate limiting
  RATE_LIMIT_HIT: 'rate_limit_hit',
  // Honeypot
  HONEYPOT_TRIGGERED: 'honeypot_triggered',
  // Submissions
  SUBMISSION_BLOCKED: 'submission_blocked',
  DEADLINE_BYPASS_ATTEMPT: 'deadline_bypass_attempt',
  PHASE_BYPASS_ATTEMPT: 'phase_bypass_attempt',
  // Uploads
  UPLOAD_REJECTED: 'upload_rejected',
  SUSPICIOUS_UPLOAD: 'suspicious_upload',
  // Webhooks
  WEBHOOK_RECEIVED: 'webhook_received',
  WEBHOOK_FAILED: 'webhook_failed',
  WEBHOOK_INVALID_SIG: 'webhook_invalid_sig',
  // Payments
  PAYMENT_ANOMALY: 'payment_anomaly',
  // Admin
  ADMIN_SENSITIVE_ACTION: 'admin_sensitive_action',
  // System
  FIRESTORE_DENIED: 'firestore_denied',
}

/**
 * Append a security event. Fire-and-forget safe — never throws.
 */
export async function logSecurityEvent({
  actorId = null,
  role = '',
  ipAddress = '',
  deviceInfo = '',
  eventType,
  targetEntity = '',
  severity = SEVERITY.INFO,
  status = 'detected',
  metadata = {},
}) {
  try {
    const db = getDb()
    if (!db || !eventType) return
    await db.collection('securityEvents').add({
      actorId: actorId ? String(actorId).slice(0, 128) : null,
      role: String(role).slice(0, 32),
      ipAddress: String(ipAddress || '').slice(0, 64),
      deviceInfo: String(deviceInfo || '').slice(0, 256),
      eventType: String(eventType).slice(0, 64),
      targetEntity: String(targetEntity || '').slice(0, 256),
      severity: Object.values(SEVERITY).includes(severity) ? severity : SEVERITY.INFO,
      status: String(status).slice(0, 32),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch {
    // Never let security logging crash the main request
  }
}

/**
 * Extract IP from Express request (handles proxies).
 */
export function extractIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    ''
  )
}

/**
 * Extract basic device info from User-Agent.
 */
export function extractDeviceInfo(req) {
  const ua = req.headers['user-agent'] || ''
  return ua.slice(0, 200)
}
