import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn.js'

/**
 * Lightweight canvas-based particle mesh background.
 * Renders interconnected dots with subtle movement for hero sections.
 * Performance-optimized: uses requestAnimationFrame, respects reduced-motion,
 * and pauses when not visible (IntersectionObserver).
 */
export function ParticleBackground({
  className,
  particleCount = 60,
  color = '59, 130, 246',
  lineColor = '59, 130, 246',
  maxDistance = 120,
  speed = 0.3,
  opacity = 0.5,
  lineOpacity = 0.08,
}) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const particlesRef = useRef([])
  const visibleRef = useRef(true)

  const initParticles = useCallback(
    (w, h) => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: Math.random() * 2 + 1,
      }))
    },
    [particleCount, speed],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)
      initParticles(rect.width, rect.height)
    }

    resize()

    // Visibility observer — pause animation when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting
      },
      { threshold: 0.1 },
    )
    observer.observe(canvas)

    function draw() {
      if (!visibleRef.current) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.clearRect(0, 0, w, h)

      const particles = particlesRef.current

      // Update positions
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }

      // Draw connections
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDistance) {
            const a = (1 - dist / maxDistance) * lineOpacity
            ctx.strokeStyle = `rgba(${lineColor}, ${a})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.fillStyle = `rgba(${color}, ${opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    const resizeHandler = () => resize()
    window.addEventListener('resize', resizeHandler)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resizeHandler)
      observer.disconnect()
    }
  }, [particleCount, color, lineColor, maxDistance, speed, opacity, lineOpacity, initParticles])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0', className)}
      aria-hidden="true"
    />
  )
}
