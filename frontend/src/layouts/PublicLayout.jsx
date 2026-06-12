import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar.jsx'
import { Footer } from '@/components/layout/Footer.jsx'

export function PublicLayout() {
  const { pathname } = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-[rgb(var(--page-bg))]">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-[4.5rem]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
