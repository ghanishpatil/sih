import { useEffect, useRef } from 'react'

export function SnitchLoader({ message = 'Loading...' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    let animation = null

    // Dynamically import lottie-web only when needed
    import('lottie-web').then((lottie) => {
      if (containerRef.current) {
        animation = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/snitch.json'
        })
      }
    }).catch(() => {
      // Fallback if lottie-web is not available - show simple spinner
      console.warn('Lottie not available, using fallback')
    })

    return () => {
      if (animation) {
        animation.destroy()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        <div ref={containerRef} className="h-48 w-48" />
        {message && (
          <p className="mt-4 text-center text-sm font-medium text-ink-700">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
