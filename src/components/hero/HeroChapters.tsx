import { useEffect, useRef, useState } from 'react'
import { profile } from '../../content/profile'
import { useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'

/**
 * The artwork's LEARN / BUILD / EXPLORE / EVOLVE, re-set as live type.
 * A scanner sweeps through them; hovering a word decodes it and reveals the chapter it opens.
 */
export function HeroChapters() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const labels = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (reduced || hover !== null) return
    const t = setInterval(() => setActive((n) => (n + 1) % profile.chapters.length), 1600)
    return () => clearInterval(t)
  }, [reduced, hover])

  const current = hover ?? active

  useEffect(() => {
    const el = labels.current[current]
    if (el) return scramble(el, profile.chapters[current].label, { duration: 0.5, reduced })
  }, [current, reduced])

  return (
    <nav className="chapters" data-reveal aria-label="Chapters">
      <span className="chapters__cross" aria-hidden="true" />
      <ol>
        {profile.chapters.map((c, i) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              className={`chapters__link${i === current ? ' is-active' : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              data-cursor={c.blurb}
            >
              <span className="chapters__blurb" aria-hidden="true">{c.blurb}</span>
              <span className="sr-only">{`${c.label} — ${c.blurb}`}</span>
              <span ref={(el) => { labels.current[i] = el }} className="chapters__label hud-label" aria-hidden="true">
                {c.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
      <span className="chapters__dash" aria-hidden="true" />
    </nav>
  )
}
