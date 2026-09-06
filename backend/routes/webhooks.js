import { verifyWebhookSignature } from '../services/razorpay.js'
import { getDb } from '../services/firebaseAdmin.js'
import { BRAND } from '../services/brand.js'
import { markTeamPaidFromWebhook } from '../services/teamPaymentRazorpay.js'
import { notifyRegistrationComplete } from '../services/notificationService.js'
import { logSecurityEvent, EVENT_TYPE, SEVERITY, extractIp } from '../services/securityLog.js'
import { FieldValue } from 'firebase-admin/firestore'

async function logWebhookEvent(db, { event, status, orderId, paymentId, teamId, error, ip }) {
  try {
    await db.collection('webhookLog').add({
      event: String(event || '').slice(0, 64),
      status: String(status || '').slice(0, 32),
      orderId: orderId ? String(orderId).slice(0, 128) : null,
      paymentId: paymentId ? String(paymentId).slice(0, 128) : null,
      teamId: teamId ? String(teamId).slice(0, 128) : null,
      error: error ? String(error).slice(0, 500) : null,
      ip: ip ? String(ip).slice(0, 64) : null,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch { /* never crash */ }
}

/**
 * Express handler: `req.body` must be raw Buffer (use express.raw).
 */
export async function razorpayWebhookHandler(req, res) {
  const db = getDb()
  const ip = extractIp(req)
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return res.status(503).type('text/plain').send('RAZORPAY_WEBHOOK_SECRET not set')
    }

    const sig = req.get('x-razorpay-signature') || req.get('X-Razorpay-Signature')
    const raw = req.body
    if (!Buffer.isBuffer(raw) || raw.length === 0) {
      if (db) await logWebhookEvent(db, { event: 'unknown', status: 'invalid_body', ip })
      return res.status(400).type('text/plain').send('invalid body')
    }

    if (!verifyWebhookSignature(raw, sig)) {
      if (db) {
        await logWebhookEvent(db, { event: 'unknown', status: 'invalid_signature', ip })
        await logSecurityEvent({
          ipAddress: ip,
          eventType: EVENT_TYPE.WEBHOOK_INVALID_SIG,
          targetEntity: 'razorpay_webhook',
          severity: SEVERITY.HIGH,
          status: 'blocked',
          metadata: { sig: sig ? sig.slice(0, 20) + '…' : null },
        })
      }
      return res.status(400).type('text/plain').send('invalid signature')
    }

    let payload
    try {
      payload = JSON.parse(raw.toString('utf8'))
    } catch {
      if (db) await logWebhookEvent(db, { event: 'unknown', status: 'invalid_json', ip })
      return res.status(400).type('text/plain').send('invalid json')
    }

    const event = payload.event
    if (event !== 'payment.captured') {
      if (db) await logWebhookEvent(db, { event, status: 'ignored', ip })
      return res.status(200).json({ ok: true, ignored: event })
    }

    const paymentEntity = payload?.payload?.payment?.entity
    const orderId = paymentEntity?.order_id
    const paymentId = paymentEntity?.id
    if (!orderId || !paymentId) {
      if (db) await logWebhookEvent(db, { event, status: 'missing_fields', ip })
      return res.status(400).type('text/plain').send('missing payment fields')
    }

    if (!db) {
      // Can't log — db unavailable, just return error
      return res.status(503).type('text/plain').send('database unavailable')
    }

    const result = await markTeamPaidFromWebhook(db, { razorpayOrderId: orderId, razorpayPaymentId: paymentId })
    if (!result.ok) {
      await logWebhookEvent(db, { event, status: 'not_applied', orderId, paymentId, error: result.error, ip })
      return res.status(200).json({ ok: true, note: result.error || 'not applied' })
    }

    // Send welcome email on new payment (not on duplicate webhook retries)
    if (result.didWrite) {
      notifyRegistrationComplete({ teamId: result.teamId, eventName: BRAND.name }).catch(() => {})
    }

    await logWebhookEvent(db, { event, status: 'success', orderId, paymentId, teamId: result.teamId, ip })
    return res.status(200).json({ ok: true, teamId: result.teamId })
  } catch (e) {
    console.error('[razorpay webhook]', e)
    if (db) await logWebhookEvent(db, { event: 'unknown', status: 'server_error', error: e.message, ip }).catch(() => {})
    return res.status(500).type('text/plain').send('server error')
  }
}
