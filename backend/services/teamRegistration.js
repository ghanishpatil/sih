/** Registration + entry-fee completion for a single hackathon team. */

export function feeRequiredForEvent(mergedOrRaw) {
  const cfg = mergedOrRaw || {}
  return Boolean(cfg.entryFeeEnabled && Number(cfg.entryFeeAmount) > 0)
}

/** Team submitted registration but payment not finished (or legacy row awaiting pay). */
export function isAwaitingRegistrationPayment(team, mergedOrRaw) {
  if (!team) return false
  const rs = String(team.registrationStatus || '').toLowerCase()
  if (rs === 'pending') return true
  if (!feeRequiredForEvent(mergedOrRaw)) return false
  const ps = String(team.paymentStatus || 'pending')
  if (ps !== 'pending') return false
  return Boolean(team.registrationRequestedAt || team.eventRegistered)
}

export function isRegistrationComplete(team, mergedOrRaw) {
  if (!team) return false
  const rs = String(team.registrationStatus || '').toLowerCase()
  if (rs === 'blocked' || rs === 'rejected') return false
  if (!feeRequiredForEvent(mergedOrRaw)) {
    return Boolean(team.eventRegistered) && rs !== 'pending'
  }
  const ps = String(team.paymentStatus || '')
  return Boolean(team.eventRegistered) && (ps === 'paid' || ps === 'waived')
}

export function deriveRegistrationStatus(team, mergedOrRaw) {
  const admin = String(team?.registrationStatus || '').toLowerCase()
  if (admin === 'blocked' || admin === 'rejected') return admin
  if (isRegistrationComplete(team, mergedOrRaw)) return 'registered'
  if (isAwaitingRegistrationPayment(team, mergedOrRaw)) return 'pending'
  return 'none'
}

/** Firestore fields when a team starts registration (fee due). Caller should set `registrationRequestedAt`. */
export function pendingRegistrationPatch() {
  return {
    eventRegistered: false,
    registrationStatus: 'pending',
    paymentStatus: 'pending',
  }
}

/** Firestore fields when registration is fully complete. */
export function completeRegistrationPatch(paymentStatus) {
  return {
    eventRegistered: true,
    registrationStatus: 'registered',
    paymentStatus,
  }
}
