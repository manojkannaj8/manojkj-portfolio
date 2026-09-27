import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { pointer } from '../../lib/pointer'
import { useReducedMotion } from '../../lib/motion'
import './Cursor.css'

type Probe = (x: number, y: number) => boolean
let figureProbe: Probe | null = null
/** The hero registers a hit-test so the cursor can become a reticle over the figure. */
export const setFigureProbe = (p: Probe | null) => { figureProbe = p }

/**
 * Two-part cursor: a precise dot plus a lagging HUD reticle.
 * States: idle ring → expanded ring over links (with optional data-cursor label) → targeting brackets over the figure.
 */
export function Cursor() {
  const reduced = useReducedMotion()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const enabled = !reduced && typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    const d = dot.current!, r = ring.current!, l = label.current!
    const dx = gsap.quickTo(d, 'x', { duration: 0.08, ease: 'power3' })
    const dy = gsap.quickTo(d, 'y', { duration: 0.08, ease: 'power3' })
    const rx = gsap.quickTo(r, 'x', { duration: 0.45, ease: 'power3' })
    const ry = gsap.quickTo(r, 'y', { duration: 0.45, ease: 'power3' })

    let mode = ''
    let hoverEl: Element | null = null
    const setMode = (m: string, text = '') => {
      if (m === mode && l.textContent === text) return
      mode = m
      r.dataset.mode = m
      l.textContent = text
    }

    const onOver = (e: PointerEvent) => {
      hoverEl = (e.target as Element).closest('a, button, [data-cursor]')
    }
    const onLeave = () => gsap.to([d, r], { opacity: 0, duration: 0.2 })
    const onEnter = () => gsap.to([d, r], { opacity: 1, duration: 0.2 })

    const tick = () => {
      dx(pointer.clientX); dy(pointer.clientY)
      rx(pointer.clientX); ry(pointer.clientY)
      if (hoverEl) setMode('link', hoverEl.getAttribute('data-cursor') ?? '')
      else if (figureProbe?.(pointer.clientX, pointer.clientY)) setMode('target', 'Decompile')
      else setMode('idle')
    }

    window.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointerenter', onEnter)
    gsap.ticker.add(tick)
    return () => {
      root.classList.remove('has-cursor')
      window.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointerenter', onEnter)
      gsap.ticker.remove(tick)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ring} className="cursor__ring" data-mode="idle">
        <i className="cursor__corner" /><i className="cursor__corner" />
        <i className="cursor__corner" /><i className="cursor__corner" />
        <span ref={label} className="cursor__label hud-label" />
      </div>
      <div ref={dot} className="cursor__dot" />
    </div>
  )
}
