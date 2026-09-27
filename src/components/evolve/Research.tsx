import { useEffect, useRef, type CSSProperties } from 'react'
import type { Release } from '../../content/profile'
import { useInView } from '../../lib/useInView'
import { prefersReducedMotion } from '../../lib/motion'

type ResearchRelease = Extract<Release, { layout: 'research' }>
type Item = ResearchRelease['items'][number]

/** Research & patents as three dossiers — status is always stated honestly on each card. */
export function Research({ r }: { r: ResearchRelease }) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <article ref={ref} id={`release-${r.id}`} className={`release research is-${r.weight}${inView ? ' is-in' : ''}`} aria-labelledby={`rel-${r.id}`}>
      <header className="research__head">
        <p className="release__tag hud-label rv" style={{ '--i': 0 } as CSSProperties}><i className="release__dot" />{r.tag}</p>
        <h3 id={`rel-${r.id}`} className="release__title rv" style={{ '--i': 1 } as CSSProperties}>{r.title}</h3>
        {r.intro && <p className="release__note rv" style={{ '--i': 2 } as CSSProperties}>{r.intro}</p>}
      </header>
      <ul className="research__grid">
        {r.items.map((item, i) => (
          <li key={item.title} className={`doc doc--${item.state} rv`} style={{ '--i': 2 + i } as CSSProperties}>
            <DocCard item={item} />
          </li>
        ))}
      </ul>
    </article>
  )
}

function DocCard({ item }: { item: Item }) {
  return (
    <div className="doc__card">
      <div className="doc__bar">
        <span className="hud-label doc__label">{item.label}</span>
        <span className={`doc__status doc__status--${item.state}`}><i />{item.status}</span>
      </div>

      {item.state === 'published' && <span className="doc__stamp" aria-hidden="true">Published<br /><b>IEEE</b></span>}
      {item.state === 'progress' && <span className="doc__progress" aria-hidden="true"><i /></span>}

      <h4 className="doc__title">{item.title}</h4>
      <p className="doc__text">{item.text}</p>

      {item.state === 'classified' && <Redacted />}

      {item.tags.length > 0 && (
        <ul className="doc__tags" aria-label="Areas">
          {item.tags.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}
    </div>
  )
}

const REDACTED_ROWS = ['Core idea', 'Architecture', 'Implementation']
const GLYPHS = '█▓▒░<>/_#=+'

/** Spec rows that never decode — confidentiality, made visible. Nothing real is hidden in the DOM. */
function Redacted() {
  const rows = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = setInterval(() => {
      rows.current.forEach((el) => {
        if (!el || Math.random() > 0.35) return
        el.textContent = Array.from({ length: 14 }, () => (Math.random() > 0.72 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : '█')).join('')
      })
    }, 140)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="redacted">
      <span className="doc__stamp doc__stamp--classified" aria-hidden="true">Classified</span>
      <dl aria-label="Details withheld">
        {REDACTED_ROWS.map((row, i) => (
          <div key={row} className="redacted__row">
            <dt className="hud-label">{row}</dt>
            <dd aria-label="withheld"><span ref={(el) => { rows.current[i] = el }} aria-hidden="true">██████████████</span></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
