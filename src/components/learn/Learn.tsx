import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile } from '../../content/profile'
import { buildSkillGraph } from '../../lib/skillGraph'
import { useReducedMotion } from '../../lib/motion'
import { ChapterHead } from '../chapter/ChapterHead'
import { OrbitSystem } from './OrbitSystem'
import { ringsFrom } from './rings'
import { SkillDetail } from './SkillDetail'
import './Learn.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Chapter 01 — Learn. Education is the core (a CGPA "planet"); skills orbit it on four
 * tilted rings, one per category. The stage pins while the system builds with scroll,
 * then stays interactive: tilt, drag-to-spin, hover/tap to trace where a skill was applied.
 */
export function Learn() {
  const reduced = useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const graph = useMemo(() => buildSkillGraph(), [])
  const rings = useMemo(() => ringsFrom(graph), [graph])
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [hoverCat, setHoverCat] = useState<string | null>(null)
  const [lockCat, setLockCat] = useState<string | null>(null)
  const focusCat = hoverCat ?? lockCat
  const build = useRef(reduced ? 1 : 0)
  const eduRef = useRef<HTMLDivElement>(null)
  const active = hovered ?? pinned
  const edu = profile.education[0]

  useEffect(() => {
    if (reduced) { build.current = 1; return }
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top 65%',
        end: 'top -45%',
        onUpdate: (self) => { build.current = self.progress },
      })
      gsap.from('.learn [data-rise]', {
        autoAlpha: 0,
        y: 24,
        duration: 1.1,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 35%', once: true },
      })
    }, section)
    return () => ctx.revert()
  }, [reduced])

  // Escape clears a pinned skill
  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinned(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  return (
    <section ref={section} id="learn" className="learn" aria-labelledby="learn-title">
      <div className="learn__stage">
        <div className="learn__bg" aria-hidden="true" />

        <OrbitSystem
          graph={graph}
          rings={rings}
          active={active}
          focusCat={focusCat}
          onHover={setHovered}
          onPick={(n) => setPinned((p) => (p === n ? null : n))}
          build={build}
          callout={eduRef}
        />

        <div className="learn__left">
          <ChapterHead id="learn" titleId="learn-title" />
        </div>

        <div ref={eduRef} className="learn__edu edu" data-rise>
          <p className="hud-label edu__label"><i className="edu__led" /> Core · Education</p>
          <h3 className="edu__school">{edu.school}</h3>
          <p className="edu__degree">{edu.degree}</p>
          <p className="hud-label edu__period">{edu.period}</p>
        </div>

        <div className="learn__legend legend" data-rise role="group" aria-label="Filter skill orbits">
          <p className="hud-label legend__label">Orbits</p>
          <ul>
            {[...rings].reverse().map((r) => (
              <li key={r.name}>
                <button
                  className={`legend__item${focusCat === r.name ? ' is-on' : ''}`}
                  style={{ '--c': r.color } as CSSProperties}
                  aria-pressed={lockCat === r.name}
                  onClick={() => setLockCat((c) => (c === r.name ? null : r.name))}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoverCat(r.name) }}
                  onPointerLeave={() => setHoverCat(null)}
                >
                  <svg viewBox="0 0 22 10" width="22" height="10" aria-hidden="true"><ellipse cx="11" cy="5" rx="10" ry="4" /></svg>
                  <span className="legend__name">{r.name}</span>
                  <span className="legend__count">{String(r.skills.length).padStart(2, '0')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="learn__detail" data-rise>
          <SkillDetail
            skill={active ? graph.byName[active] : null}
            graph={graph}
            pinned={!!pinned && active === pinned}
            onClear={() => setPinned(null)}
          />
        </div>
      </div>
    </section>
  )
}
