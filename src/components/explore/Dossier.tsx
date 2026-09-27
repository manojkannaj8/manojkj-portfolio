import { useEffect, useRef, type CSSProperties } from 'react'
import { formatMonth, monthsInclusive } from '../../lib/dates'
import { useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'
import type { Mission } from './missions'

/** Mission dossier for the docked gate; before the first gate it shows the flight plan. */
export function Dossier({ missions, active, onGo }: { missions: Mission[]; active: number; onGo: (i: number) => void }) {
  const reduced = useReducedMotion()
  const role = useRef<HTMLSpanElement>(null)
  const m = active >= 0 ? missions[active] : null

  useEffect(() => {
    if (m && role.current) return scramble(role.current, m.role, { duration: 0.6, reduced })
  }, [m, reduced])

  if (!m) {
    const dated = missions.filter((x) => x.start !== null)
    const first = dated.length ? formatMonth(Math.min(...dated.map((x) => x.start!))) : null
    return (
      <article className="dossier dossier--plan" aria-live="polite">
        <p className="hud-label dossier__kicker">Flight plan</p>
        <p className="dossier__role">{missions.length} missions{first ? ` · ${first} → present` : ''}</p>
        <ol className="plan">
          {missions.map((x, i) => (
            <li key={x.org}>
              <button className="plan__item" style={{ '--c': x.color } as CSSProperties} onClick={() => onGo(i)} data-cursor="Fly">
                <span className="plan__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="plan__org">
                  {x.highlight?.logo && <img className="org-logo" src={x.highlight.logo} alt="" width={16} height={16} />}
                  {x.org}
                  {x.highlight?.badge && <span className="org-tag">{x.highlight.badge.label}</span>}
                  {x.currentLead && <span className="org-tag org-tag--live"><i />Current</span>}
                </span>
                <span className="plan__role">{x.role}</span>
              </button>
            </li>
          ))}
        </ol>
      </article>
    )
  }

  const months = m.start !== null && m.end !== null ? monthsInclusive(m.start, m.end) : null

  return (
    <article
      key={m.org}
      className={`dossier${m.featured ? ' is-featured' : ''}${m.currentLead ? ' is-current' : ''}`}
      style={{ '--c': m.color } as CSSProperties}
      aria-live="polite"
    >
      <header className="dossier__head">
        <p className="hud-label dossier__kicker">Mission {String(active + 1).padStart(2, '0')} / {String(missions.length).padStart(2, '0')}</p>
        {m.present && <span className="dossier__live hud-label"><i /> {m.currentLead ? 'Current · Leadership' : 'Active'}</span>}
      </header>
      <h3 className="dossier__role">
        <span className="sr-only">{m.role}</span>
        <span ref={role} aria-hidden="true">{m.role}</span>
      </h3>
      <p className="dossier__org">
        {m.highlight?.logo
          ? <img className="dossier__logo" src={m.highlight.logo} alt="" width={26} height={26} />
          : <i className="dossier__swatch" />}
        {m.org}
        {m.highlight?.badge && <span className="org-tag org-tag--lg">{m.highlight.badge.label}</span>}
      </p>
      {m.highlight?.badge?.note && <p className="dossier__note">{m.highlight.badge.note}</p>}
      {m.highlight?.milestone && (
        <p className="dossier__milestone"><i aria-hidden="true" /><span className="sr-only">Milestone: </span>{m.highlight.milestone}</p>
      )}
      <p className="dossier__period">
        {m.period}
        {months !== null && <span className="dossier__dur"> · {months} mo{m.present ? ' so far' : ''}</span>}
      </p>

      <p className="hud-label dossier__sub">Log</p>
      <ol className="dossier__log">
        {m.points.map((pt, i) => (
          <li key={i} style={{ '--d': `${0.12 + i * 0.07}s` } as CSSProperties}>
            <span className="dossier__n">{String(i + 1).padStart(2, '0')}</span>{pt}
          </li>
        ))}
      </ol>

      {m.stack.length > 0 && (
        <>
          <p className="hud-label dossier__sub">Loadout</p>
          <ul className="dossier__stack">
            {m.stack.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </>
      )}
    </article>
  )
}
