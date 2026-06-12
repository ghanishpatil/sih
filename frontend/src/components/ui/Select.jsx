import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn.js'

export const Select = forwardRef(function Select(
  { className, label, id, error, hint, icon: Icon, options = [], placeholder, ...props },
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
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 pr-10 text-sm text-ink-900 shadow-sm transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            error && 'border-red-500 focus:ring-red-500/20',
            Icon && 'pl-10',
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ),
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-ink-400" />
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-ink-500">{hint}</p> : null}
    </div>
  )
})
