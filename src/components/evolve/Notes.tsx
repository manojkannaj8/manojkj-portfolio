import type { CSSProperties } from 'react'
import type { Release } from '../../content/profile'
import { useInView } from '../../lib/useInView'

type NotesRelease = Extract<Release, { layout: 'notes' }>

/** Smaller creative & extracurricular experiences as compact "patch notes" with live glyphs. */
export function Notes({ r }: { r: NotesRelease }) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <article ref={ref} id={`release-${r.id}`} className={`release notes is-${r.weight}${inView ? ' is-in' : ''}`} aria-labelledby={`rel-${r.id}`}>
      <header className="notes__head">
        <p className="release__tag hud-label rv" style={{ '--i': 0 } as CSSProperties}><i className="release__dot" />{r.tag}</p>
        <h3 id={`rel-${r.id}`} className="release__title release__title--sm rv" style={{ '--i': 1 } as CSSProperties}>{r.title}</h3>
      </header>
      <ul className="notes__grid">
        {r.items.map((item, i) => (
          <li key={item.title} className="note rv" style={{ '--i': 2 + i } as CSSProperties}>
            <Glyph kind={item.glyph} />
            <h4 className="note__title">{item.title}</h4>
            <p className="note__text">{item.text}</p>
            {item.tools.length > 0 && (
              <ul className="note__tools" aria-label="Tools">
                {item.tools.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}

function Glyph({ kind }: { kind: NotesRelease['items'][number]['glyph'] }) {
  return (
    <svg className={`note__glyph note__glyph--${kind}`} viewBox="0 0 48 36" aria-hidden="true">
      {kind === 'web' && (
        <g>
          <rect x="2" y="2" width="44" height="32" rx="4" />
          <path d="M2 10h44" />
          <circle cx="7" cy="6" r="1.2" /><circle cx="11" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" />
          <rect className="g-a" x="8" y="15" width="18" height="4" rx="1" />
          <rect className="g-b" x="8" y="22" width="30" height="3" rx="1" />
          <rect className="g-c" x="8" y="27" width="24" height="3" rx="1" />
        </g>
      )}
      {kind === 'poster' && (
        <g>
          <rect className="g-back" x="16" y="3" width="22" height="30" rx="2" />
          <rect x="8" y="6" width="22" height="28" rx="2" />
          <circle className="g-a" cx="19" cy="15" r="4.5" />
          <path className="g-b" d="M12 29l6-7 4 4 3-3 3 6z" />
        </g>
      )}
      {kind === 'music' && (
        <g>
          {[6, 12, 18, 24, 30, 36, 42].map((x, i) => (
            <rect key={x} className="g-eq" style={{ animationDelay: `${i * 0.12}s` }} x={x - 2} y="6" width="4" height="26" rx="1.5" />
          ))}
        </g>
      )}
    </svg>
  )
}
