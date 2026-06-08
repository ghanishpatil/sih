import { FieldValue } from 'firebase-admin/firestore'
import { getActiveEventConfig } from './eventsService.js'
import { entryFeeToMinorUnits, fetchOrder, fetchPayment, verifyPaymentSignature } from './razorpay.js'
import { isRegistrationParticipationBlocked } from './teamRegistrationGate.js'
import {
  completeRegistrationPatch,
  isAwaitingRegistrationPayment,
  isRegistrationComplete,
} from './teamRegistration.js'
import { sendPaymentConfirmationEmail } from './emailService.js'

function isTeamMember(team, uid) {
  return team?.leaderId === uid || (Array.isArray(team?.memberIds) && team.memberIds.includes(uid))
}

export function expectedEntryMinorAndCurrency(mergedOrRaw) {
  const cfg = mergedOrRaw || {}
  if (!cfg.entryFeeEnabled) return { ok: false, reason: 'Entry fee is not enabled.' }
  const currency = typeof cfg.currency === 'string' ? cfg.currency : 'INR'
  const minor = entryFeeToMinorUnits(cfg.entryFeeAmount, currency)
  if (minor == null) return { ok: false, reason: 'Invalid entry fee amount in event configuration.' }
  return { ok: true, amountMinor: minor, currency: currency.toUpperCase() }
}

/**
 * Helper: send payment confirmation email to team leader.
 * Extracted to avoid duplication between participant-verify and webhook paths.
 */
async function sendLeaderPaymentEmail(db, { team, exp, razorpayPaymentId }) {
  try {
    const leaderRef = db.doc(`users/${team.leaderId}`)
    const leaderSnap = await leaderRef.get()
    if (!leaderSnap.exists) return
    const leader = leaderSnap.data()
    let leaderEmail = leader.email
    if (!leaderEmail) {
      try {
        const { getAuth } = await import('firebase-admin/auth')
        const authUser = await getAuth().getUser(team.leaderId)
        leaderEmail = authUser.email
      } catch { /* ignore auth lookup failure */ }
    }
    if (leaderEmail) {
      await sendPaymentConfirmationEmail({
        to: leaderEmail,
        name: leader.displayName || 'Team Leader',
        teamName: team.name || 'Your Team',
        amount: (exp.amountMinor / 100).toFixed(2),
        currency: exp.currency,
        paymentId: razorpayPaymentId,
      })
    } else {
      console.warn('[Payment Email] No email found for leader:', team.leaderId)
    }
  } catch (emailError) {
    console.error('[Payment Email] Failed to send confirmation:', emailError.message)
  }
}

/**
 * Validates Razorpay payment + order against event config and marks team paid (idempotent).
 * Used by participant verify endpoint.
 *
 * CRIT-02 fix: The team document write is inside a Firestore transaction.
 * The email is sent only when the transaction actually wrote (alreadyPaid flag).
 * This prevents duplicate emails when two concurrent requests race.
 */
export async function verifyAndMarkTeamPaid(db, { teamId, razorpayOrderId, razorpayPaymentId, razorpaySignature, actorUid }) {
  const teamRef = db.doc(`teams/${teamId}`)
  const teamSnap = await teamRef.get()
  if (!teamSnap.exists) return { ok: false, status: 404, error: 'Team not found.' }
  const team = teamSnap.data()

  if (isRegistrationParticipationBlocked(team)) {
    return { ok: false, status: 403, error: 'Registration is not active for this team.' }
  }

  const merged = await getActiveEventConfig()
  const exp = expectedEntryMinorAndCurrency(merged)
  if (!exp.ok) return { ok: false, status: 400, error: exp.reason }

  if (!isAwaitingRegistrationPayment(team, merged) && !isRegistrationComplete(team, merged)) {
    return { ok: false, status: 403, error: 'Team has not started event registration.' }
  }
  if (isRegistrationComplete(team, merged)) return { ok: true }
  if (actorUid != null && !isTeamMember(team, actorUid)) {
    return { ok: false, status: 403, error: 'Forbidden.' }
  }

  const st = team.paymentStatus || 'pending'
  if (st === 'paid') return { ok: true }
  if (st !== 'pending') {
    return { ok: false, status: 409, error: 'Team payment is not awaiting Razorpay completion.' }
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return { ok: false, status: 400, error: 'Invalid payment signature.' }
  }

  let payment
  try {
    payment = await fetchPayment(razorpayPaymentId)
  } catch (e) {
    return { ok: false, status: 502, error: e.message || 'Could not verify payment with Razorpay.' }
  }

  if (payment.order_id !== razorpayOrderId) {
    return { ok: false, status: 400, error: 'Payment does not match order.' }
  }
  if (String(payment.status).toLowerCase() !== 'captured') {
    return { ok: false, status: 400, error: 'Payment is not captured yet.' }
  }

  let order
  try {
    order = await fetchOrder(razorpayOrderId)
  } catch (e) {
    return { ok: false, status: 502, error: e.message || 'Could not load order from Razorpay.' }
  }

  const noteTeam = order?.notes?.teamId != null ? String(order.notes.teamId) : ''
  if (noteTeam !== String(teamId)) {
    return { ok: false, status: 400, error: 'Order is not for this team.' }
  }

  if (Number(order.amount) !== exp.amountMinor || String(order.currency).toUpperCase() !== exp.currency) {
    return { ok: false, status: 400, error: 'Order amount or currency does not match event configuration.' }
  }

  if (Number(payment.amount) !== exp.amountMinor || String(payment.currency).toUpperCase() !== exp.currency) {
    return { ok: false, status: 400, error: 'Payment amount or currency does not match event configuration.' }
  }

  // CRIT-02 fix: track whether this transaction actually performed the write.
  // If two concurrent requests race here, only the first one sets didWrite = true.
  // The second sees paymentStatus === 'paid' inside the transaction and skips.
  let didWrite = false
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(teamRef)
    const t = snap.data()
    const ps = t.paymentStatus || 'pending'
    if (ps === 'paid') return   // already done — skip silently
    if (ps !== 'pending') return // unexpected state — skip silently
    tx.set(
      teamRef,
      {
        ...completeRegistrationPatch('paid'),
        paymentProvider: 'razorpay',
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        paymentVerifiedAt: FieldValue.serverTimestamp(),
        eventRegisteredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    didWrite = true
  })

  // Only send email when this request was the one that actually wrote the payment.
  // Concurrent duplicate requests will have didWrite = false and skip the email.
  if (didWrite) {
    await sendLeaderPaymentEmail(db, { team, exp, razorpayPaymentId })
  }

  return { ok: true, didWrite }
}

/**
 * Webhook path: payment already captured; trust signature on payload, then confirm with API + mark paid.
 * `actorUid` is null (no Firebase user).
 *
 * CRIT-05 fix: idempotency via webhookEvents/{razorpayPaymentId} document.
 * Razorpay retries webhooks on non-2xx. Without this, the email would be sent on every retry.
 * The lock document is written atomically inside the same transaction as the team update.
 */
export async function markTeamPaidFromWebhook(db, { razorpayOrderId, razorpayPaymentId }) {
  // CRIT-05: Check idempotency lock first — fast path for retries.
  const lockRef = db.doc(`webhookEvents/${razorpayPaymentId}`)
  const lockSnap = await lockRef.get()
  if (lockSnap.exists) {
    // Already processed — return success with the stored teamId.
    return { ok: true, teamId: lockSnap.data().teamId || '', duplicate: true }
  }

  let payment
  try {
    payment = await fetchPayment(razorpayPaymentId)
  } catch (e) {
    return { ok: false, error: e.message }
  }

  if (payment.order_id !== razorpayOrderId) return { ok: false, error: 'order mismatch' }
  if (String(payment.status).toLowerCase() !== 'captured') return { ok: false, error: 'not captured' }

  let order
  try {
    order = await fetchOrder(razorpayOrderId)
  } catch (e) {
    return { ok: false, error: e.message }
  }

  const teamId = order?.notes?.teamId != null ? String(order.notes.teamId) : ''
  if (!teamId) return { ok: false, error: 'missing teamId on order notes' }

  const teamRef = db.doc(`teams/${teamId}`)
  const teamSnap = await teamRef.get()
  if (!teamSnap.exists) return { ok: false, error: 'team not found' }
  const team = teamSnap.data()

  const merged = await getActiveEventConfig()
  const exp = expectedEntryMinorAndCurrency(merged)
  if (!exp.ok) return { ok: false, error: exp.reason }

  if (Number(order.amount) !== exp.amountMinor || String(order.currency).toUpperCase() !== exp.currency) {
    return { ok: false, error: 'amount mismatch' }
  }
  if (Number(payment.amount) !== exp.amountMinor || String(payment.currency).toUpperCase() !== exp.currency) {
    return { ok: false, error: 'payment amount mismatch' }
  }

  // CRIT-05: Write the idempotency lock document atomically in the same transaction
  // as the team payment update. If the transaction succeeds, the lock is set and
  // future retries will hit the fast-path check above.
  let didWrite = false
  await db.runTransaction(async (tx) => {
    // Re-check lock inside transaction to handle concurrent webhook deliveries.
    const lockSnapTx = await tx.get(lockRef)
    if (lockSnapTx.exists) return // Another concurrent request already processed this

    const teamSnapTx = await tx.get(teamRef)
    if (!teamSnapTx.exists) return
    const teamTx = teamSnapTx.data()

    if (!isAwaitingRegistrationPayment(teamTx, merged) && !isRegistrationComplete(teamTx, merged)) return
    const st = teamTx.paymentStatus || 'pending'
    if (st === 'paid') {
      // Team already paid but lock wasn't written yet (edge case: previous tx succeeded
      // but lock write failed). Write the lock now to prevent future retries.
      tx.set(lockRef, {
        razorpayPaymentId,
        razorpayOrderId,
        teamId,
        processedAt: FieldValue.serverTimestamp(),
      })
      return
    }
    if (st !== 'pending') return

    // Write team payment update + idempotency lock atomically.
    tx.set(
      teamRef,
      {
        ...completeRegistrationPatch('paid'),
        paymentProvider: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        paymentVerifiedAt: FieldValue.serverTimestamp(),
        eventRegisteredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    tx.set(lockRef, {
      razorpayPaymentId,
      razorpayOrderId,
      teamId,
      processedAt: FieldValue.serverTimestamp(),
    })
    didWrite = true
  })

  // Only send email when this invocation actually wrote the payment record.
  if (didWrite) {
    await sendLeaderPaymentEmail(db, { team, exp, razorpayPaymentId })
  }

  return { ok: true, teamId, didWrite }
}
