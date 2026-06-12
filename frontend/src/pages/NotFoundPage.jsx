import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button.jsx'
import { usePageSeo } from '@/hooks/usePageSeo.js'

export function NotFoundPage() {
  usePageSeo({ title: 'Not found', description: 'Page not found.' })
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[rgb(var(--page-bg))] px-4">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/10 blur-[100px]" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative text-center">
        <p className="font-display text-8xl font-extrabold text-gradient sm:text-9xl">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">The route you requested doesn't exist. Check the URL or return to the homepage.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/"><Button className="gap-2"><Home className="h-4 w-4" />Back home</Button></Link>
          <Button variant="secondary" className="gap-2" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" />Go back</Button>
        </div>
      </motion.div>
    </div>
  )
}
