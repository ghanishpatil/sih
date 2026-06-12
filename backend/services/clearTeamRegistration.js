import { FieldValue } from 'firebase-admin/firestore'

const REGISTRATION_FIELD_DELETES = [
  'registrationStatus',
  'eventRegisteredAt',
  'registrationRequestedAt',
  'paymentStatus',
  'paymentProvider',
  'razorpayOrderId',
  'razorpayPaymentId',
  'razorpayLastOrderId',
  'razorpayLastOrderAt',
  'paymentVerifiedAt',
  'paymentRecordedAt',
  'paymentRecordedBy',
]

export function teamHasRegistrationRecord(team) {
  if (!team) return false
  return Boolean(
    team.eventRegistered ||
      team.registrationRequestedAt ||
      team.registrationStatus ||
      (team.paymentStatus && team.paymentStatus !== 'not_required'),
  )
}

/**
 * Removes event registration + payment fields from `teams/{teamId}` in Firestore.
 * Clears problem selection and decrements `selectionCount` when applicable.
 */
export async function clearTeamRegistration(db, teamId) {
  const teamRef = db.doc(`teams/${teamId}`)

  await db.runTransaction(async (tx) => {
    const teamSnap = await tx.get(teamRef)
    if (!teamSnap.exists) {
      const err = new Error('Team not found.')
      err.status = 404
      throw err
    }

    const team = teamSnap.data()
    if (!teamHasRegistrationRecord(team) && !team.problemStatementId) {
      const err = new Error('Team has no registration to remove.')
      err.status = 400
      throw err
    }

    const oldPid = team.problemStatementId || ''
    if (oldPid) {
      const psRef = db.doc(`problemStatements/${oldPid}`)
      const psSnap = await tx.get(psRef)
      if (psSnap.exists) {
        const c = psSnap.data().selectionCount || 0
        tx.update(psRef, {
          selectionCount: Math.max(0, c - 1),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    const patch = {
      eventRegistered: false,
      problemStatementId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    for (const key of REGISTRATION_FIELD_DELETES) {
      patch[key] = FieldValue.delete()
    }

    tx.update(teamRef, patch)
  })

  return { ok: true, teamId }
}
