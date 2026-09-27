import { useEffect, useRef, type CSSProperties } from 'react'
import type { Release } from '../../content/profile'
import { useInView } from '../../lib/useInView'
import { useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'
import { VoxelImage } from '../media/VoxelImage'
import { VoxelTitle } from '../chapter/VoxelTitle'
import { CountUp, Seal } from './bits'

type ExhibitRelease = Extract<Release, { layout: 'exhibit' }>

/**
 * A headline achievement: voxel-assembling media with an award seal, the project,
 * its pipeline as a live strip, and count-up stats. `reverse` flips the columns for rhythm.
 */
export function Exhibit({ r, reverse = false }: { r: ExhibitRelease; reverse?: boolean }) {
  const reduced = useReducedMotion()
  const [ref, inView] = useInView<HTMLElement>()
  const title = useRef<HTMLSpanElement>(null)
  const [hero, ...rest] = r.media
  const pipeline = r.project?.pipeline ?? []

  useEffect(() => {
    if (inView && title.current) return scramble(title.current, r.title, { duration: 0.8, reduced })
  }, [inView, r.title, reduced])

  return (
    <article
      ref={ref}
      id={`release-${r.id}`}
      className={`release exhibit is-${r.weight}${reverse ? ' is-reverse' : ''}${inView ? ' is-in' : ''}`}
      aria-labelledby={`rel-${r.id}`}
    >
      <div className="exhibit__media">
        <figure className="exhibit__hero">
          {hero ? (
            <VoxelImage src={hero.src} alt={hero.alt} cell={18} className="exhibit__img" />
          ) : (
            // no image yet: a generated visual, never a "coming soon" placeholder
            <div className="exhibit__generated" aria-hidden="true">
              <div className="exhibit__glyph"><VoxelTitle text="</>" maxSize={170} /></div>
              {r.project && <span className="exhibit__gen-name hud-label">{r.project.name}</span>}
            </div>
          )}
          <Seal id={r.id} text={`${r.title} · ${r.event.split(' · ')[0]} · `} />
          {hero?.caption && <figcaption className="exhibit__caption hud-label">{hero.caption}</figcaption>}
        </figure>
        {rest.length > 0 && (
          <div className="exhibit__thumbs">
            {rest.map((m) => (
              <figure key={m.src} className="exhibit__thumb">
                <VoxelImage src={m.src} alt={m.alt} cell={11} className="exhibit__thumb-img" />
                {m.caption && <figcaption className="hud-label">{m.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>

      <div className="exhibit__text">
        <p className="release__tag hud-label rv" style={{ '--i': 0 } as CSSProperties}>
          <i className="release__dot" />
          {r.tag}
          {r.date && <span className="release__date">{r.date}</span>}
        </p>
        <h3 id={`rel-${r.id}`} className="release__title rv" style={{ '--i': 1 } as CSSProperties}>
          <span className="sr-only">{r.title}</span>
          <span ref={title} aria-hidden="true">{r.title}</span>
        </h3>
        <p className="release__event rv" style={{ '--i': 2 } as CSSProperties}>{r.event}</p>
        {r.eventNote && <p className="release__note rv" style={{ '--i': 3 } as CSSProperties}>{r.eventNote}</p>}

        {r.project && (
          <div className="exhibit__project rv" style={{ '--i': 4 } as CSSProperties}>
            <p className="hud-label exhibit__plabel">Project</p>
            <p className="exhibit__pname">{r.project.name}</p>
            <p className="exhibit__pdesc">{r.project.description}</p>
          </div>
        )}

        {pipeline.length > 0 && (
          <ol className="pipe rv" style={{ '--i': 5 } as CSSProperties} aria-label={`${r.project?.name} pipeline`}>
            {pipeline.map((s, i) => (
              <li key={s.tech} className="pipe__node" style={{ '--n': i } as CSSProperties}>
                <span className="pipe__tech">{s.tech}</span>
                <span className="pipe__role">{s.role}</span>
              </li>
            ))}
            <span className="pipe__pulse" aria-hidden="true" />
          </ol>
        )}

        {r.stats.length > 0 && (
          <dl className="stats rv" style={{ '--i': 6 } as CSSProperties}>
            {r.stats.map((s) => (
              <div key={s.label} className="stats__item">
                <dt className="hud-label">{s.label}</dt>
                <dd><CountUp value={s.value} active={inView} /></dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </article>
  )
}
