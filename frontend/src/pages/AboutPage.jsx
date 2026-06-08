import { motion } from 'framer-motion'
import { Target, Building2, Lightbulb, Users, Award, Globe, Zap, Shield } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP } from '@/utils/constants.js'

const pillars = [
  { icon: Target, title: 'Problem-first', body: 'Curated civic and industrial challenges sourced with departments and MSME partners.' },
  { icon: Building2, title: 'Institutional backbone', body: `${APP.university} hosts infrastructure, mentorship, and governance for a trusted event.` },
  { icon: Lightbulb, title: 'Ship-ready mindset', body: 'Submissions emphasize feasibility, measurable impact, and pathways beyond the weekend.' },
]

const values = [
  { icon: Users, title: 'Inclusive participation', body: 'Open to students across India. Cross-disciplinary teams encouraged.' },
  { icon: Award, title: 'Merit-driven evaluation', body: 'Structured rubric scoring by domain-expert jury panels.' },
  { icon: Globe, title: 'Regional relevance', body: 'Problems grounded in Kopargaon Taluka realities and district needs.' },
  { icon: Zap, title: 'Rapid prototyping', body: '48-hour build sprints with mentors, resources, and structured milestones.' },
  { icon: Shield, title: 'Data integrity', body: 'Audit trails, role-based access, and transparent evaluation workflows.' },
  { icon: Building2, title: 'Government alignment', body: 'Aligned with Smart Cities Mission, Digital India, and state innovation policies.' },
]

export function AboutPage() {
  usePageSeo({
    title: 'About',
    description: `Learn about ${APP.name} and the innovation mission for ${APP.region}.`,
  })
  return (
    <div className="relative">
      {/* Hero banner */}
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
              {APP.shortName} 2026 · About
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              About the Hackathon
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-lg">
              {APP.name} is modeled on national hackathon best practices — refined for {APP.region} with
              clearer UX, faster operations, and stronger collaboration between students, departments, and industry.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 sm:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {pillars.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:bg-brand-500/15" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{b.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values grid */}
      <section className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 py-16 sm:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Values"
            title="What drives the platform"
            description="Core principles that shape every aspect of the SKH ecosystem."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                  <v.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-ink-900">{v.title}</h3>
                  <p className="mt-1 text-sm text-ink-500">{v.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
