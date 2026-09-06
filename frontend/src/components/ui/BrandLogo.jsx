import { APP } from '@/utils/constants.js'

/**
 * The event brand mark — the SIH wordmark at `public/sih-logo.png`.
 *
 * It is a wide horizontal logo, so callers size it by HEIGHT (e.g. `h-10`) and
 * let the width follow. `object-contain` keeps it from distorting.
 */
export function BrandLogo({ className = '', alt = APP.name, ...rest }) {
  return (
    <img
      src={APP.logo}
      alt={alt}
      className={`w-auto max-w-full object-contain ${className}`}
      draggable={false}
      {...rest}
    />
  )
}
