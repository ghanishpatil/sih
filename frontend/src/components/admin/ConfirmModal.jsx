import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/Button.jsx'

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  busy = false,
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onCancel}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: '-48%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, y: '-48%' }}
            transition={{ duration: 0.2 }}
          >
            <h2 id="confirm-modal-title" className="font-display text-lg font-semibold text-ink-900">
              {title}
            </h2>
            {children ? <div className="mt-3 text-sm text-ink-600">{children}</div> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" disabled={busy} onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" type="button" disabled={busy} onClick={onConfirm}>
                {busy ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
