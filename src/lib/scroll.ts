import type Lenis from 'lenis'
import { prefersReducedMotion } from './motion'

/** The app's Lenis instance, registered by App so components can scroll programmatically. */
let lenis: Lenis | null = null
export const setLenis = (l: Lenis | null) => { lenis = l }

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 })
  else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}
