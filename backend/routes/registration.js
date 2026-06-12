import express from 'express'
import { getDb, getBucket } from '../services/firebaseAdmin.js'
import { verifyFirebaseToken, loadUserRole, requireRole } from '../middleware/auth.js'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

// Handle OPTIONS preflight for CORS
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      // BUG FIX #23: Properly reject non-PDF files with error
      cb(new Error('Only PDF files are allowed for ID card upload'))
    }
  }
})

// BUG FIX #23: Add multer error handling middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' })
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` })
  }
  if (err && err.message && err.message.includes('Only PDF files')) {
    return res.status(400).json({ error: err.message })
  }
  next(err)
}

/**
 * @route   GET /api/registrations
 * @desc    Get all registrations (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/',
  verifyFirebaseToken,
  loadUserRole,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const db = getDb()
      const snapshot = await db.collection('registrations')
        .orderBy('createdAt', 'desc')
        .get()

      const registrations = []
      snapshot.forEach(doc => {
        registrations.push({ id: doc.id, ...doc.data() })
      })

      res.json(registrations)
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   POST /api/registrations/member
 * @desc    Submit individual member registration for a team
 * @access  Private (Authenticated)
 */
router.post(
  '/member',
  verifyFirebaseToken,
  upload.single('idCard'),
  handleMulterError, // BUG FIX #23: Handle multer errors
  async (req, res, next) => {
    try {
      console.log('[MEMBER REGISTRATION POST] Request received')
      console.log('[MEMBER REGISTRATION POST] Body:', req.body)
      console.log('[MEMBER REGISTRATION POST] File:', req.file ? 'present' : 'missing')

      // Manual validation
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({ error: 'Name is required' })
      }

      if (!req.body.institute || !req.body.institute.trim()) {
        return res.status(400).json({ error: 'Institute is required' })
      }

      if (!req.body.email || !req.body.email.trim()) {
        return res.status(400).json({ error: 'Email is required' })
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(req.body.email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      if (!req.body.phone || !req.body.phone.trim()) {
        return res.status(400).json({ error: 'Phone number is required' })
      }

      // Phone validation (10 digits)
      const phoneRegex = /^\d{10}$/
      if (!phoneRegex.test(req.body.phone.trim())) {
        return res.status(400).json({ error: 'Phone number must be 10 digits' })
      }

      if (!req.body.teamId || !req.body.teamId.trim()) {
        return res.status(400).json({ error: 'Team ID is required' })
      }

      if (!req.body.userId || !req.body.userId.trim()) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'ID card PDF is required' })
      }

      const name = req.body.name.trim()
      const institute = req.body.institute.trim()
      const email = req.body.email.trim().toLowerCase()
      const phone = req.body.phone.trim()
      const teamId = req.body.teamId.trim()
      const userId = req.body.userId.trim()

      const db = getDb()

      // Verify team exists
      const teamDoc = await db.collection('teams').doc(teamId).get()
      if (!teamDoc.exists) {
        return res.status(404).json({ error: 'Team not found' })
      }

      const teamData = teamDoc.data()
      
      // BUG FIX #10: Verify the authenticated user is a member of this team using correct structure
      // Teams have leaderId (string) and memberIds (array), NOT a members array
      const memberIds = teamData.memberIds || []
      const isAuthUserMember = memberIds.includes(req.user.uid) || teamData.leaderId === req.user.uid
      if (!isAuthUserMember) {
        return res.status(403).json({ error: 'You are not a member of this team' })
      }

      // BUG FIX #3: Correct team leader check using actual team structure
      if (teamData.leaderId !== req.user.uid) {
        return res.status(403).json({ error: 'Only the team leader can register members' })
      }

      // Verify the userId being registered is actually a member of the team
      if (!memberIds.includes(userId)) {
        return res.status(400).json({ error: 'The user being registered is not a member of this team' })
      }

      // BUG FIX #4: Verify userId corresponds to a real Firebase Auth user
      try {
        const { getAuth } = await import('firebase-admin/auth')
        await getAuth().getUser(userId)
      } catch (authError) {
        return res.status(400).json({ error: 'Invalid user ID - user does not exist in authentication system' })
      }

      // BUG FIX #2: Use transaction to prevent race conditions on duplicate checks
      // This ensures atomicity: check + create happen together or not at all
      let registrationId
      let idCardUrl
      let filename

      try {
        await db.runTransaction(async (tx) => {
          // Check if this specific member already has a registration for this team
          const existingReg = await tx.get(
            db.collection('memberRegistrations')
              .where('teamId', '==', teamId)
              .where('userId', '==', userId)
              .limit(1)
          )

          if (!existingReg.empty) {
            throw Object.assign(new Error('Registration already exists for this member'), { status: 400 })
          }

          // Check for duplicate email within team
          const existingEmail = await tx.get(
            db.collection('memberRegistrations')
              .where('teamId', '==', teamId)
              .where('email', '==', email)
              .limit(1)
          )

          if (!existingEmail.empty) {
            throw Object.assign(new Error('This email is already used by another team member'), { status: 400 })
          }

          // Check for duplicate phone within team
          const existingPhone = await tx.get(
            db.collection('memberRegistrations')
              .where('teamId', '==', teamId)
              .where('phone', '==', phone)
              .limit(1)
          )

          if (!existingPhone.empty) {
            throw Object.assign(new Error('This phone number is already used by another team member'), { status: 400 })
          }

          // Transaction checks passed - we'll create the document after file upload
        })
      } catch (txError) {
        if (txError.status) {
          return res.status(txError.status).json({ error: txError.message })
        }
        throw txError
      }

      // Upload ID card to Firebase Storage
      const bucket = getBucket()
      if (!bucket) {
        console.error('[MEMBER REGISTRATION POST] Firebase Storage not initialized')
        return res.status(500).json({ error: 'Storage not configured' })
      }

      console.log('[MEMBER REGISTRATION POST] Uploading to bucket:', bucket.name)
      filename = `member-registrations/${teamId}/${userId}-${Date.now()}.pdf`
      const file = bucket.file(filename)

      console.log('[MEMBER REGISTRATION POST] Saving file with buffer size:', req.file.buffer.length)

      try {
        await file.save(req.file.buffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              firebaseStorageDownloadTokens: uuidv4(),
            },
          },
          public: false,
        })

        console.log('[MEMBER REGISTRATION POST] File saved successfully')

        // Get signed URL valid for 1 year
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        })
        idCardUrl = url
        console.log('[MEMBER REGISTRATION POST] Signed URL generated')
      } catch (uploadError) {
        console.error('[MEMBER REGISTRATION POST] Upload error:', uploadError)
        throw uploadError
      }

      // Create member registration document inside a transaction to ensure atomicity
      // This prevents race conditions between the duplicate check above and document creation
      const registrationData = {
        name,
        institute,
        email,
        phone,
        idCardUrl,
        idCardPath: filename,
        userId: userId,
        teamId,
        teamName: teamData.name || 'Unnamed Team',
        registeredBy: req.user.uid, // Track who submitted this registration
        status: 'approved', // AUTO-APPROVED: No manual admin approval needed
        approvedBy: 'system',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      // BUG FIX #21: Cleanup file if transaction fails
      try {
        await db.runTransaction(async (tx) => {
          // Final check before creating - ensures no race condition
          const finalCheck = await tx.get(
            db.collection('memberRegistrations')
              .where('teamId', '==', teamId)
              .where('userId', '==', userId)
              .limit(1)
          )
          
          if (!finalCheck.empty) {
            throw Object.assign(new Error('Registration already exists for this member'), { status: 400 })
          }

          const docRef = db.collection('memberRegistrations').doc()
          tx.set(docRef, registrationData)
          registrationId = docRef.id
        })
      } catch (txError) {
        // BUG FIX #21: If transaction fails, delete the uploaded file to prevent orphans
        try {
          await file.delete()
          console.log('[MEMBER REGISTRATION POST] Cleaned up orphaned file after transaction failure')
        } catch (deleteError) {
          console.error('[MEMBER REGISTRATION POST] Failed to cleanup file:', deleteError)
          // Don't throw - the main error is more important
        }
        
        // Re-throw the original transaction error
        if (txError.status) {
          return res.status(txError.status).json({ error: txError.message })
        }
        throw txError
      }

      res.status(201).json({
        id: registrationId,
        ...registrationData,
      })
    } catch (error) {
      console.error('Error creating member registration:', error)
      console.error('Error stack:', error.stack)
      next(error)
    }
  }
)

/**
 * @route   GET /api/registrations/team/:teamId/members
 * @desc    Get all member registrations for a team
 * @access  Private (Team member or Admin)
 */
router.get(
  '/team/:teamId/members',
  verifyFirebaseToken,
  loadUserRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params
      const db = getDb()

      // Verify team exists
      const teamDoc = await db.collection('teams').doc(teamId).get()
      if (!teamDoc.exists) {
        return res.status(404).json({ error: 'Team not found' })
      }

      const teamData = teamDoc.data()

      // Check authorization: must be admin or team member
      const memberIds = teamData.memberIds || []
      const isMember = memberIds.includes(req.user.uid) || teamData.leaderId === req.user.uid
      const isAdmin = req.profile?.role === 'admin'
      
      if (!isAdmin && !isMember) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const snapshot = await db.collection('memberRegistrations')
        .where('teamId', '==', teamId)
        .orderBy('createdAt', 'asc')
        .get()

      const registrations = []
      snapshot.forEach(doc => {
        registrations.push({ id: doc.id, ...doc.data() })
      })

      res.json({
        teamId,
        teamName: teamData.name || 'Unnamed Team',
        totalMembers: memberIds.length,
        registeredMembers: registrations.length,
        registrations,
      })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   GET /api/registrations/teams
 * @desc    Get all teams with their member registration status (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/teams',
  verifyFirebaseToken,
  loadUserRole,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const db = getDb()

      // Get all teams
      const teamsSnapshot = await db.collection('teams').get()
      const teams = []

      for (const teamDoc of teamsSnapshot.docs) {
        const teamData = teamDoc.data()
        const teamId = teamDoc.id

        // Get member registrations for this team
        const regsSnapshot = await db.collection('memberRegistrations')
          .where('teamId', '==', teamId)
          .get()

        const registrations = []
        regsSnapshot.forEach(doc => {
          registrations.push({ id: doc.id, ...doc.data() })
        })

        teams.push({
          id: teamId,
          name: teamData.name || 'Unnamed Team',
          totalMembers: (teamData.memberIds || []).length,
          registeredMembers: registrations.length,
          eventRegistered: teamData.eventRegistered || false,
          paymentStatus: teamData.paymentStatus || 'unpaid',
          createdAt: teamData.createdAt,
        })
      }

      // Sort by created date
      teams.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      res.json(teams)
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   GET /api/registrations/:id
 * @desc    Get single registration
 * @access  Private (Admin or Owner)
 */
router.get(
  '/:id',
  verifyFirebaseToken,
  loadUserRole,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const db = getDb()
      const doc = await db.collection('registrations').doc(id).get()

      if (!doc.exists) {
        return res.status(404).json({ error: 'Registration not found' })
      }

      const data = doc.data()

      // Allow admin or owner to view
      const isAdmin = req.profile?.role === 'admin'
      if (!isAdmin && data.userId !== req.user.uid) {
        return res.status(403).json({ error: 'Access denied' })
      }

      res.json({ id: doc.id, ...data })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   PUT /api/registrations/:id/status
 * @desc    Update registration status (admin only)
 * @access  Private (Admin)
 * @deprecated This endpoint updates old 'registrations' collection. 
 *             Use PUT /api/registrations/member/:id/status for member registrations.
 */
router.put(
  '/:id/status',
  verifyFirebaseToken,
  loadUserRole,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: pending, approved, or rejected' })
      }

      const db = getDb()
      const docRef = db.collection('registrations').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return res.status(404).json({ error: 'Registration not found' })
      }

      await docRef.update({
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      })

      const updated = await docRef.get()
      res.json({ id: updated.id, ...updated.data() })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   PUT /api/registrations/member/:id/status
 * @desc    Update MEMBER registration status (admin only)
 * @access  Private (Admin)
 * BUG FIX #7: Correct endpoint for memberRegistrations collection
 */
router.put(
  '/member/:id/status',
  verifyFirebaseToken,
  loadUserRole,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: pending, approved, or rejected' })
      }

      const db = getDb()
      const docRef = db.collection('memberRegistrations').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return res.status(404).json({ error: 'Member registration not found' })
      }

      await docRef.update({
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      })

      const updated = await docRef.get()
      res.json({ id: updated.id, ...updated.data() })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   DELETE /api/registrations/member/:id
 * @desc    Delete a member registration (admin or team leader)
 * @access  Private
 * BUG FIX #6: Allow cleanup of member registrations
 */
router.delete(
  '/member/:id',
  verifyFirebaseToken,
  loadUserRole,
  async (req, res, next) => {
    try {
      const { id } = req.params
      const db = getDb()
      
      const docRef = db.collection('memberRegistrations').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return res.status(404).json({ error: 'Member registration not found' })
      }

      const data = doc.data()

      // Check authorization: admin OR team leader
      const isAdmin = req.profile?.role === 'admin'
      
      if (!isAdmin) {
        const teamDoc = await db.collection('teams').doc(data.teamId).get()
        if (!teamDoc.exists) {
          return res.status(404).json({ error: 'Team not found' })
        }
        
        const teamData = teamDoc.data()
        if (teamData.leaderId !== req.user.uid) {
          return res.status(403).json({ error: 'Only the team leader or admin can delete member registrations' })
        }
      }

      // BUG FIX #22: Delete the uploaded file from Storage when deleting registration
      if (data.idCardPath) {
        try {
          const bucket = getBucket()
          if (bucket) {
            const file = bucket.file(data.idCardPath)
            await file.delete()
            console.log('[DELETE MEMBER REG] Deleted file from Storage:', data.idCardPath)
          }
        } catch (fileError) {
          console.error('[DELETE MEMBER REG] Failed to delete file:', fileError)
          // Continue - deleting the document is more important than file cleanup
        }
      }

      await docRef.delete()

      res.json({ success: true, message: 'Member registration deleted successfully' })
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @route   DELETE /api/registrations/team/:teamId/cleanup
 * @desc    Cleanup orphaned member registrations (users no longer in team)
 * @access  Private (Admin or Team Leader)
 * BUG FIX #6: Cleanup orphaned registrations when members leave
 */
router.delete(
  '/team/:teamId/cleanup',
  verifyFirebaseToken,
  loadUserRole,
  async (req, res, next) => {
    try {
      const { teamId } = req.params
      const db = getDb()

      // Verify team exists
      const teamDoc = await db.collection('teams').doc(teamId).get()
      if (!teamDoc.exists) {
        return res.status(404).json({ error: 'Team not found' })
      }

      const teamData = teamDoc.data()

      // Check authorization: must be admin or team leader
      const isAdmin = req.profile?.role === 'admin'
      if (!isAdmin && teamData.leaderId !== req.user.uid) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Get current team member IDs
      const currentMemberIds = teamData.memberIds || []

      // Get all member registrations for this team
      const regsSnapshot = await db.collection('memberRegistrations')
        .where('teamId', '==', teamId)
        .get()

      const toDelete = []
      const filesToDelete = []
      
      regsSnapshot.forEach(doc => {
        const regData = doc.data()
        // If the registered userId is no longer in the team, mark for deletion
        if (!currentMemberIds.includes(regData.userId)) {
          toDelete.push(doc.id)
          if (regData.idCardPath) {
            filesToDelete.push(regData.idCardPath)
          }
        }
      })

      // BUG FIX #22: Delete associated files from Storage
      const bucket = getBucket()
      if (bucket && filesToDelete.length > 0) {
        for (const filePath of filesToDelete) {
          try {
            await bucket.file(filePath).delete()
            console.log('[CLEANUP] Deleted file:', filePath)
          } catch (fileError) {
            console.error('[CLEANUP] Failed to delete file:', filePath, fileError)
            // Continue - deleting documents is more important
          }
        }
      }

      // Delete orphaned registrations
      const batch = db.batch()
      toDelete.forEach(docId => {
        batch.delete(db.collection('memberRegistrations').doc(docId))
      })
      
      if (toDelete.length > 0) {
        await batch.commit()
      }

      res.json({
        success: true,
        cleaned: toDelete.length,
        message: `Cleaned up ${toDelete.length} orphaned registration(s)`,
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
