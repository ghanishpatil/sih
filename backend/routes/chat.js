/**
 * Team Chat Routes
 * 
 * Real-time team messaging using Firestore.
 * - Team members can send messages to their team chat
 * - Messages are stored in Firestore subcollections
 * - Frontend uses Firestore onSnapshot for real-time updates
 */

import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '../services/firebaseAdmin.js'
import { verifyFirebaseToken, loadUserRole, requireRole } from '../middleware/auth.js'
import { attachEventContext } from '../middleware/eventContext.js'
import { isValidDocId } from '../utils/sanitize.js'

const r = Router()
r.use(verifyFirebaseToken, loadUserRole, attachEventContext)
r.use(requireRole('participant'))

function isTeamMember(team, uid) {
  return team.leaderId === uid || (Array.isArray(team.memberIds) && team.memberIds.includes(uid))
}

/**
 * GET /chat/messages - Get recent messages for current team
 * Query params: limit (default 50), before (cursor timestamp)
 */
r.get('/messages', async (req, res, next) => {
  try {
    const db = getDb()
    const uid = req.user.uid
    const prof = req.profile || {}
    const teamId = prof.teamId
    if (!teamId) return res.status(400).json({ error: 'Join or create a team first.' })

    const teamSnap = await db.doc(`teams/${teamId}`).get()
    if (!teamSnap.exists) return res.status(404).json({ error: 'Team not found.' })
    const team = teamSnap.data()
    if (!isTeamMember(team, uid)) return res.status(403).json({ error: 'Forbidden.' })

    const limit = Math.min(Number(req.query.limit) || 50, 100)
    let query = db.collection(`chats/${teamId}/messages`)
      .orderBy('createdAt', 'desc')
      .limit(limit)

    // Pagination cursor
    if (req.query.before) {
      const beforeDate = new Date(req.query.before)
      if (!isNaN(beforeDate.getTime())) {
        const { Timestamp } = await import('firebase-admin/firestore')
        query = query.startAfter(Timestamp.fromDate(beforeDate))
      }
    }

    const snap = await query.get()
    const messages = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        text: data.text || '',
        senderId: data.senderId || '',
        senderName: data.senderName || '',
        type: data.type || 'text',
        file: data.file || null,
        replyTo: data.replyTo || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    }).reverse() // Return in chronological order

    res.json({ messages, teamId })
  } catch (e) {
    next(e)
  }
})

/**
 * POST /chat/send - Send a message to team chat
 */
r.post('/send', async (req, res, next) => {
  try {
    const db = getDb()
    const uid = req.user.uid
    const prof = req.profile || {}
    const teamId = prof.teamId
    if (!teamId) return res.status(400).json({ error: 'Join or create a team first.' })

    const teamSnap = await db.doc(`teams/${teamId}`).get()
    if (!teamSnap.exists) return res.status(404).json({ error: 'Team not found.' })
    const team = teamSnap.data()
    if (!isTeamMember(team, uid)) return res.status(403).json({ error: 'Forbidden.' })

    const text = String(req.body?.text || '').trim().slice(0, 2000)
    if (!text) return res.status(400).json({ error: 'Message text required.' })

    const replyTo = req.body?.replyTo ? String(req.body.replyTo).trim().slice(0, 100) : null

    // File attachment support (WhatsApp-style)
    const fileUrl = typeof req.body?.fileUrl === 'string' ? req.body.fileUrl.trim().slice(0, 2048) : null
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim().slice(0, 200) : null
    const fileType = typeof req.body?.fileType === 'string' ? req.body.fileType.trim().slice(0, 100) : null
    const fileSize = typeof req.body?.fileSize === 'number' ? req.body.fileSize : null
    const msgType = fileUrl ? 'file' : 'text'

    // Get sender name
    const userSnap = await db.doc(`users/${uid}`).get()
    const senderName = userSnap.exists ? (userSnap.data().displayName || 'Participant') : 'Participant'

    const msgData = {
      text,
      senderId: uid,
      senderName,
      type: msgType,
      replyTo,
      createdAt: FieldValue.serverTimestamp(),
    }

    // Attach file metadata if present
    if (fileUrl) {
      msgData.file = {
        url: fileUrl,
        name: fileName || 'Attachment',
        type: fileType || 'application/octet-stream',
        size: fileSize || 0,
      }
    }

    const msgRef = db.collection(`chats/${teamId}/messages`).doc()
    await msgRef.set(msgData)

    // Update chat metadata (last message preview)
    await db.doc(`chats/${teamId}`).set({
      teamId,
      lastMessage: text.slice(0, 100),
      lastSenderId: uid,
      lastSenderName: senderName,
      lastMessageAt: FieldValue.serverTimestamp(),
      memberIds: team.memberIds || [],
    }, { merge: true })

    res.json({ ok: true, messageId: msgRef.id })
  } catch (e) {
    next(e)
  }
})

/**
 * DELETE /chat/messages/:messageId - Delete own message
 */
r.delete('/messages/:messageId', async (req, res, next) => {
  try {
    const db = getDb()
    const uid = req.user.uid
    const prof = req.profile || {}
    const teamId = prof.teamId
    if (!teamId) return res.status(400).json({ error: 'Not in a team.' })

    const { messageId } = req.params
    if (!isValidDocId(messageId)) return res.status(400).json({ error: 'Invalid message ID.' })
    const msgRef = db.doc(`chats/${teamId}/messages/${messageId}`)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) return res.status(404).json({ error: 'Message not found.' })

    const msg = msgSnap.data()
    if (msg.senderId !== uid) return res.status(403).json({ error: 'Can only delete your own messages.' })

    await msgRef.delete()
    res.json({ ok: true })
  } catch (e) {
    next(e)
  }
})

/**
 * GET /chat/info - Get chat metadata
 */
r.get('/info', async (req, res, next) => {
  try {
    const db = getDb()
    const uid = req.user.uid
    const prof = req.profile || {}
    const teamId = prof.teamId
    if (!teamId) return res.json({ exists: false })

    const teamSnap = await db.doc(`teams/${teamId}`).get()
    if (!teamSnap.exists) return res.json({ exists: false })
    const team = teamSnap.data()
    if (!isTeamMember(team, uid)) return res.status(403).json({ error: 'Forbidden.' })

    const chatSnap = await db.doc(`chats/${teamId}`).get()
    const chat = chatSnap.exists ? chatSnap.data() : null

    // Get member info for display — MED-02: parallel reads instead of sequential loop
    const memberIds = team.memberIds || []
    const memberSnaps = await Promise.all(
      memberIds.map((mid) => db.doc(`users/${mid}`).get()),
    )
    const members = memberSnaps
      .map((uSnap, i) => {
        if (!uSnap.exists) return null
        const u = uSnap.data()
        return {
          uid: memberIds[i],
          displayName: u.displayName || '',
          email: u.email || '',
          isLeader: team.leaderId === memberIds[i],
        }
      })
      .filter(Boolean)

    res.json({
      exists: true,
      teamId,
      teamName: team.name || 'Team',
      members,
      lastMessage: chat?.lastMessage || null,
      lastSenderName: chat?.lastSenderName || null,
      lastMessageAt: chat?.lastMessageAt?.toDate?.()?.toISOString() || null,
    })
  } catch (e) {
    next(e)
  }
})

export default r
