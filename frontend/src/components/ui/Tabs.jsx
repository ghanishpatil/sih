import { useState, useRef, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn.js'

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  className,
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabsRef = useRef([])

  useLayoutEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeTab)
    const el = tabsRef.current[activeIndex]
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      })
    }
  }, [activeTab, tabs])

  const sizeClasses = {
    sm: 'text-xs px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-sm px-5 py-3',
  }

  if (variant === 'pill') {
    return (
      <div className={cn('flex gap-1 rounded-xl bg-[rgb(var(--surface-muted))] p-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative rounded-lg font-medium transition-all duration-200',
              sizeClasses[size],
              activeTab === tab.id
                ? 'bg-[rgb(var(--surface))] text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon ? <tab.icon className="h-4 w-4" /> : null}
              {tab.label}
              {tab.count != null ? (
                <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">
                  {tab.count}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-0 border-b border-[rgb(var(--border))]">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { tabsRef.current[i] = el }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative font-medium transition-colors duration-200',
              sizeClasses[size],
              activeTab === tab.id
                ? 'text-brand-600'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            <span className="flex items-center gap-2">
              {tab.icon ? <tab.icon className="h-4 w-4" /> : null}
              {tab.label}
              {tab.count != null ? (
                <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">
                  {tab.count}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      {/* Sliding underline indicator */}
      <motion.div
        className="absolute bottom-0 h-0.5 rounded-full bg-brand-500"
        animate={indicatorStyle}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      />
    </div>
  )
}
