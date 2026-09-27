import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

const inr = new Intl.NumberFormat('en-IN') // built once: toLocaleString() rebuilds a formatter every frame

/** Counts the first number in a value up from zero once `active` ("₹8,000", "36 hours", "Top 6"). Non-numeric values render as-is. */
export function CountUp({ value, active }: { value: string; active: boolean }) {
  const el = useRef<HTMLSpanElement>(null)
  const m = value.match(/^(\D*?)(\d[\d,]*)(.*)$/)

  useEffect(() => {
    if (!m || !active || !el.current) return
    const [, pre, num, post] = m
    const end = Number(num.replace(/,/g, ''))
    const withCommas = num.includes(',')
    if (prefersReducedMotion()) { el.current.textContent = value; return }
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400)
      const v = Math.round(end * (1 - Math.pow(1 - k, 3)))
      el.current!.textContent = `${pre}${withCommas ? inr.format(v) : v}${post}`
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={el} aria-hidden="true">{m && !active ? `${m[1]}0${m[3]}` : value}</span>
    </>
  )
}

/** Slowly rotating circular award seal — text runs around a ring, a star at the centre. */
export function Seal({ text, id }: { text: string; id: string }) {
  return (
    <svg className="seal" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={`seal-${id}`} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="57" className="seal__disc" />
      <circle cx="60" cy="60" r="34" className="seal__ring" />
      <g className="seal__spin">
        <text className="seal__text">
          <textPath href={`#seal-${id}`} textLength="276">{text.toUpperCase()}</textPath>
        </text>
      </g>
      <path className="seal__star" d="M60 44l4.3 11.7L76 60l-11.7 4.3L60 76l-4.3-11.7L44 60l11.7-4.3z" />
    </svg>
  )
}
