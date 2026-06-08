import { motion } from 'framer-motion'
import { cn } from '@/utils/cn.js'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  gradient,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'mx-auto mb-14 max-w-3xl',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-brand-600">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          {eyebrow}
        </span>
      ) : null}
      <h2
        className={cn(
          'font-display text-3xl font-bold tracking-tight sm:text-4xl',
          gradient
            ? 'text-gradient'
            : 'text-ink-900',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-ink-600">
          {description}
        </p>
      ) : null}
    </motion.div>
  )
}
