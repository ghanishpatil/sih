import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, X, Send, Bot, User, Loader2, Sparkles,
  Maximize2, Minimize2, Trash2, Copy, Check, RotateCcw,
  ChevronDown, Download,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi.js'

/* ── Markdown-lite renderer ─────────────────────────────────── */
function renderText(text) {
  const lines = text.split('\n')
  const result = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^[-*•]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(<li key={i} className="ml-4 list-disc text-sm leading-relaxed">{inlineFormat(lines[i].replace(/^[-*•]\s/, ''))}</li>)
        i++
      }
      result.push(<ul key={`ul-${i}`} className="my-1 space-y-0.5">{items}</ul>)
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{inlineFormat(lines[i].replace(/^\d+\.\s/, ''))}</li>)
        i++
      }
      result.push(<ol key={`ol-${i}`} className="my-1 space-y-0.5">{items}</ol>)
      continue
    }
    if (/^#{1,3}\s/.test(line)) {
      result.push(<p key={i} className="mt-2 mb-0.5 text-sm font-bold text-ink-900">{inlineFormat(line.replace(/^#{1,3}\s/, ''))}</p>)
    } else if (!line.trim()) {
      result.push(<div key={i} className="h-1.5" />)
    } else {
      result.push(<p key={i} className="text-sm leading-relaxed">{inlineFormat(line)}</p>)
    }
    i++
  }
  return result
}

function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-ink-900">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[11px] text-ink-800">{part.slice(1, -1)}</code>
    return part
  })
}

const SUGGESTED = [
  'How do I assign a mentor?',
  'How do I bulk import problem statements?',
  'How do I shortlist teams for a phase?',
  'How do I publish results?',
  'How do I set up jury evaluation?',
  'What does each competition phase mean?',
  'How do I record a manual payment?',
  'How do I ban or delete a user?',
]

const SIZES = {
  sm:  { w: 380, h: 480, label: 'Small' },
  md:  { w: 440, h: 560, label: 'Medium' },
  lg:  { w: 560, h: 680, label: 'Large' },
  xl:  { w: 700, h: 800, label: 'Full' },
}

function exportChat(messages) {
  const lines = messages.map((m) =>
    `[${m.role === 'model' ? 'Assistant' : 'You'}]\n${m.text}\n`
  )
  const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skh-admin-chat-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminChatbot() {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [sizeKey, setSizeKey] = useState('md')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi! I'm your SKH Admin Assistant powered by Gemini. Ask me anything about managing the platform — mentor assignments, problem statements, jury setup, payments, or anything else." },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [showSizeMenu, setShowSizeMenu] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const size = SIZES[sizeKey]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setError('')
    const userMsg = { role: 'user', text: msg }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, text: m.text }))
      const { reply } = await api.adminChatbot(msg, history)
      setMessages((prev) => [...prev, { role: 'model', text: reply }])
    } catch (e) {
      setError(e.message || 'Failed to get a response.')
    } finally {
      setLoading(false)
    }
  }, [api, input, loading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clearChat = () => {
    setMessages([{ role: 'model', text: "Chat cleared. How can I help you?" }])
    setError('')
  }

  const copyMessage = (text, idx) => {
    navigator.clipboard?.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    setMessages((prev) => prev.slice(0, -1))
    await send(lastUser.text)
  }

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-transform hover:scale-105 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label="Open admin assistant"
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Unread dot when closed and has conversation */}
        {!open && messages.length > 1 && (
          <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chatwindow"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl"
            style={{ width: size.w, height: size.h, maxWidth: 'calc(100vw - 3rem)', maxHeight: 'calc(100svh - 8rem)' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-[rgb(var(--border))] bg-brand-600 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">SKH Admin Assistant</p>
                <p className="text-[10px] text-white/70">Gemini 2.5 Flash · {messages.length - 1} message{messages.length !== 2 ? 's' : ''}</p>
              </div>

              {/* Size selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSizeMenu((v) => !v)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/10"
                  title="Resize"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  {size.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <AnimatePresence>
                  {showSizeMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 z-10 overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-lg"
                    >
                      {Object.entries(SIZES).map(([key, s]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setSizeKey(key); setShowSizeMenu(false) }}
                          className={`flex w-full items-center justify-between gap-6 px-4 py-2 text-xs transition-colors hover:bg-[rgb(var(--surface-muted))] ${sizeKey === key ? 'font-bold text-brand-600' : 'text-ink-700'}`}
                        >
                          <span>{s.label}</span>
                          <span className="text-ink-400">{s.w}×{s.h}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => exportChat(messages)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" title="Export chat">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={clearChat} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" title="Clear chat">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`group flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : 'bg-[rgb(var(--surface-muted))] text-ink-800 rounded-bl-md'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="space-y-0.5">{renderText(msg.text)}</div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )}
                    {/* Copy button on hover */}
                    <button
                      type="button"
                      onClick={() => copyMessage(msg.text, i)}
                      className={`absolute -top-2 ${msg.role === 'user' ? '-left-7' : '-right-7'} hidden rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1 text-ink-400 shadow-sm hover:text-ink-700 group-hover:flex`}
                      title="Copy"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-[rgb(var(--surface-muted))] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <span className="flex-1">{error}</span>
                  <button type="button" onClick={regenerate} className="shrink-0 font-semibold underline hover:no-underline">Retry</button>
                </div>
              )}

              {/* Suggested questions */}
              {messages.length === 1 && !loading && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Try asking</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUGGESTED.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-left text-xs text-ink-700 transition-colors hover:border-brand-500/40 hover:bg-brand-50 hover:text-brand-700"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate last response */}
              {messages.length > 2 && !loading && !error && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={regenerate}
                    className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-[11px] text-ink-500 transition-colors hover:border-brand-500/40 hover:text-brand-600"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Regenerate response
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[rgb(var(--border))] p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about the admin panel…"
                  rows={1}
                  disabled={loading}
                  className="min-h-[2.25rem] max-h-28 flex-1 resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                  aria-label="Send"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-ink-400">Enter to send · Shift+Enter for new line</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
