import { motion } from 'framer-motion'
import { cn } from '@/utils/cn.js'

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue,
  size = 'md',
  tone = 'brand',
  animated,
  className,
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const gradients = {
    brand: 'from-brand-500 to-brand-400',
    success: 'from-emerald-500 to-emerald-400',
    warn: 'from-amber-500 to-amber-400',
    danger: 'from-red-500 to-red-400',
    cyan: 'from-cyan-500 to-cyan-400',
  }

  return (
    <div className={cn('w-full', className)}>
      {label || showValue ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          {label ? (
            <span className="text-sm font-medium text-ink-700">{label}</span>
          ) : null}
          {showValue ? (
            <span className="text-sm font-semibold tabular-nums text-ink-900">
              {Math.round(pct)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]',
          heights[size],
        )}
      >
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r',
            gradients[tone],
          )}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={
            animated
              ? { duration: 1, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0.3 }
          }
        />
      </div>
    </div>
  )
}
