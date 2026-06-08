import { useEffect, useRef, useState } from 'react'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { Link } from 'react-router-dom'
import { Upload, FileText, Github, Video, ArrowLeft, Lock, AlertTriangle } from 'lucide-react'
import { storage } from '@/firebase/client.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { useEvent } from '@/context/EventContext.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { submissionCompleteness } from '@/pages/dashboard/participant/progressUtils.js'

const MAX_PPT_BYTES = 35 * 1024 * 1024
const MAX_PDF_BYTES = 35 * 1024 * 1024
const MAX_VIDEO_BYTES = 250 * 1024 * 1024

function assertFile(kind, file) {
  if (!file) return 'No file selected.'
  const name = file.name.toLowerCase()
  if (kind === 'ppt' && !name.endsWith('.ppt') && !name.endsWith('.pptx')) {
    return 'Please upload a .ppt or .pptx file.'
  }
  if (kind === 'pdf' && !name.endsWith('.pdf')) return 'Please upload a PDF file.'
  if (kind === 'video' && !file.type.startsWith('video/')) {
    return 'Please upload a video file (MP4/WebM).'
  }
  const max =
    kind === 'ppt' ? MAX_PPT_BYTES : kind === 'pdf' ? MAX_PDF_BYTES : MAX_VIDEO_BYTES
  if (file.size > max) {
    return `File too large (max ${Math.round(max / (1024 * 1024))} MB for ${kind}).`
  }
  return ''
}

export function SubmissionPage() {
  usePageSeo({ title: 'Submission Center', description: 'Upload hackathon submission assets.' })
  const { user, profile } = useAuth()
  const { eventId, eventCfg } = useEvent()   // ← live from Firestore onSnapshot
  const api = useApi()
  const [sub, setSub] = useState(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [status, setStatus] = useState('')
  const [pct, setPct] = useState(0)

  // Auto-dismiss status toast after 6 seconds
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(''), 6000)
    return () => clearTimeout(timer)
  }, [status])
  const [teamLocked, setTeamLocked] = useState(false)
  const [teamData, setTeamData] = useState(null)

  const teamId = profile?.teamId

  // Derive phase data directly from live eventCfg — no separate fetch needed
  const activePhase = eventCfg?.activePhase || null
  const phases = Array.isArray(eventCfg?.competitionPhases) ? eventCfg.competitionPhases : []
  const deadlineLabel = eventCfg?.submissionDeadline
    ? new Date(eventCfg.submissionDeadline).toLocaleString()
    : ''

  // HIGH-10: Debounce timer ref for deployedUrl onChange
  const deployedUrlTimer = useRef(null)

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { clearTimeout(deployedUrlTimer.current) }
  }, [])

  // HIGH-05: Load submission data and team info via backend API
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!teamId) return
      try {
        const [versionsData, rosterData] = await Promise.all([
          api.getSubmissionVersions(),
          api.teamRoster(),
        ])
        if (cancelled) return
        const current = versionsData?.current || {}
        const subData = {
          ...current,
          phases: versionsData?.phases || {},
          currentPhaseId: versionsData?.currentPhaseId || null,
          status: current.pptUrl || current.pdfUrl || current.videoUrl || current.githubUrl ? 'draft' : 'draft',
        }
        setSub(subData)
        setGithubUrl(current.githubUrl || '')
        setTeamLocked(Boolean(rosterData?.submissionLocked))
        setTeamData({
          submissionLocked: Boolean(rosterData?.submissionLocked),
          eventRegistered: Boolean(rosterData?.eventRegistered),
          paymentStatus: rosterData?.paymentStatus || 'pending',
          paymentChoice: rosterData?.paymentChoice || null,
          shortlistedPhases: Array.isArray(rosterData?.shortlistedPhases) ? rosterData.shortlistedPhases : [],
        })
      } catch {
        // API error — leave state as null
      }
    }
    load()
    return () => { cancelled = true }
  }, [teamId, api])

  const locked = teamLocked || Boolean(sub?.finalizedAt)
  const progress = submissionCompleteness(sub)

  // Phase-aware logic
  const isPhase1 = activePhase && phases.find((p) => p.id === activePhase.id)?.order === 1
  const teamShortlistedPhases = teamData?.shortlistedPhases || []
  const teamCanAccessActivePhase = !activePhase || isPhase1 || teamShortlistedPhases.includes(activePhase.id)
  // Phase is open if: status is ACTIVE (matches backend canTeamSubmit logic)
  const phaseSubmissionsOpen = (() => {
    if (!activePhase) return true
    if (activePhase.status === 'ACTIVE') return true
    return false
  })()
  const phaseDeadlinePassed = activePhase?.deadline && new Date(activePhase.deadline).getTime() < Date.now()
  const phaseRequirements = activePhase?.requirements || {
    pptRequired: true,
    pdfRequired: true,
    videoRequired: false,
    githubRequired: false,
    deployedUrlRequired: false,
  }
  
  // Check if payment is pending (Phase 3: Pay Later flow)
  const paymentPending = teamData && 
    teamData.paymentStatus === 'pending' && 
    !teamData.eventRegistered &&
    teamData.paymentChoice === 'later'

  async function uploadFile(kind, file) {
    if (!storage || !teamId || !user) {
      setStatus('Configure Firebase Storage to enable uploads.')
      return
    }
    if (locked) {
      setStatus('Submission is locked — contact an admin if you need changes.')
      return
    }
    // BUG-5 FIX: Validate phase gate before starting the Storage upload.
    // Without this, the file uploads to Storage even when the phase is closed,
    // and only the metadata write is blocked — leaving orphaned files in Storage.
    if (activePhase && (!phaseSubmissionsOpen || phaseDeadlinePassed)) {
      setStatus('Submissions are not open for the current phase.')
      return
    }
    if (activePhase && !teamCanAccessActivePhase) {
      setStatus('Your team is not shortlisted for this phase.')
      return
    }
    const err = assertFile(kind, file)
    if (err) {
      setStatus(err)
      return
    }
    setStatus('')
    const path = `submissions/${teamId}/${kind}/${file.name}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      (s) => setPct(Math.round((100 * s.bytesTransferred) / s.totalBytes)),
      (e) => setStatus(e.message),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        const field = kind === 'ppt' ? 'pptUrl' : kind === 'pdf' ? 'pdfUrl' : 'videoUrl'
        try {
          const result = await api.patchSubmissionMetadata({ [field]: url, status: 'draft' })
          setSub((prev) => ({ ...prev, [field]: url, status: 'draft' }))
          setPct(0)
          const versionInfo = result?.currentVersion ? ` (Version ${result.currentVersion})` : ''
          setStatus(`Uploaded — saved as draft${versionInfo} until you finalize.`)
        } catch (e) {
          setPct(0)
          setStatus(e.message || 'Upload reached Storage but metadata write failed (API / deadline).')
        }
      },
    )
  }

  async function saveLinks() {
    if (!teamId || !user) return
    if (locked) {
      setStatus('Submission is locked.')
      return
    }
    setStatus('')
    try {
      const result = await api.patchSubmissionMetadata({ githubUrl, status: 'draft' })
      setSub((prev) => ({ ...prev, githubUrl, status: 'draft' }))
      const versionInfo = result?.currentVersion ? ` (Version ${result.currentVersion})` : ''
      setStatus(`GitHub link saved (draft)${versionInfo}.`)
    } catch (e) {
      setStatus(e.message || 'Could not save links')
    }
  }

  async function finalize() {
    setStatus('')
    try {
      await api.finalizeSubmission()
      setStatus('Submission finalized and locked.')
      // HIGH-05: Reload via API instead of direct Firestore reads
      const [versionsData, rosterData] = await Promise.all([
        api.getSubmissionVersions(),
        api.teamRoster(),
      ])
      const current = versionsData?.current || {}
      setSub((prev) => ({ ...prev, ...current, phases: versionsData?.phases || {} }))
      setTeamLocked(Boolean(rosterData?.submissionLocked))
    } catch (e) {
      setStatus(e.message || 'Could not finalize')
    }
  }

  if (!teamId) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-ink-600">Join a team before uploading submissions.</p>
        <Link to="/dashboard/team" className="mt-4 inline-block text-brand-600 hover:underline">
          Go to My Team
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Submission Center</h1>
        <p className="mt-2 text-sm text-ink-600">
          Upload your files for the current competition phase. The admin sets which files are required for each phase.
        </p>
      </div>

      {/* Phase Info Banner */}
      {activePhase ? (
        <Card className={`border-2 ${
          !teamCanAccessActivePhase ? 'border-red-500/40 bg-red-500/5' :
          !phaseSubmissionsOpen || phaseDeadlinePassed ? 'border-amber-500/40 bg-amber-500/5' :
          'border-brand-500/40 bg-brand-500/5'
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Current Phase</p>
              <h2 className="mt-1 font-display text-xl font-bold text-ink-900">{activePhase.name}</h2>
              {activePhase.description && (
                <p className="mt-1 text-sm text-ink-600">{activePhase.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {phaseSubmissionsOpen && !phaseDeadlinePassed ? (
                <Badge tone="success">Submissions Open</Badge>
              ) : phaseDeadlinePassed ? (
                <Badge tone="danger">Deadline Passed</Badge>
              ) : (
                <Badge tone="warn">Submissions Closed</Badge>
              )}
              {teamCanAccessActivePhase ? (
                <Badge tone="brand">Eligible</Badge>
              ) : (
                <Badge tone="danger">Not Shortlisted</Badge>
              )}
            </div>
          </div>
          {activePhase.deadline && (
            <p className="mt-3 text-xs font-medium text-amber-800">
              Phase deadline: {new Date(activePhase.deadline).toLocaleString()}
            </p>
          )}
          {!teamCanAccessActivePhase && (
            <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700">
              Your team is not shortlisted for this phase. Wait for the admin to announce shortlists.
            </div>
          )}
        </Card>
      ) : null}

      {locked ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm text-amber-950">
              This submission is <strong>locked</strong>. Uploads and link edits are disabled until an administrator unlocks your
              team (if ever).
            </p>
          </div>
        </Card>
      ) : null}

      {paymentPending ? (
        <Card className="border-red-500/40 bg-red-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-950">
                Payment Required to Submit
              </p>
              <p className="mt-1 text-sm text-red-900">
                You chose "Pay Later" during registration. Complete your payment to unlock submissions.
              </p>
              <Link 
                to="/dashboard/registration" 
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Go to Registration & Pay Now
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge tone={sub?.status === 'submitted' || locked ? 'success' : 'neutral'}>
          {locked ? 'locked' : sub?.status || 'draft'}
        </Badge>
        <Badge tone="brand">
          Progress {progress.filled}/{progress.total}
        </Badge>
        {pct > 0 ? <Badge tone="brand">Upload {pct}%</Badge> : null}
      </div>

      {status ? (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
          status.startsWith('Uploaded') || status.startsWith('GitHub link saved') || status.startsWith('Submission finalized')
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800'
            : status.includes('locked') || status.includes('not configured') || status.includes('Register') || status.includes('deadline') || status.includes('payment') || status.includes('Complete')
              ? 'border-red-500/30 bg-red-50 text-red-800'
              : 'border-amber-500/30 bg-amber-50 text-amber-800'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">{status}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* PPT Upload */}
        {phaseRequirements.pptRequired && (
          <Card className={locked || !teamCanAccessActivePhase || !phaseSubmissionsOpen || phaseDeadlinePassed ? 'pointer-events-none opacity-60' : ''}>
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <FileText className="h-4 w-4 text-brand-600" />
              PPT / Presentation
              <Badge tone="danger" className="ml-auto text-[9px]">REQUIRED</Badge>
            </h2>
            <p className="mt-2 text-xs text-ink-500">Max ~{Math.round(MAX_PPT_BYTES / (1024 * 1024))} MB. PPT or PPTX format.</p>
            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[rgb(var(--border))] p-6 text-center text-sm hover:border-brand-500/50">
              <Upload className="mx-auto h-8 w-8 text-ink-400" />
              <span className="mt-2 block text-ink-600">{sub?.pptUrl ? 'Replace PPT' : 'Upload PPT / PPTX'}</span>
              <input
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                disabled={locked}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile('ppt', f)
                }}
              />
            </label>
          </Card>
        )}

        {/* PDF Upload */}
        {phaseRequirements.pdfRequired && (
          <Card className={locked || !teamCanAccessActivePhase || !phaseSubmissionsOpen || phaseDeadlinePassed ? 'pointer-events-none opacity-60' : ''}>
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <FileText className="h-4 w-4 text-red-500" />
              PDF Document
              <Badge tone="danger" className="ml-auto text-[9px]">REQUIRED</Badge>
            </h2>
            <p className="mt-2 text-xs text-ink-500">Max ~{Math.round(MAX_PDF_BYTES / (1024 * 1024))} MB. PDF brief or report.</p>
            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[rgb(var(--border))] p-6 text-center text-sm hover:border-brand-500/50">
              <Upload className="mx-auto h-8 w-8 text-ink-400" />
              <span className="mt-2 block text-ink-600">{sub?.pdfUrl ? 'Replace PDF' : 'Upload PDF'}</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={locked}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile('pdf', f)
                }}
              />
            </label>
          </Card>
        )}

        {/* Video Upload */}
        {phaseRequirements.videoRequired && (
          <Card className={locked || !teamCanAccessActivePhase || !phaseSubmissionsOpen || phaseDeadlinePassed ? 'pointer-events-none opacity-60' : ''}>
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <Video className="h-4 w-4 text-blue-500" />
              Demo Video
              <Badge tone="danger" className="ml-auto text-[9px]">REQUIRED</Badge>
            </h2>
            <p className="mt-2 text-xs text-ink-500">Max ~{Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB. MP4 or WebM.</p>
            <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center text-sm hover:border-brand-500/50">
              <Upload className="mx-auto h-8 w-8 text-ink-400" />
              <span className="mt-2 block text-ink-600">{sub?.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={locked}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadFile('video', f)
                }}
              />
            </label>
          </Card>
        )}

        {/* GitHub URL */}
        {phaseRequirements.githubRequired && (
          <Card className={locked || !teamCanAccessActivePhase || !phaseSubmissionsOpen || phaseDeadlinePassed ? 'pointer-events-none opacity-60' : ''}>
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <Github className="h-4 w-4" />
              GitHub Repository
              <Badge tone="danger" className="ml-auto text-[9px]">REQUIRED</Badge>
            </h2>
            <p className="mt-2 text-xs text-ink-500">Public GitHub repository URL.</p>
            <Input
              className="mt-4"
              value={githubUrl}
              disabled={locked}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
            />
            <Button variant="secondary" className="mt-3 w-full gap-2" disabled={locked} onClick={saveLinks}>
              <Github className="h-4 w-4" />
              Save GitHub Link
            </Button>
          </Card>
        )}

        {/* Deployed URL */}
        {phaseRequirements.deployedUrlRequired && (
          <Card className={locked || !teamCanAccessActivePhase || !phaseSubmissionsOpen || phaseDeadlinePassed ? 'pointer-events-none opacity-60' : ''}>
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <FileText className="h-4 w-4 text-emerald-500" />
              Deployed URL
              <Badge tone="danger" className="ml-auto text-[9px]">REQUIRED</Badge>
            </h2>
            <p className="mt-2 text-xs text-ink-500">Live deployment link (Vercel, Netlify, etc.)</p>
            <Input
              className="mt-4"
              defaultValue={sub?.deployedUrl || ''}
              disabled={locked}
              onChange={(e) => {
                // HIGH-10: Debounce API call — was firing on every keystroke
                const val = e.target.value
                clearTimeout(deployedUrlTimer.current)
                deployedUrlTimer.current = setTimeout(() => {
                  if (val !== sub?.deployedUrl) {
                    api.patchSubmissionMetadata({ deployedUrl: val, status: 'draft' })
                      .then(() => setSub((prev) => ({ ...prev, deployedUrl: val })))
                      .catch((err) => setStatus(err.message || 'Failed to save'))
                  }
                }, 600)
              }}
              placeholder="https://your-app.vercel.app"
            />
          </Card>
        )}
      </div>

      <Card>
        <h2 className="font-display font-semibold text-ink-900">Finalize</h2>
        <p className="mt-2 text-xs text-ink-600">
          Finalizing marks your package submitted and locks edits server-side. The API re-validates phase and deadlines — do not
          rely on the Razorpay-style popup alone for submissions.
        </p>
        <Button className="mt-4 gap-2" variant="secondary" disabled={locked} onClick={finalize}>
          <Lock className="h-4 w-4" />
          Finalize submission
        </Button>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-ink-900">Your Submissions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SubmittedFile label="Presentation (PPT)" url={sub?.pptUrl} icon="ppt" />
          <SubmittedFile label="PDF Document" url={sub?.pdfUrl} icon="pdf" />
          <SubmittedFile label="Video Demo" url={sub?.videoUrl} icon="video" />
          <SubmittedFile label="GitHub Repo" url={sub?.githubUrl} icon="github" />
        </div>
      </Card>
    </div>
  )
}


/** Clean file card — shows icon + label, opens in new tab on click */
function SubmittedFile({ label, url, icon }) {
  const iconColors = {
    ppt: 'bg-orange-500/10 text-orange-600',
    pdf: 'bg-red-500/10 text-red-600',
    video: 'bg-blue-500/10 text-blue-600',
    github: 'bg-ink-100 text-ink-700',
  }

  const IconComponent = icon === 'ppt' ? FileText : icon === 'pdf' ? FileText : icon === 'video' ? Video : Github

  if (!url) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-3 opacity-50">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColors[icon]}`}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="text-[11px] text-ink-400">Not uploaded</p>
        </div>
      </div>
    )
  }

  // Use Google Docs Viewer for PPT/PDF to preview in browser without downloading
  const viewUrl = (icon === 'ppt' || icon === 'pdf')
    ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
    : url

  return (
    <a
      href={viewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 transition-all hover:border-brand-500/30 hover:shadow-md"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColors[icon]}`}>
        <IconComponent className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-[11px] text-emerald-600">Uploaded ✓ · Click to view</p>
      </div>
      <ArrowLeft className="h-4 w-4 rotate-180 text-ink-400" />
    </a>
  )
}

