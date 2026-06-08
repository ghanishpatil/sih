/**
 * Sanitization utilities for user-provided input used in Firestore paths and queries.
 */

/** Validates a Firestore document ID (no slashes, no dots-only, reasonable length) */
export function isValidDocId(id) {
  if (typeof id !== 'string') return false
  if (!id || id.length > 256) return false
  // Must not contain forward slashes (path traversal)
  if (id.includes('/')) return false
  // Must not be only dots
  if (/^\.+$/.test(id)) return false
  // Must not contain null bytes
  if (id.includes('\0')) return false
  return true
}

/** Sanitizes a string to be safe as a Firestore doc path segment. Throws 400 if invalid. */
export function assertValidDocId(value, fieldName = 'id') {
  if (!isValidDocId(value)) {
    const e = new Error(`Invalid ${fieldName}: must be a non-empty string without slashes or special characters.`)
    e.status = 400
    throw e
  }
  return value
}
