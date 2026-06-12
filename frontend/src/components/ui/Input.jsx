import { forwardRef } from 'react'
import { cn } from '@/utils/cn.js'

export const Input = forwardRef(function Input(
  { className, label, id, error, hint, icon: Icon, iconRight: IconRight, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink-700"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-4 w-4 text-ink-400" />
          </div>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm text-ink-900 shadow-sm transition-all duration-200 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:shadow-glow-brand',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            Icon && 'pl-10',
            IconRight && 'pr-10',
            className,
          )}
          {...props}
        />
        {IconRight ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <IconRight className="h-4 w-4 text-ink-400" />
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-ink-500">{hint}</p> : null}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { className, label, id, error, hint, rows = 4, ...props },
  ref,
) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink-700"
        >
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cn(
          'w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-sm text-ink-900 shadow-sm transition-all duration-200 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:shadow-glow-brand',
          error && 'border-red-500 focus:ring-red-500/20',
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-ink-500">{hint}</p> : null}
    </div>
  )
})
