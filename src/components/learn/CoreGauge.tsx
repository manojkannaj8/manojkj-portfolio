import { useImperativeHandle, useRef, type Ref } from 'react'

export type CoreGaugeHandle = { set: (progress: number) => void }

const R = 80
const CIRC = 2 * Math.PI * R
const TICKS = 48

/**
 * The education "planet": a CGPA gauge whose arc fills with scroll.
 * Rendered at the centre of the orbit system; skills orbit around it.
 */
export function CoreGauge({ value, outOf, label, ref }: { value: number; outOf: number; label: string; ref: Ref<CoreGaugeHandle> }) {
  const arc = useRef<SVGCircleElement>(null)
  const cap = useRef<SVGGElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const last = useRef(-1)
  const ratio = value / outOf

  useImperativeHandle(ref, () => ({
    set(p: number) {
      const k = Math.round(p * 1000) / 1000
      if (k === last.current) return
      last.current = k
      const fill = ratio * k
      arc.current!.style.strokeDashoffset = String(CIRC * (1 - fill))
      cap.current!.style.transform = `rotate(${fill * 360}deg)`
      cap.current!.style.opacity = String(Math.min(1, k * 4))
      num.current!.textContent = (value * k).toFixed(2)
    },
  }))

  return (
    <div className="core" role="img" aria-label={`${label} ${value} out of ${outOf}`}>
      <div className="core__sphere" />
      <svg className="core__svg" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="core-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a7dff" />
            <stop offset="1" stopColor="#bcd3ff" />
          </linearGradient>
        </defs>
        <g className="core__ticks">
          {Array.from({ length: TICKS }, (_, i) => {
            const a = (i / TICKS) * Math.PI * 2
            const r1 = i % 4 === 0 ? 89 : 91
            return <line key={i} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95} />
          })}
        </g>
        <circle className="core__track" cx="100" cy="100" r={R} />
        <circle
          ref={arc}
          className="core__arc"
          cx="100"
          cy="100"
          r={R}
          stroke="url(#core-arc)"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: CIRC }}
          transform="rotate(-90 100 100)"
        />
        <g ref={cap} className="core__cap" style={{ transformOrigin: '100px 100px', opacity: 0 }}>
          <circle cx="100" cy={100 - R} r="3.2" />
        </g>
        <circle className="core__inner" cx="100" cy="100" r="66" />
      </svg>
      <div className="core__readout" aria-hidden="true">
        <span ref={num} className="core__value">0.00</span>
        <span className="core__unit hud-label">{label} / {outOf}</span>
      </div>
    </div>
  )
}
