import { motion } from 'framer-motion'
import { TimelineSection } from '@/components/home/TimelineSection.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

export function TimelinePage() {
  usePageSeo({ title: 'Timeline', description: `Event timeline and milestones for ${APP.name}.` })

  return (
    <>
      {/* ═══════ HERO BANNER ═══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/skh-banner.png" alt="Smart Kopargaon Hackathon 2026" className="h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/65 to-ink-950/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-ink-950/40" />
        </div>
        <div className="relative w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              {APP.shortName} 2026 · Roadmap
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Event Timeline
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-lg">
              Key milestones and deadlines for {APP.shortName || 'SKH'} 2026. Dates synchronized with
              district and university calendars.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ TIMELINE CONTENT ═══════ */}
      <TimelineSection showHeading={false} />
    </>
  )
}
