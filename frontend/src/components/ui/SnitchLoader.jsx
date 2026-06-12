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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div ref={containerRef} className="h-64 w-64" />
        {message && (
          <p className="mt-2 text-center text-base font-semibold text-white drop-shadow-lg">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
