import { cn } from '@/utils/cn.js'

const tones = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-500/15 text-brand-700',
  success: 'bg-emerald-500/15 text-emerald-800',
  warn: 'bg-amber-500/15 text-amber-900',
  danger: 'bg-red-500/15 text-red-800',
  info: 'bg-cyan-500/15 text-cyan-800',
  purple: 'bg-purple-500/15 text-purple-800',
  gradient:
    'bg-gradient-to-r from-brand-500/15 to-cyan-500/15 text-brand-700',
}

export function Badge({
  className,
  children,
  tone = 'neutral',
  uppercase = true,
  dot,
  pulse,
  pill,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        pill ? 'rounded-full px-3 py-1' : 'rounded-full px-2.5 py-0.5',
        uppercase ? 'uppercase tracking-wide' : 'tracking-normal',
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className="relative flex h-2 w-2">
          {pulse ? (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                tone === 'success' && 'bg-emerald-500',
                tone === 'warn' && 'bg-amber-500',
                tone === 'danger' && 'bg-red-500',
                tone === 'brand' && 'bg-brand-500',
                tone === 'info' && 'bg-cyan-500',
                (!tone || tone === 'neutral') && 'bg-ink-400',
              )}
            />
          ) : null}
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              tone === 'success' && 'bg-emerald-500',
              tone === 'warn' && 'bg-amber-500',
              tone === 'danger' && 'bg-red-500',
              tone === 'brand' && 'bg-brand-500',
              tone === 'info' && 'bg-cyan-500',
              tone === 'purple' && 'bg-purple-500',
              (!tone || tone === 'neutral') && 'bg-ink-400',
            )}
          />
        </span>
      ) : null}
      {children}
    </span>
  )
}
