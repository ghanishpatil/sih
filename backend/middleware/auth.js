import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '../services/firebaseAdmin.js'
import { getActiveEvent } from '../services/eventsService.js'

/**
 * CRIT-03: Helper to sync a role to Firebase Auth custom claims.
 * Fire-and-forget safe — errors are logged but never thrown to callers.
 * Custom claims are embedded in the JWT, so role changes take effect
 * on the next token refresh (typically within 1 hour, or immediately
 * if the client calls user.getIdToken(true)).
 */
async function syncRoleClaim(uid, role) {
  try {
    await getAuth().setCustomUserClaims(uid, { role })
  } catch (e) {
    console.error('[syncRoleClaim] Failed to set custom claim for', uid, e.message || e)
  }
}

export async function verifyFirebaseToken(req, res, next) {
  const db = getDb()
  if (!db) {
    return res.status(503).json({ error: 'Server Firebase Admin not configured' })
  }
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }
  if (token.length > 16384) {
    return res.status(400).json({ error: 'Malformed authorization header' })
  }
  try {
    const decoded = await getAuth().verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: typeof decoded.name === 'string' ? decoded.name : '',
      picture: typeof decoded.picture === 'string' ? decoded.picture : '',
      // CRIT-03: Carry the role from custom claims so loadUserRole can use it
      // as the authoritative source instead of a Firestore read.
      // Will be undefined for users who have never had claims set (first login).
      claimedRole: typeof decoded.role === 'string' ? decoded.role : undefined,
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Ensures `users/{uid}` exists (Admin SDK — not subject to client security rules).
 * Idempotent: never overwrites an existing profile.
 *
 * CRIT-03: Role resolution order:
 *   1. Custom claim in JWT (req.user.claimedRole) — authoritative, tamper-proof
 *   2. Firestore users/{uid}.role — fallback for users without claims yet
 *   3. Default 'participant' — safety net
 *
 * When a new profile is created, custom claims are set immediately so the
 * next token refresh will carry the role in the JWT.
 */
export async function loadUserRole(req, res, next) {
  try {
    const db = getDb()
    const ref = db.doc(`users/${req.user.uid}`)
    let snap = await ref.get()

    if (!snap.exists) {
      // New user — create profile with default participant role
      const activeEvent = await getActiveEvent()
      const defaultEv = activeEvent?.id || ''
      await ref.set(
        {
          email: req.user.email || '',
          displayName: req.user.name || '',
          photoURL: req.user.picture || '',
          role: 'participant',
          teamId: '',
          activeEventId: defaultEv,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      )
      snap = await ref.get()

      // CRIT-03: Set custom claim for new user so future tokens carry the role.
      // Fire-and-forget — profile creation is not blocked by claim sync.
      syncRoleClaim(req.user.uid, 'participant')

      // Send account-created welcome email to the new user (fire-and-forget).
      // This fires for ALL sign-up methods: email/password, Google, GitHub, etc.
      // We import lazily to avoid circular dependency issues at module load time.
      if (req.user.email) {
        import('../services/emailService.js').then(({ sendAccountCreatedEmail }) => {
          sendAccountCreatedEmail({
            to: req.user.email,
            name: req.user.name || 'Participant',
            eventName: activeEvent?.name || 'Smart Kopargaon Hackathon',
          }).catch((e) => console.error('[Auth] Account created email failed:', e.message))
        }).catch(() => {})
      }
    }

    const firestoreProfile = snap.exists ? snap.data() : { role: 'participant' }

    // CRIT-03: Role resolution — JWT claim is authoritative for normal roles,
    // but Firestore is ALWAYS checked for banned status to prevent stale JWTs
    // from allowing banned users to continue accessing the platform for up to 1 hour.
    const firestoreRole = firestoreProfile.role || 'participant'

    if (firestoreRole === 'banned') {
      // Always enforce ban from Firestore — never trust a stale JWT claim here
      req.profile = { ...firestoreProfile, role: 'banned' }
    } else if (req.user.claimedRole !== undefined) {
      req.profile = { ...firestoreProfile, role: req.user.claimedRole }
    } else {
      req.profile = firestoreProfile
      const roleToSync = firestoreRole
      syncRoleClaim(req.user.uid, roleToSync)
    }
  } catch (e) {
    console.error('[loadUserRole]', req.user?.uid, e.message || e)
    req.profile = { role: 'participant' }
  }
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.profile?.role || 'participant'
    // Banned users cannot access any protected route
    if (role === 'banned') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact the admin.' })
    }
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden for this role' })
    }
    next()
  }
}

// Export syncRoleClaim so api.js role-update endpoints can call it directly
// after writing the new role to Firestore.
export { syncRoleClaim }
