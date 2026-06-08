import { motion } from 'framer-motion'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

const team = [
  { name: 'Dr. Faculty Lead', role: 'Dean, Innovation & Incubation' },
  { name: 'Prof. Program Director', role: 'Hackathon Chair' },
  { name: 'Industry Liaison', role: 'MSME Partnerships' },
  { name: 'District Coordinator', role: 'Government interface' },
  { name: 'Student Core', role: 'Logistics & volunteer ops' },
]

export function TeamPage() {
  usePageSeo({ title: 'Organizing team', description: `Meet the ${APP.name} organizing team.` })
  return (
    <div className="w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <SectionHeading
        eyebrow="People"
        title="Organizing team"
        description="A cross-functional crew spanning university administration, faculty, student volunteers, and district partners."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m, i) => (
          <motion.div
            key={m.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-center shadow-card"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-cyan-500/10 font-display text-lg font-bold text-brand-700">
              {m.name.charAt(0)}
            </div>
            <p className="mt-4 font-display font-semibold text-ink-900">{m.name}</p>
            <p className="mt-1 text-sm text-ink-600">{m.role}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
