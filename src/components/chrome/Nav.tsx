import { profile } from '../../content/profile'
import './Nav.css'

export function Nav() {
  return (
    <header className="nav" data-reveal="nav">
      <a href="#top" className="nav__mark" aria-label={`${profile.name} — back to top`}>
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
          <path d="M2 11V2h9M29 2h9v9M38 29v9h-9M11 38H2v-9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text x="20" y="24.5" textAnchor="middle" fontFamily="Michroma, sans-serif" fontSize="11" fill="currentColor" letterSpacing="0.5">MK</text>
        </svg>
      </a>

      <nav aria-label="Primary" className="nav__links">
        {profile.chapters.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className="nav__link" title={c.blurb}>
            <span className="nav__index" aria-hidden="true">0{i + 1}</span>
            {c.label}
          </a>
        ))}
      </nav>

      <a className="nav__cta" href={`mailto:${profile.email}`} data-cursor="Email">
        <span className="nav__cta-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 4l8 8M12 5v7H5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </span>
        <span className="nav__cta-text">Open a channel</span>
      </a>
    </header>
  )
}
