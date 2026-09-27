import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { pointer } from '../../lib/pointer'
import { isTouchDevice, useReducedMotion } from '../../lib/motion'

const BARS = 12

/** Live HUD telemetry: cursor coordinates and a signal meter driven by pointer speed. */
export function HeroReadout() {
  const reduced = useReducedMotion()
  const coords = useRef<HTMLSpanElement>(null)
  const meter = useRef<HTMLSpanElement>(null)
  const touch = isTouchDevice()

  useEffect(() => {
    if (reduced) return
    let frame = 0
    let level = 0
    const bars = Array.from(meter.current!.children) as HTMLElement[]
    const tick = () => {
      if (frame++ % 3) return
      const speed = Math.hypot(pointer.vx, pointer.vy)
      level += (Math.min(1, speed / 2.2) - level) * 0.35
      const x = touch ? pointer.tiltX * 0.5 + 0.5 : pointer.x
      const y = touch ? pointer.tiltY * 0.5 + 0.5 : pointer.y
      coords.current!.textContent = `X ${x.toFixed(3)}  Y ${y.toFixed(3)}`
      const lit = Math.round(level * BARS)
      bars.forEach((b, i) => b.classList.toggle('is-on', i < Math.max(1, lit)))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [reduced, touch])

  return (
    <div className="readout" data-reveal aria-hidden="true">
      <span className="hud-label readout__row">
        <i className="readout__dot" /> Sys online
      </span>
      <span ref={coords} className="hud-label readout__row readout__coords">X 0.500  Y 0.500</span>
      <span className="readout__row readout__meter-row">
        <span className="hud-label">Signal</span>
        <span ref={meter} className="readout__meter">
          {Array.from({ length: BARS }, (_, i) => <i key={i} />)}
        </span>
      </span>
    </div>
  )
}
