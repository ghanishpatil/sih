import { motion } from 'framer-motion'
import { Landmark, Factory, GraduationCap, HeartPulse, Building2, Handshake } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'

const govPartners = [
  { name: 'District Administration', icon: Landmark, desc: 'Problem sourcing & domain access' },
  { name: 'Smart Cities Mission', icon: Building2, desc: 'Urban challenge datasets' },
  { name: 'Dept. of Higher Education', icon: GraduationCap, desc: 'Student mobilization' },
]

const industryPartners = [
  { name: 'Regional MSME Consortium', icon: Factory, desc: 'Industry 4.0 problem statements' },
  { name: 'Healthcare Alliance', icon: HeartPulse, desc: 'Rural health challenges' },
  { name: 'Innovation Council', icon: Handshake, desc: 'Mentorship & incubation pathways' },
]

const cardVariants = {
  hidden: (dir) => ({ opacity: 0, x: dir === 'left' ? -40 : 40, filter: 'blur(4px)' }),
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

function PartnerCard({ name, icon: Icon, desc, direction }) {
  return (
    <motion.div
      custom={direction}
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className="group flex items-start gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <motion.div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 transition-colors group-hover:bg-brand-500/20"
        whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <div>
        <p className="font-display text-sm font-semibold text-ink-900">{name}</p>
        <p className="mt-1 text-xs text-ink-500">{desc}</p>
      </div>
    </motion.div>
  )
}

export function CollaborationSection() {
  return (
    <section className="relative overflow-hidden border-y border-[rgb(var(--border))] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/[0.02] via-transparent to-cyan-500/[0.02]" />
      <div className="relative w-full px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ecosystem"
          title="Government & industry collaboration"
          description="Problems sourced from real departments and regional industries. Solutions evaluated for deployability, not just novelty."
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <h3 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-ink-500">
              <Landmark className="h-4 w-4 text-brand-500" />
              Government partners
            </h3>
            <div className="space-y-3">
              {govPartners.map((p) => (
                <PartnerCard key={p.name} {...p} direction="left" />
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <h3 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-ink-500">
              <Factory className="h-4 w-4 text-cyan-500" />
              Industry partners
            </h3>
            <div className="space-y-3">
              {industryPartners.map((p) => (
                <PartnerCard key={p.name} {...p} direction="right" />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
