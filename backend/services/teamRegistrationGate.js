/** Admin-controlled participation suspension (Firestore field `registrationStatus` on team). */

export function isRegistrationParticipationBlocked(team) {
  const s = String(team?.registrationStatus || '').toLowerCase()
  return s === 'blocked' || s === 'rejected'
}

export function participationBlockedMessage(team) {
  const s = String(team?.registrationStatus || '').toLowerCase()
  if (s === 'blocked') return 'Your team registration has been suspended by organizers.'
  if (s === 'rejected') return 'Your team registration was not accepted.'
  return null
}
