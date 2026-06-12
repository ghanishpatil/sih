import { motion } from 'framer-motion'
import { Megaphone, Pin, Bell, Newspaper, Rss } from 'lucide-react'
import { formatDate } from '@/utils/format.js'
import { useAnnouncements } from '@/hooks/useAnnouncements.js'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

export function AnnouncementsPage() {
  usePageSeo({ title: 'Announcements', description: `Official updates for ${APP.name}.` })
  const { items, loading } = useAnnouncements(50)

  const pinnedCount = items.filter(a => a.pinned).length

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
              {APP.shortName} 2026 · Newsroom
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Announcements
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-lg">
              Real-time updates from the {APP.shortName || 'SKH'} organizing committee.
              Critical notices, schedule changes, and event highlights.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="relative z-20 w-full -mt-12 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A1128] px-6 py-8 shadow-2xl md:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-shrink-0 text-center sm:text-left"
            >
              <h2 className="text-2xl font-black uppercase leading-tight tracking-wide text-[#FF6B00] md:text-3xl">
                Latest<br />Updates
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-8 md:gap-12"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15">
                  <Newspaper className="h-6 w-6 text-brand-400" />
                </div>
                <div className="text-left">
                  <p className="font-display text-3xl font-extrabold text-white md:text-4xl">{loading ? '—' : items.length}</p>
                  <p className="text-xs font-medium tracking-wide text-white/60">Total Posts</p>
                </div>
              </div>
              <div className="h-12 w-px bg-white/15" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
                  <Pin className="h-6 w-6 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="font-display text-3xl font-extrabold text-white md:text-4xl">{loading ? '—' : pinnedCount}</p>
                  <p className="text-xs font-medium tracking-wide text-white/60">Pinned</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ FEED ═══════ */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
            ) : items.length === 0 ? (
              <EmptyState preset="no-data" />
            ) : (
              items.map((a, i) => (
                <motion.article
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  {a.pinned && (
                    <div className="absolute -top-px left-6 right-6 h-0.5 rounded-b-full bg-gradient-to-r from-amber-500 to-orange-500" />
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                      <Megaphone className="h-4 w-4 text-brand-600" />
                    </div>
                    <span className="text-xs font-semibold text-brand-600">{formatDate(a.createdAt)}</span>
                    {a.pinned ? <Badge tone="brand" className="gap-1 text-[10px]"><Pin className="h-2.5 w-2.5" />Pinned</Badge> : null}
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold text-ink-900">{a.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{a.body}</p>
                </motion.article>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  )
}
