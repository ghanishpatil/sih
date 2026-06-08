import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { SPONSORS } from '@/utils/constants.js'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'

const tierStyle = {
  host: 'from-amber-500/15 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50',
  platinum: 'from-slate-400/15 to-slate-500/5 border-slate-400/30 hover:border-slate-400/50',
  gold: 'from-yellow-500/15 to-amber-500/5 border-yellow-500/30 hover:border-yellow-500/50',
  silver: 'from-zinc-400/10 to-zinc-500/5 border-zinc-400/25 hover:border-zinc-400/45',
}

const tierLabel = {
  host: 'text-amber-700',
  platinum: 'text-slate-600',
  gold: 'text-yellow-700',
  silver: 'text-zinc-600',
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export function SponsorsSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Partners"
          title="Sponsors & institutional partners"
          description="A shared stage for public departments, industry bodies, and innovation programs."
        />
        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {SPONSORS.map((s) => (
            <motion.div
              key={s.name}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.03, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-center shadow-card transition-shadow duration-300 hover:shadow-card-hover ${tierStyle[s.tier] || tierStyle.silver}`}
            >
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20" />
              <div className="relative">
                <motion.div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/40 shadow-sm"
                  whileHover={{ rotateY: 180, transition: { duration: 0.5 } }}
                >
                  <Building2 className="h-6 w-6 text-ink-400" />
                </motion.div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${tierLabel[s.tier] || tierLabel.silver}`}>
                  {s.tier}
                </p>
                <p className="mt-2 font-display text-sm font-semibold text-ink-900">
                  {s.name}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
