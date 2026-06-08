import { useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn.js'

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  hideClose,
}) {
  const overlayRef = useRef(null)

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === overlayRef.current) onClose?.()
            }}
          />

          {/* Panel */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-lift',
              sizes[size],
              className,
            )}
          >
            {/* Header */}
            {title || !hideClose ? (
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  {title ? (
                    <h2 className="font-display text-lg font-semibold text-ink-900">
                      {title}
                    </h2>
                  ) : null}
                  {description ? (
                    <p className="mt-1 text-sm text-ink-500">{description}</p>
                  ) : null}
                </div>
                {!hideClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-[rgb(var(--surface-muted))] hover:text-ink-700"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Body */}
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
