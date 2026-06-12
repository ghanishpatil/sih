import { motion } from 'framer-motion'
import { cn } from '@/utils/cn.js'
import { Inbox, SearchX, AlertTriangle, Clock, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/Button.jsx'

const presets = {
  'no-data': {
    icon: Inbox,
    title: 'No data yet',
    description: 'Content will appear here once data is available.',
  },
  'no-results': {
    icon: SearchX,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  error: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'An error occurred while loading this content. Please try again.',
  },
  'coming-soon': {
    icon: Clock,
    title: 'Coming soon',
    description: 'This feature is under development and will be available shortly.',
  },
  'not-found': {
    icon: FileQuestion,
    title: 'Not found',
    description: 'The requested resource could not be found.',
  },
}

export function EmptyState({
  preset,
  icon: CustomIcon,
  title,
  description,
  action,
  actionLabel,
  className,
}) {
  const config = preset ? presets[preset] : {}
  const Icon = CustomIcon || config.icon || Inbox
  const displayTitle = title || config.title
  const displayDesc = description || config.description

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 rounded-2xl bg-[rgb(var(--surface-muted))] p-4">
        <Icon className="h-8 w-8 text-ink-400" />
      </div>
      {displayTitle ? (
        <h3 className="font-display text-lg font-semibold text-ink-900">
          {displayTitle}
        </h3>
      ) : null}
      {displayDesc ? (
        <p className="mt-2 max-w-sm text-sm text-ink-500">{displayDesc}</p>
      ) : null}
      {action && actionLabel ? (
        <Button
          onClick={action}
          variant="secondary"
          size="sm"
          className="mt-5"
        >
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  )
}
