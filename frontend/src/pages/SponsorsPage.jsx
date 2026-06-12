import { motion } from 'framer-motion'
import { Handshake, Building2, Award, GraduationCap, Factory, Star, Globe } from 'lucide-react'
import { SponsorsSection } from '@/components/home/SponsorsSection.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'
import { APP, SPONSORS } from '@/utils/constants.js'

const tierConfig = {
  host: { label: 'Host', accent: 'text-amber-400', bg: 'bg-amber-500/15', icon: Building2 },
  platinum: { label: 'Platinum', accent: 'text-violet-400', bg: 'bg-violet-500/15', icon: Award },
  gold: { label: 'Gold', accent: 'text-yellow-400', bg: 'bg-yellow-500/15', icon: Star },
  silver: { label: 'Silver', accent: 'text-slate-300', bg: 'bg-slate-500/15', icon: Globe },
}

export function SponsorsPage() {
  usePageSeo({ title: 'Sponsors', description: `Partners and sponsors of ${APP.name}.` })

  const tierCounts = SPONSORS.reduce((acc, s) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1
    return acc
  }, {})

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
              {APP.shortName} 2026 · Ecosystem
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Partners & Sponsors
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/75 sm:text-lg">
              Public departments, industry bodies, and academic institutions
              powering the {APP.shortName || 'SKH'} 2026 hackathon.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="relative z-20 w-full -mt-12 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A1128] px-6 py-8 shadow-2xl md:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-shrink-0 text-center sm:text-left"
            >
              <h2 className="text-2xl font-black uppercase leading-tight tracking-wide text-[#FF6B00] md:text-3xl">
                Our<br />Partners
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
            >
              {Object.entries(tierCounts).map(([tier, count], idx) => {
                const cfg = tierConfig[tier] || tierConfig.silver
                const Icon = cfg.icon
                return (
                  <div key={tier} className="flex items-center gap-3">
                    {idx > 0 && <div className="hidden h-12 w-px bg-white/15 sm:block" />}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-6 w-6 ${cfg.accent}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-display text-3xl font-extrabold text-white md:text-4xl">{count}</p>
                      <p className="text-xs font-medium tracking-wide text-white/60">{cfg.label}</p>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ SPONSORS CONTENT ═══════ */}
      <SponsorsSection />
    </>
  )
}
