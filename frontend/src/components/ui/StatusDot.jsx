import { cn } from '@/utils/cn.js'

const statusConfig = {
  live: {
    color: 'bg-emerald-500',
    ping: true,
    label: 'Live',
  },
  active: {
    color: 'bg-brand-500',
    ping: false,
    label: 'Active',
  },
  idle: {
    color: 'bg-ink-400',
    ping: false,
    label: 'Idle',
  },
  warning: {
    color: 'bg-amber-500',
    ping: true,
    label: 'Warning',
  },
  error: {
    color: 'bg-red-500',
    ping: true,
    label: 'Error',
  },
  offline: {
    color: 'bg-ink-300',
    ping: false,
    label: 'Offline',
  },
}

export function StatusDot({
  status = 'idle',
  showLabel,
  size = 'md',
  className,
}) {
  const config = statusConfig[status] || statusConfig.idle
  const dotSize = size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex">
        {config.ping ? (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.color,
            )}
          />
        ) : null}
        <span className={cn('relative inline-flex rounded-full', dotSize, config.color)} />
      </span>
      {showLabel ? (
        <span className="text-xs font-medium text-ink-600">{config.label}</span>
      ) : null}
    </span>
  )
}
