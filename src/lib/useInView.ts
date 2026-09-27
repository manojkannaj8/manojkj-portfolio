import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './motion'

/** One-shot "has entered the viewport" flag. Reduced motion starts true (no entrance animations). */
export function useInView<T extends Element>(rootMargin = '0px 0px -18% 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (inView || !ref.current) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect() }
    }, { rootMargin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [inView, rootMargin])

  return [ref, inView] as const
}
