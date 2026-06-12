import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CheckCircle2, CircleDot, Clock, CalendarDays, Milestone } from 'lucide-react'
import { TIMELINE } from '@/utils/constants.js'
import { Badge } from '@/components/ui/Badge.jsx'
import { publicApi } from '@/services/api.js'

function computeStatus(item) {
  const now = new Date()
  const start = item.startDate ? new Date(item.startDate) : null
  const end = item.endDate ? new Date(item.endDate) : start
  if (!start) return item.status || 'upcoming'
  const endEOD = end ? new Date(end.getTime()) : null
  if (endEOD) endEOD.setHours(23, 59, 59, 999)
  if (now >= start && endEOD && now <= endEOD) return 'live'
  if (now >= start && !item.endDate) return 'live'
  if (endEOD && now > endEOD) return 'completed'
  return 'upcoming'
}

function formatDate(item) {
  if (item.date) return item.date
  if (!item.startDate) return ''
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  const start = new Date(item.startDate).toLocaleDateString('en-IN', opts)
  if (!item.endDate || item.endDate === item.startDate) return start
  const end = new Date(item.endDate).toLocaleDateString('en-IN', opts)
  return `${start} – ${end}`
}

// ── Organic SVG blobs — bigger, more saturated ───────────────
function LeftBlob() {
  return (
    <svg viewBox="0 0 240 700" className="pointer-events-none absolute -left-4 top-1/2 h-[700px] w-[220px] -translate-y-1/2" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="tlLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d="M0,0 C80,30 160,10 130,130 C100,250 20,270 50,390 C80,510 160,490 130,610 C100,700 30,680 0,700 Z" fill="url(#tlLeftGrad)" />
    </svg>
  )
}

function RightBlob() {
  return (
    <svg viewBox="0 0 240 700" className="pointer-events-none absolute -right-4 top-1/2 h-[700px] w-[220px] -translate-y-1/2" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="tlRightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.55" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d="M240,0 C160,40 80,20 110,140 C140,260 220,280 190,400 C160,520 70,500 100,620 C130,710 200,690 240,700 Z" fill="url(#tlRightGrad)" />
    </svg>
  )
}

function AmbientBlobs() {
  return (
    <>
      {/* Left — bigger, more visible */}
      <div className="pointer-events-none absolute -left-24 top-[10%] h-80 w-80 rounded-full bg-brand-500/25 blur-[70px]" />
      <div className="pointer-events-none absolute -left-36 top-[45%] h-96 w-96 rounded-full bg-cyan-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -left-20 bottom-[8%] h-72 w-72 rounded-full bg-indigo-500/20 blur-[65px]" />
      {/* Right — bigger, more visible */}
      <div className="pointer-events-none absolute -right-24 top-[15%] h-88 w-88 rounded-full bg-violet-500/25 blur-[70px]" />
      <div className="pointer-events-none absolute -right-32 top-[55%] h-96 w-96 rounded-full bg-brand-400/20 blur-[80px]" />
      <div className="pointer-events-none absolute -right-20 bottom-[5%] h-72 w-72 rounded-full bg-cyan-400/18 blur-[65px]" />
      {/* Center mid-section blobs */}
      <div className="pointer-events-none absolute left-1/4 top-[30%] h-64 w-64 rounded-full bg-brand-500/8 blur-[90px]" />
      <div className="pointer-events-none absolute right-1/4 top-[65%] h-64 w-64 rounded-full bg-violet-500/8 blur-[90px]" />
    </>
  )
}

export function TimelineSection({ showHeading = true }) {
  const containerRef = useRef(null)
  const [apiPhases, setApiPhases] = useState(null)

  useEffect(() => {
    publicApi.getTimeline?.()
      .then(data => {
        const loaded = Array.isArray(data?.phases) ? data.phases : Array.isArray(data) ? data : []
        if (loaded.length > 0) setApiPhases(loaded)
      })
      .catch(() => {})
  }, [])

  const phases = useMemo(() => {
    const raw = apiPhases || TIMELINE
    return raw.map(item => ({
      ...item,
      status: computeStatus(item),
      displayDate: formatDate(item),
    }))
  }, [apiPhases])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  })

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Deep navy background — like SIH */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1f] via-[#0a1628] to-[#060d1f]" />

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <AmbientBlobs />
      <LeftBlob />
      <RightBlob />

      <div className="relative w-full px-4 sm:px-6 lg:px-8">

        {/* ── Heading ── */}
        {showHeading && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand-300">
            <Milestone className="h-3 w-3" />
            Roadmap 2026
          </span>
          <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Hackathon{' '}
            <span className="bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
              Timeline
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
            Milestones synchronized with district and university calendars. Key dates for the 2026 edition.
          </p>

          {/* Stats bar below heading */}
          <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-8 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-sm">
            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-white">{phases.length}</p>
              <p className="text-xs font-medium text-white/50">Phases</p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-emerald-400">
                {phases.filter(p => p.status === 'live').length > 0 ? 'LIVE' : phases.filter(p => p.status === 'completed').length}
              </p>
              <p className="text-xs font-medium text-white/50">
                {phases.filter(p => p.status === 'live').length > 0 ? 'Active Now' : 'Completed'}
              </p>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-white/80">
                {phases.filter(p => p.status === 'upcoming').length}
              </p>
              <p className="text-xs font-medium text-white/50">Upcoming</p>
            </div>
          </div>
        </motion.div>
        )}

        {/* ── Timeline ── */}
        <div className="relative mx-auto max-w-5xl pb-10" ref={containerRef}>

          {/* Mobile line */}
          <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent sm:hidden" />
          <motion.div className="absolute left-7 top-0 w-px origin-top bg-gradient-to-b from-brand-400 via-cyan-400 to-brand-500 sm:hidden" style={{ scaleY: scrollYProgress, bottom: 0 }} />
          <ScrollDot scrollYProgress={scrollYProgress} mobile />

          {/* Desktop center line */}
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent sm:block" />
          <motion.div className="absolute left-1/2 top-0 hidden w-px -translate-x-1/2 origin-top bg-gradient-to-b from-brand-400 via-cyan-400 to-brand-500 sm:block" style={{ scaleY: scrollYProgress, bottom: 0 }} />
          <ScrollDot scrollYProgress={scrollYProgress} />

          <ul className="relative space-y-10 sm:space-y-14">
            {phases.map((item, i) => (
              <TimelineItem key={item.phase ?? i} item={item} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ScrollDot({ scrollYProgress, mobile = false }) {
  const top = useTransform(scrollYProgress, [0, 1], ['0px', 'calc(100% - 10px)'])
  const base = 'absolute z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-brand-400 shadow-[0_0_16px_5px_rgba(59,130,246,0.8)]'
  if (mobile) return <motion.div className={`${base} sm:hidden`} style={{ top, left: '28px' }} />
  return <motion.div className={`${base} hidden sm:block`} style={{ top, left: '50%' }} />
}

function TimelineItem({ item, index }) {
  const itemRef = useRef(null)
  const isLive = item.status === 'live'
  const isPast = item.status === 'completed'
  const isLeft = index % 2 === 0

  const { scrollYProgress } = useScroll({ target: itemRef, offset: ['center 65%', 'center 35%'] })
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0])
  const nodeScale   = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 1])
  const phaseNum    = String(index + 1).padStart(2, '0')

  return (
    <motion.li
      ref={itemRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Mobile */}
      <div className="flex items-start gap-5 pl-16 sm:hidden">
        <div className="absolute left-0 top-3 flex w-14 justify-center" style={{ zIndex: 20 }}>
          <PhaseNode isLive={isLive} isPast={isPast} glowOpacity={glowOpacity} nodeScale={nodeScale} phaseNum={phaseNum} />
        </div>
        <PhaseCard item={item} phaseNum={phaseNum} isLive={isLive} isPast={isPast} />
      </div>

      {/* Desktop alternating */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_80px_1fr] sm:items-center">
        {isLeft ? (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="flex justify-end pr-6"
          >
            <PhaseCard item={item} phaseNum={phaseNum} isLive={isLive} isPast={isPast} alignRight />
          </motion.div>
        ) : <div />}

        {/* Center node */}
        <div className="relative z-20 flex justify-center">
          <PhaseNode isLive={isLive} isPast={isPast} glowOpacity={glowOpacity} nodeScale={nodeScale} phaseNum={phaseNum} />
          {/* Connector */}
          <div className={[
            'absolute top-1/2 h-px w-6 -translate-y-1/2',
            isLive ? 'bg-gradient-to-r from-emerald-400/80 to-emerald-400/20' : isPast ? 'bg-gradient-to-r from-brand-400/80 to-brand-400/20' : 'bg-white/15',
            isLeft ? 'right-full' : 'left-full',
            isLeft ? 'bg-gradient-to-l' : '',
          ].join(' ')} />
        </div>

        {!isLeft ? (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="flex justify-start pl-6"
          >
            <PhaseCard item={item} phaseNum={phaseNum} isLive={isLive} isPast={isPast} />
          </motion.div>
        ) : <div />}
      </div>
    </motion.li>
  )
}

function PhaseNode({ isLive, isPast, glowOpacity, nodeScale, phaseNum }) {
  return (
    <motion.div
      style={{ scale: nodeScale }}
      className={[
        // Outer ring — gives the "gap" between line and node
        'relative z-10 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 shadow-xl',
        // Background must be opaque so the line behind is hidden
        isLive
          ? 'border-emerald-400/80 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_28px_8px_rgba(52,211,153,0.45)]'
          : isPast
            ? 'border-brand-400/70 bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_0_20px_6px_rgba(59,130,246,0.40)]'
            : 'border-white/20 bg-[#0a1628] shadow-[0_0_0_4px_rgba(255,255,255,0.04)]',
      ].join(' ')}
    >
      {/* Extra opaque ring to fully block the line behind */}
      <div className="absolute inset-[-4px] rounded-full bg-[#0a1628] -z-10" />

      {!isLive && !isPast && (
        <motion.div className="absolute inset-0 rounded-full bg-brand-400/25 blur-md" style={{ opacity: glowOpacity }} />
      )}
      {isLive && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/25" />}

      {isLive ? (
        <CircleDot className="h-6 w-6 text-white drop-shadow" />
      ) : isPast ? (
        <CheckCircle2 className="h-6 w-6 text-white drop-shadow" />
      ) : (
        <>
          <span className="font-display text-xs font-bold text-white/50">{phaseNum}</span>
          <Clock className="h-4 w-4 text-white/40" />
        </>
      )}
    </motion.div>
  )
}

function PhaseCard({ item, phaseNum, isLive, isPast, alignRight = false }) {
  const cardStyle = isLive
    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 shadow-[0_0_30px_-5px_rgba(52,211,153,0.25)]'
    : isPast
      ? 'border-brand-500/35 bg-gradient-to-br from-brand-500/12 to-brand-500/4'
      : 'border-white/10 bg-white/5'

  const accentLine = isLive ? 'bg-emerald-400' : isPast ? 'bg-brand-400' : 'bg-white/20'

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'group relative w-full max-w-sm overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl sm:max-w-xs lg:max-w-sm',
        cardStyle,
      ].join(' ')}
    >
      {/* Top accent line */}
      <div className={`absolute left-0 right-0 top-0 h-0.5 ${accentLine}`} />

      {/* Watermark number */}
      <span
        className={[
          'pointer-events-none absolute top-1 select-none font-display text-8xl font-black leading-none text-white/[0.04]',
          alignRight ? 'left-2' : 'right-2',
        ].join(' ')}
        aria-hidden
      >
        {phaseNum}
      </span>

      {/* Live shimmer */}
      {isLive && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/8 via-transparent to-transparent" />
      )}

      <div className={`relative flex flex-col gap-3 ${alignRight ? 'items-end text-right' : 'items-start text-left'}`}>

        {/* Date pill */}
        {(item.displayDate || item.date) && (
          <div className={`flex items-center gap-1.5 ${alignRight ? 'flex-row-reverse' : ''}`}>
            <CalendarDays className="h-3.5 w-3.5 text-white/40" />
            <span className={[
              'text-xs font-semibold',
              isLive ? 'text-emerald-300' : isPast ? 'text-brand-300' : 'text-white/50',
            ].join(' ')}>
              {item.displayDate || item.date}
            </span>
          </div>
        )}

        {/* Phase name */}
        <p className="font-display text-lg font-bold leading-snug text-white sm:text-xl">
          {item.phase}
        </p>

        {/* Description */}
        {item.description && (
          <p className="text-sm leading-relaxed text-white/55">{item.description}</p>
        )}

        {/* Status badge */}
        <div className={`flex items-center gap-2 ${alignRight ? 'flex-row-reverse' : ''}`}>
          {isLive && <Badge tone="success" dot pulse pill>Live now</Badge>}
          {isPast && <Badge tone="brand" pill>Completed</Badge>}
          {!isLive && !isPast && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/40">
              <Clock className="h-3 w-3" />
              Upcoming
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
