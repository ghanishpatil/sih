import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

export function JoinTeamPage() {
  usePageSeo({ title: 'Join Team', description: 'Join a hackathon team with invite code.' })
  const { inviteCode } = useParams()
  const navigate = useNavigate()
  const { user, profile, refreshProfile, getToken } = useAuth()
  const [status, setStatus] = useState('loading') // loading, found, notfound, joining, joined, error
  const [teamInfo, setTeamInfo] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!inviteCode) {
      setStatus('error')
      setMsg('No invite code provided in URL.')
      return
    }

    if (!user) {
      // Not logged in - redirect to auth with invite code
      const returnUrl = `/join/${inviteCode}`
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`, { replace: true })
      return
    }

    // Lookup the invite code
    async function lookupCode() {
      try {
        const token = await getToken()
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/participant/lookup-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
        })
        const data = await res.json()
        
        if (!res.ok) {
          setStatus('error')
          setMsg(data.error || 'Failed to lookup invite code.')
          return
        }

        if (!data.found) {
          setStatus('notfound')
          setMsg('Invalid invite code. Please check the code and try again.')
          return
        }

        setTeamInfo(data)
        setStatus('found')
      } catch (e) {
        setStatus('error')
        setMsg(e.message || 'Could not lookup invite code.')
      }
    }

    lookupCode()
  }, [inviteCode, user, navigate, getToken])

  async function joinTeam() {
    setStatus('joining')
    setMsg('')
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/participant/join-team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMsg(data.error || 'Failed to join team.')
        return
      }

      await refreshProfile()
      setStatus('joined')
      setMsg('Successfully joined the team!')
      
      // Redirect to team page after 2 seconds
      setTimeout(() => {
        navigate('/dashboard/team')
      }, 2000)
    } catch (e) {
      setStatus('error')
      setMsg(e.message || 'Could not join team.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-600" />
          <p className="mt-4 text-sm text-ink-600">Looking up invite code...</p>
        </div>
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">
            Invite Code Not Found
          </h1>
          <p className="mt-3 text-sm text-ink-600">{msg}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard/team">
              <Button variant="secondary">Go to My Team</Button>
            </Link>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">
            Something Went Wrong
          </h1>
          <p className="mt-3 text-sm text-ink-600">{msg}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard/team">
              <Button>Go to My Team</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (status === 'joined') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">
            Welcome to the Team!
          </h1>
          <p className="mt-3 text-sm text-ink-600">
            You've successfully joined <strong>{teamInfo?.name}</strong>
          </p>
          <p className="mt-2 text-xs text-ink-500">Redirecting to your team page...</p>
        </motion.div>
      </div>
    )
  }

  if (status === 'joining') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-600" />
          <p className="mt-4 text-sm text-ink-600">Joining team...</p>
        </div>
      </div>
    )
  }

  // status === 'found'
  const alreadyInTeam = profile?.teamId && profile.teamId === teamInfo?.teamId

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15">
          <Users className="h-8 w-8 text-brand-600" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-ink-900">
          Join Team
        </h1>
        <p className="mt-3 text-sm text-ink-600">
          You've been invited to join a hackathon team
        </p>
      </motion.div>

      <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/5 to-transparent">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
            <Users className="h-6 w-6 text-brand-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold text-ink-900">
              {teamInfo?.name || 'Team'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Code: {inviteCode?.toUpperCase()}</Badge>
              {teamInfo?.eventId ? (
                <Badge tone="neutral">Event: {teamInfo.eventId}</Badge>
              ) : null}
            </div>
          </div>
        </div>

        {alreadyInTeam ? (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 text-sm text-emerald-900">
              <CheckCircle2 className="h-5 w-5" />
              You're already a member of this team!
            </p>
          </div>
        ) : profile?.teamId ? (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> You're currently in another team. Joining this team will remove you from your current team.
            </p>
          </div>
        ) : null}

        {msg ? (
          <p className="mt-4 text-sm text-ink-700">{msg}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {alreadyInTeam ? (
            <Link to="/dashboard/team" className="flex-1">
              <Button className="w-full gap-2">
                Go to Team Page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Button className="flex-1 gap-2" onClick={joinTeam}>
                Join Team
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/dashboard/team">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg font-semibold text-ink-900">
          What happens next?
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-ink-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700">
              1
            </span>
            <span>You'll be added to the team roster</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700">
              2
            </span>
            <span>Complete team registration together (if not done yet)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-semibold text-brand-700">
              3
            </span>
            <span>Select a problem statement and start building!</span>
          </li>
        </ul>
      </Card>
    </div>
  )
}
