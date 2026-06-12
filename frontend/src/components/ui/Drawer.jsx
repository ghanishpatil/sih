import { useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn.js'

const drawerVariants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    x: '100%',
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 flex h-full w-full flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-lift',
              sizes[size],
              className,
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-6 py-4">
              <div className="min-w-0">
                {title ? (
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 truncate text-sm text-ink-500">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-[rgb(var(--surface-muted))] hover:text-ink-700"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
