import { useEffect } from 'react'
import { APP } from '@/utils/constants.js'

export function usePageSeo({ title, description }) {
  useEffect(() => {
    const full = title ? `${title} · ${APP.name}` : APP.name
    document.title = full
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description])
}
