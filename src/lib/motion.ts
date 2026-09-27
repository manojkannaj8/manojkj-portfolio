import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Dev only: append ?reduced-motion to the URL to exercise the reduced-motion code paths. */
const devOverride = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('reduced-motion')

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia(QUERY).matches || devOverride())

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
