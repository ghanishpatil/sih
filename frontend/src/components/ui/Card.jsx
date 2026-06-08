import { cn } from '@/utils/cn.js'

export function Card({ className, accent, hover, glow, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-card transition-all duration-300',
        hover && 'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-brand-500/20',
        glow && 'animate-glow-pulse',
        accent === 'brand' && 'border-l-[3px] border-l-brand-500',
        accent === 'success' && 'border-l-[3px] border-l-emerald-500',
        accent === 'warn' && 'border-l-[3px] border-l-amber-500',
        accent === 'danger' && 'border-l-[3px] border-l-red-500',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassCard({ className, hover, children, ...props }) {
  return (
    <div
      className={cn(
        'glass-card',
        hover && 'hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ title, value, hint, icon: Icon, tone = 'brand', className }) {
  const toneStyles = {
    brand: 'border-brand-500/20 bg-brand-500/5',
    warn: 'border-amber-500/25 bg-amber-500/5',
    danger: 'border-red-500/25 bg-red-500/5',
    success: 'border-emerald-500/20 bg-emerald-500/5',
    neutral: 'border-[rgb(var(--border))]',
  }

  const iconTones = {
    brand: 'text-brand-600',
    warn: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-emerald-600',
    neutral: 'text-ink-500',
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-xl bg-[rgb(var(--surface-muted))] p-2.5', iconTones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
