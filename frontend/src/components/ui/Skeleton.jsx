import { cn } from '@/utils/cn.js'

export function Skeleton({ className, variant = 'default' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl',
        variant === 'default' &&
          'animate-shimmer bg-gradient-to-r from-ink-200 via-ink-100 to-ink-200 bg-[length:200%_100%]',
        variant === 'pulse' && 'animate-pulse bg-ink-200',
        variant === 'text' && 'h-4 animate-shimmer bg-gradient-to-r from-ink-200 via-ink-100 to-ink-200 bg-[length:200%_100%]',
        className,
      )}
    />
  )
}

export function SkeletonGroup({ count = 3, className, itemClassName }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-12 w-full', itemClassName)} />
      ))}
    </div>
  )
}
