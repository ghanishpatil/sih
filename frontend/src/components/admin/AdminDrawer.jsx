import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function AdminDrawer({ open, title, onClose, children, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-drawer-title"
            className="fixed right-0 top-0 z-50 flex h-dvh max-h-dvh w-full max-w-lg flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl"
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[rgb(var(--border))] px-4 py-3">
              <h2 id="admin-drawer-title" className="min-w-0 font-display text-lg font-semibold text-ink-900">
                {title}
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-ink-500 hover:bg-[rgb(var(--surface-muted))] hover:text-ink-800"
                onClick={onClose}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4" data-lenis-prevent>
              {children}
            </div>
            {footer ? (
              <footer className="shrink-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 px-4 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom,0px)+1.5rem)]">
                {footer}
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
