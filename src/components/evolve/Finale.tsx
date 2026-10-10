import { useState, type CSSProperties } from 'react'
import { profile } from '../../content/profile'
import { useInView } from '../../lib/useInView'
import { HERO_ART } from '../../webgl/hero/HeroScene'
import { VoxelImage } from '../media/VoxelImage'

/**
 * Closing contact. The figure from the hero reassembles from voxels — the story ends
 * where it began — beside an open channel: email (copy or compose), GitHub, LinkedIn.
 */
export function Finale() {
  const [ref, inView] = useInView<HTMLElement>()
  const [copied, setCopied] = useState(false)
  const { email, links, location, contact, name } = profile

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${email}`
    }
  }

  return (
    <section ref={ref} id="contact" className={`finale${inView ? ' is-in' : ''}`} aria-labelledby="contact-title">
      <div className="finale__portrait">
        <VoxelImage src={HERO_ART.src} alt="" crop={[0.3, 0.0, 0.46, 0.7]} focus={[0.5, 0.35]} cell={14} className="finale__img" />
        <span className="finale__ring" aria-hidden="true" />
      </div>

      <div className="finale__copy">
        <p className="hud-label finale__kicker rv" style={{ '--i': 0 } as CSSProperties}><i className="release__dot" />{contact.kicker}</p>
        <h2 id="contact-title" className="finale__headline rv" style={{ '--i': 1 } as CSSProperties}>{contact.headline}</h2>

        <div className="finale__mail rv" style={{ '--i': 2 } as CSSProperties}>
          <a className="finale__email" href={`mailto:${email}`} data-cursor="Write">
            {email}
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M4 12l8-8M5 4h7v7" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </a>
          <button type="button" className="finale__copy-btn" onClick={copy} data-cursor="Copy" aria-label="Copy email address">
            {copied ? 'Copied' : 'Copy'}
          </button>
          {/* a button's own label change isn't announced reliably; a status region is */}
          <span className="sr-only" role="status">{copied ? 'Email address copied' : ''}</span>
        </div>

        <ul className="finale__links rv" style={{ '--i': 3 } as CSSProperties}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" data-cursor="Open">
                {l.label}
                <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </a>
            </li>
          ))}
        </ul>
        <p className="finale__meta hud-label rv" style={{ '--i': 4 } as CSSProperties}>{location}</p>
      </div>

      <footer className="finale__footer">
        <span>© {new Date().getFullYear()} {name}</span>
        <span className="hud-label">Version 2.0</span>
      </footer>
    </section>
  )
}
