import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { Send, MessageCircle, Users, ArrowDown, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '@/firebase/client.js'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { useApi } from '@/hooks/useApi.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { ChatFileUpload, FileMessageBubble } from '@/components/chat/ChatFileUpload.jsx'

export function MentorChatPage() {
  usePageSeo({ title: 'Teams Chat', description: 'Chat with assigned teams.' })
  const api = useApi()
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [problemStatements, setProblemStatements] = useState([])
  const [activeTeamId, setActiveTeamId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Load teams
  useEffect(() => {
    async function load() {
      try {
        const data = await api.mentorAssignments()
        setTeams(data.teams || [])
        setProblemStatements(data.problemStatements || [])
      } catch {
        setTeams([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [api])

  // Real-time messages via Firestore onSnapshot
  useEffect(() => {
    if (!db || !activeTeamId) return
    setMsgLoading(true)
    const q = query(
      collection(db, `mentorChats/${activeTeamId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(80),
    )
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          text: data.text || '',
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderRole: data.senderRole || 'participant',
          type: data.type || 'text',
          file: data.file || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        }
      }).reverse()
      setMessages(msgs)
      setMsgLoading(false)
    }, () => { setMsgLoading(false) })
    return () => unsub()
  }, [activeTeamId])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (messages.length) scrollToBottom()
  }, [messages.length, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100)
  }, [])

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending || !activeTeamId) return
    setSending(true)
    try {
      await api.mentorTeamChatSend(activeTeamId, text.trim(), null)
      setText('')
      inputRef.current?.focus()
    } catch (e) {
      alert(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }, [api, text, sending, activeTeamId])

  const handleFileUploaded = useCallback(async (file) => {
    if (!activeTeamId) return
    try {
      await api.mentorTeamChatSend(activeTeamId, `📎 ${file.name}`, null, file)
    } catch (e) {
      alert(e.message || 'Failed to send file')
    }
  }, [api, activeTeamId])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const activeTeam = teams.find((t) => t.id === activeTeamId)

  // Group teams by PS
  const psMap = {}
  const directTeams = []
  for (const t of teams) {
    if (t.problemStatementId && t._viaProblemStatement) {
      if (!psMap[t.problemStatementId]) psMap[t.problemStatementId] = []
      psMap[t.problemStatementId].push(t)
    } else {
      directTeams.push(t)
    }
  }

  if (loading) return <Skeleton className="h-[600px] w-full rounded-2xl" />

  if (teams.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <MessageCircle className="mb-4 h-12 w-12 text-ink-300" />
        <h2 className="font-display text-xl font-bold text-ink-900">No Teams Assigned</h2>
        <p className="mt-2 text-sm text-ink-500">You'll see your assigned teams here once the admin assigns you.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] w-full overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:h-[calc(100vh-10rem)]">
      {/* ═══ Sidebar: Team List ═══ */}
      <div className={`flex w-full shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] sm:w-72 ${activeTeamId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="border-b border-[rgb(var(--border))] px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink-900">Teams Chat</h2>
          <p className="text-xs text-ink-500">{teams.length} team{teams.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* PS grouped teams */}
          {Object.entries(psMap).map(([psId, psTeams]) => {
            const ps = problemStatements.find((p) => p.id === psId)
            return (
              <div key={psId}>
                <div className="flex items-center gap-1.5 bg-brand-500/5 px-4 py-2">
                  <FileText className="h-3 w-3 text-brand-600" />
                  <span className="truncate text-[11px] font-semibold text-brand-700">
                    {ps?.title || psId}
                  </span>
                </div>
                {psTeams.map((t) => (
                  <TeamItem key={t.id} t={t} active={activeTeamId === t.id} onClick={() => setActiveTeamId(t.id)} />
                ))}
              </div>
            )
          })}
          {/* Direct teams */}
          {directTeams.length > 0 && Object.keys(psMap).length > 0 && (
            <div className="flex items-center gap-1.5 bg-ink-100/50 px-4 py-2">
              <Users className="h-3 w-3 text-ink-500" />
              <span className="text-[11px] font-semibold text-ink-600">Direct</span>
            </div>
          )}
          {directTeams.map((t) => (
            <TeamItem key={t.id} t={t} active={activeTeamId === t.id} onClick={() => setActiveTeamId(t.id)} />
          ))}
        </div>
      </div>

      {/* ═══ Chat Area ═══ */}
      <div className={`flex flex-1 flex-col ${activeTeamId ? 'flex' : 'hidden sm:flex'}`}>
        {!activeTeamId ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
            <MessageCircle className="mb-4 h-12 w-12 text-ink-200" />
            <h3 className="font-display text-lg font-semibold text-ink-700">Select a team</h3>
            <p className="mt-1 text-sm text-ink-500">Pick a team from the sidebar to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActiveTeamId(null)} className="rounded-lg p-1.5 text-ink-500 hover:bg-[rgb(var(--surface-muted))] sm:hidden">
                  <ArrowDown className="h-4 w-4 -rotate-90" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{activeTeam?.name || 'Team'}</p>
                  <p className="text-xs text-ink-500">
                    {activeTeam?.problemStatementId
                      ? problemStatements.find((p) => p.id === activeTeam.problemStatementId)?.title || ''
                      : 'Direct assignment'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <div className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" title="Live" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              {msgLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="mb-3 h-8 w-8 text-ink-200" />
                  <p className="text-sm text-ink-500">No messages yet. Send a message to this team!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.uid
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isOwn
                            ? 'bg-brand-500 text-white rounded-br-md'
                            : msg.senderRole === 'mentor'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-ink-800 rounded-bl-md'
                              : 'bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] text-ink-800 rounded-bl-md'
                        }`}>
                          <p className={`mb-0.5 text-[11px] font-semibold ${
                            isOwn ? 'text-white/80' :
                            msg.senderRole === 'mentor' ? 'text-emerald-700' : 'text-brand-600'
                          }`}>
                            {isOwn ? 'You' : msg.senderName}
                            {msg.senderRole === 'mentor' && !isOwn ? ' (Mentor)' : ''}
                          </p>
                          {/* File attachment */}
                          {msg.type === 'file' && msg.file && (
                            <div className="mb-1.5">
                              <FileMessageBubble file={msg.file} isOwn={isOwn} />
                            </div>
                          )}
                          {msg.type === 'file'
                            ? (msg.text && !msg.text.startsWith('📎') ? <p className="whitespace-pre-wrap break-words">{msg.text}</p> : null)
                            : <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          }
                          <span className={`mt-1 block text-right text-[10px] ${isOwn ? 'text-white/60' : 'text-ink-400'}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <AnimatePresence>
                {showScrollBtn && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-white shadow-md"
                  >
                    <ArrowDown className="h-3.5 w-3.5 text-ink-600" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 border-t border-[rgb(var(--border))] p-3 sm:gap-3 sm:p-4">
              <ChatFileUpload
                teamId={activeTeamId}
                storagePath="mentorChatFiles"
                onUploaded={handleFileUploaded}
                disabled={sending}
              />
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="min-h-[2.5rem] max-h-28 flex-1 resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Button
                size="sm"
                disabled={!text.trim() || sending}
                onClick={handleSend}
                className="h-10 w-10 shrink-0 rounded-xl p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Sidebar team item */
function TeamItem({ t, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        active ? 'bg-brand-500/10 border-r-2 border-brand-500' : 'hover:bg-[rgb(var(--surface-muted))]'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 font-display text-xs font-bold text-brand-600">
        {(t.name || '?')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${active ? 'text-brand-700' : 'text-ink-900'}`}>
          {t.name || 'Unnamed'}
        </p>
        <p className="truncate text-xs text-ink-400">{t.code || ''}</p>
      </div>
    </button>
  )
}
