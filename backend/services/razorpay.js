import crypto from 'crypto'

const API = 'https://api.razorpay.com/v1'

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) return null
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
}

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function getRazorpayPublicKeyId() {
  return process.env.RAZORPAY_KEY_ID || null
}

/** `entryFeeAmount` in Firestore is major units (e.g. INR rupees). Razorpay uses minor units (paise). */
export function entryFeeToMinorUnits(amountMajor, currency = 'INR') {
  const n = Number(amountMajor)
  if (!Number.isFinite(n) || n <= 0) return null
  const c = String(currency || 'INR').toUpperCase()
  if (c === 'INR') return Math.round(n * 100)
  return Math.round(n * 100)
}

// MED-03: Fixed timing side-channel — removed early-return on length mismatch.
// HMAC-SHA256 hex output is always 64 chars. We always compare 64-byte buffers
// so the comparison time is constant regardless of input length.
export function timingSafeEqualUtf8(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  // Always allocate fixed 64-byte buffers (HMAC-SHA256 hex = always 64 chars).
  // Copy at most 64 bytes from each input — truncates longer strings, zero-pads shorter.
  const SIZE = 64
  const ba = Buffer.alloc(SIZE)
  const bb = Buffer.alloc(SIZE)
  Buffer.from(a.slice(0, SIZE), 'utf8').copy(ba)
  Buffer.from(b.slice(0, SIZE), 'utf8').copy(bb)
  return crypto.timingSafeEqual(ba, bb)
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !orderId || !paymentId || !signature) return false
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqualUtf8(expected.toLowerCase(), String(signature).toLowerCase())
  } catch {
    return false
  }
}

export function verifyWebhookSignature(rawBodyBuffer, headerSignature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !rawBodyBuffer || !headerSignature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex')
  try {
    return timingSafeEqualUtf8(expected.toLowerCase(), String(headerSignature).toLowerCase())
  } catch {
    return false
  }
}

async function razorpayFetch(path, { method = 'GET', body } = {}) {
  const auth = authHeader()
  if (!auth) throw new Error('Razorpay not configured')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const msg = data?.error?.description || data?.error || data?.message || res.statusText
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

export async function createOrder({ amountMinor, currency, teamId, eventId = '' }) {
  const receipt = `t_${teamId}`.slice(0, 40)
  return razorpayFetch('/orders', {
    method: 'POST',
    body: {
      amount: amountMinor,
      currency: String(currency || 'INR').toUpperCase(),
      receipt,
      notes: { teamId: String(teamId), ...(eventId ? { eventId: String(eventId) } : {}) },
    },
  })
}

export async function fetchOrder(orderId) {
  return razorpayFetch(`/orders/${encodeURIComponent(orderId)}`)
}

export async function fetchPayment(paymentId) {
  return razorpayFetch(`/payments/${encodeURIComponent(paymentId)}`)
}
