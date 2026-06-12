import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { FAQ_ITEMS } from '@/utils/constants.js'
import { SectionHeading } from '@/components/ui/SectionHeading.jsx'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

export function FAQSection() {
  // Default: all collapsed (-1 means nothing open)
  const [open, setOpen] = useState(-1)

  return (
    <section className="relative overflow-hidden border-t border-[rgb(var(--border))] py-20 sm:py-28">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--surface-muted))]/30 to-transparent" />

      <div className="relative w-full px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers for teams & partners"
          description="Still unsure? Reach the organizing team from the contact page — we respond within two working days."
        />

        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={item.q}
                variants={itemVariants}
                className={[
                  'group overflow-hidden rounded-2xl border transition-all duration-300',
                  isOpen
                    ? 'border-brand-500/40 bg-[rgb(var(--surface))] shadow-card'
                    : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-brand-500/20 hover:shadow-md',
                ].join(' ')}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-[15px] font-semibold text-ink-900">
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                      isOpen
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                        : 'bg-[rgb(var(--surface-muted))] text-ink-400 group-hover:bg-brand-500/10 group-hover:text-brand-600',
                    ].join(' ')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[rgb(var(--border))]/50 px-6 py-5">
                        <p className="text-sm leading-relaxed text-ink-600">
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
