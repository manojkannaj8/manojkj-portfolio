import { useEffect, useMemo, useRef, useState } from 'react'
import { profile } from '../../content/profile'
import { useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'
import { isOffscreen } from '../../lib/offscreen'

const CYCLE_MS = 4800

/** Glass "system status" card: cycles through current roles + education, all derived from content. */
export function HeroStatus() {
  const reduced = useReducedMotion()
  const items = useMemo(
    () => [
      ...profile.experience.map((e) => ({ title: e.role, sub: e.org, meta: e.period })),
      ...profile.education.map((ed) => ({
        title: `${ed.score.label} ${ed.score.value} / ${ed.score.outOf}`,
        sub: ed.degree.replace('B.Tech in ', 'B.Tech · '),
        meta: ed.period,
      })),
    ],
    [],
  )
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const title = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLElement>(null)
  const item = items[i]

  useEffect(() => scramble(title.current!, item.title, { duration: 0.7, reduced }), [item, reduced])

  useEffect(() => {
    if (reduced || paused) return
    // don't cycle (re-render + decode) while the hero is scrolled away; retry until it's back
    let t = 0
    const advance = () => {
      if (isOffscreen(root.current)) { t = window.setTimeout(advance, 1000); return }
      setI((n) => (n + 1) % items.length)
    }
    t = window.setTimeout(advance, CYCLE_MS)
    return () => clearTimeout(t)
  }, [i, paused, reduced, items.length])

  return (
    <aside
      ref={root}
      className="status"
      data-reveal
      aria-label="Current status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="status__head">
        <VoxelGlyph />
        <span className="hud-label status__count">
          {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button
          className="status__next"
          onClick={() => setI((n) => (n + 1) % items.length)}
          aria-label="Show next status"
          data-cursor="Next"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>

      <div className="status__body">
        <span className="sr-only">{`${item.title}, ${item.sub}, ${item.meta}`}</span>
        <span ref={title} className="status__title" aria-hidden="true" />
        <span className="status__sub" aria-hidden="true">{item.sub}</span>
        <span className="status__meta hud-label" aria-hidden="true"><i className="status__led" />{item.meta}</span>
      </div>

      {!reduced && (
        <span className="status__progress" aria-hidden="true">
          <span key={`${i}-${paused}`} className={`status__bar${paused ? ' is-paused' : ''}`} style={{ animationDuration: `${CYCLE_MS}ms` }} />
        </span>
      )}
    </aside>
  )
}

/** Small isometric voxel that slowly assembles/disassembles — echoes the hero's voxel effect. */
function VoxelGlyph() {
  return (
    <svg className="voxel-glyph" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path className="vg vg1" d="M16 4l10 5-10 5-10-5z" />
        <path className="vg vg2" d="M6 9v11l10 5V14z" />
        <path className="vg vg3" d="M26 9v11l-10 5V14z" />
      </g>
    </svg>
  )
}
