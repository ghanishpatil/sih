import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Pin, Megaphone } from 'lucide-react'
import { formatDate } from '@/utils/format.js'
import { useAnnouncements } from '@/hooks/useAnnouncements.js'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'
import { Skeleton } from '@/components/ui/Skeleton.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Badge } from '@/components/ui/Badge.jsx'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export function AnnouncementsPreview() {
  const { items, loading } = useAnnouncements(4)
  return (
    <section className="py-20 sm:py-28">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Newsroom"
          title="Latest announcements"
          description="Live updates from the organizing committee — synced from the platform in real-time."
        />
        <motion.div
          className="grid gap-5 md:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
            : items.length === 0
              ? (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                    <p className="text-sm text-ink-500">
                      No announcements yet. Updates will appear here once published by the admin team.
                    </p>
                  </div>
                )
              : items.map((a) => (
                  <motion.article
                    key={a.id}
                    variants={cardVariants}
                    whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                    className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover"
                  >
                    {a.pinned && (
                      <div className="absolute -top-px left-6 right-6 h-0.5 rounded-b-full bg-gradient-to-r from-brand-500 to-orange-500" />
                    )}
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/10" />
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/10">
                          <Megaphone className="h-3 w-3 text-brand-600" />
                        </div>
                        <span className="text-xs font-semibold text-brand-600">
                          {formatDate(a.createdAt)}
                        </span>
                        {a.pinned ? (
                          <Badge tone="brand" className="gap-1 text-[10px]">
                            <Pin className="h-2.5 w-2.5" /> Pinned
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="mt-2.5 font-display text-lg font-semibold text-ink-900">
                        {a.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-600">
                        {a.body}
                      </p>
                    </div>
                  </motion.article>
                ))}
        </motion.div>
        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link to="/announcements">
            <Button variant="secondary" className="gap-2">
              View all updates
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
