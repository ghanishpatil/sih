import { cn } from '@/utils/cn.js'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/20 hover:from-brand-500 hover:to-brand-400 hover:shadow-brand-500/30 focus-visible:ring-brand-500',
  secondary:
    'border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-ink-800 hover:bg-[rgb(var(--surface-muted))] hover:border-brand-500/30',
  ghost: 'text-ink-700 hover:bg-[rgb(var(--surface-muted))]',
  outline:
    'border border-brand-500/40 text-brand-600 hover:bg-brand-500/10 hover:border-brand-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20',
  icon: 'text-ink-600 hover:bg-[rgb(var(--surface-muted))] hover:text-ink-900',
}

const sizes = {
  xs: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
  sm: 'h-9 px-3 text-sm rounded-lg gap-2',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
  xl: 'h-14 px-8 text-base rounded-2xl gap-3',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-md': 'h-10 w-10 rounded-xl',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  loading,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{typeof children === 'string' ? children : 'Loading…'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
