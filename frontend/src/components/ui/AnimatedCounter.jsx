import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/utils/cn.js'

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 2,
  className,
  once = true,
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-50px' })
  const [hasAnimated, setHasAnimated] = useState(false)

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value
  const isValid = !isNaN(numericValue) && isFinite(numericValue)

  const spring = useSpring(0, {
    mass: 1,
    stiffness: 60,
    damping: 20,
    duration: duration * 1000,
  })

  const display = useTransform(spring, (latest) => {
    if (!isValid) return String(value)
    return Math.round(latest).toLocaleString()
  })

  useEffect(() => {
    if (isInView && isValid && !hasAnimated) {
      spring.set(numericValue)
      setHasAnimated(true)
    }
  }, [isInView, numericValue, spring, hasAnimated, isValid])

  if (!isValid) {
    return (
      <span ref={ref} className={cn('font-display tabular-nums', className)}>
        {prefix}{value}{suffix}
      </span>
    )
  }

  return (
    <span ref={ref} className={cn('font-display tabular-nums', className)}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}
