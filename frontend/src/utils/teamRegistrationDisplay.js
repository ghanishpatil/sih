export const REGISTRATION_STATUSES = ['registered', 'pending', 'blocked', 'rejected']

/**
 * Client-side registration status (mirrors backend `teamRegistration.js`).
 * Pass `feeRequired` from event config when available.
 */
export function deriveRegistrationStatus(team, { feeRequired = false } = {}) {
  const admin = String(team?.registrationStatus || '').toLowerCase()
  if (admin === 'blocked' || admin === 'rejected') return admin

  const pay = String(team?.paymentStatus || '')
  const feeOk = pay === 'paid' || pay === 'waived' || pay === 'not_required'

  if (team?.eventRegistered && (!feeRequired || feeOk)) return 'registered'
  if (admin === 'registered' && team?.eventRegistered) return 'registered'

  if (
    admin === 'pending' ||
    team?.registrationRequestedAt ||
    (feeRequired && pay === 'pending' && (team?.eventRegistered || team?.registrationRequestedAt))
  ) {
    return 'pending'
  }

  if (team?.eventRegistered && feeRequired && pay === 'pending') return 'pending'

  if (!teamHasRegistrationRecord(team)) return 'none'

  return 'pending'
}

export function isRegistrationComplete(team, { feeRequired = false } = {}) {
  return deriveRegistrationStatus(team, { feeRequired }) === 'registered'
}

/** Team has started or completed registration (for admin delete affordance). */
export function teamHasRegistrationRecord(team) {
  if (!team) return false
  return Boolean(
    team.eventRegistered ||
      team.registrationRequestedAt ||
      team.registrationStatus ||
      (team.paymentStatus && team.paymentStatus !== 'not_required'),
  )
}
