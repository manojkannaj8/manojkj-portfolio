import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile } from '../../content/profile'
import { useReducedMotion } from '../../lib/motion'
import { scrollToY } from '../../lib/scroll'
import { ChapterHead } from '../chapter/ChapterHead'
import { Exhibit } from './Exhibit'
import { Research } from './Research'
import { Notes } from './Notes'
import { Finale } from './Finale'
import './Evolve.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Chapter 04 — Evolve. A release history: each achievement ships as a "release" with its own
 * treatment (exhibit / research dossiers / patch notes), tracked by a sticky version rail,
 * ending in the contact finale. Flows with the page — a change of pace after three pinned chapters.
 */
export function Evolve() {
  const reduced = useReducedMotion()
  const releases = profile.achievements
  const list = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)
  const railItems = [...releases.map((r) => ({ id: `release-${r.id}`, label: r.rail, tag: r.tag })), { id: 'contact', label: 'Contact', tag: 'Open a channel' }]

  // rail progress + active release
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: list.current,
        start: 'top 60%',
        end: 'bottom 60%',
        onUpdate: (self) => rail.current?.style.setProperty('--p', String(self.progress)),
      })
      railItems.forEach((item, i) => {
        const el = document.getElementById(item.id)
        if (!el) return
        ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) setActive(i) } })
      })
    })
    return () => ctx.revert()
  }, [releases.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 96)
  }

  let exhibitCount = 0

  return (
    <section id="evolve" className={`evolve${reduced ? ' is-reduced' : ''}`} aria-labelledby="evolve-title">
      <div className="evolve__head">
        <ChapterHead id="evolve" titleId="evolve-title" />
      </div>

      <div className="evolve__grid">
        <nav className="evolve__rail" aria-label="Releases">
          <ol ref={rail} className="vrail">
            {railItems.map((item, i) => (
              <li key={item.id}>
                <button className={`vrail__item${i === active ? ' is-active' : ''}${i < active ? ' is-past' : ''}`} onClick={() => goTo(item.id)} aria-current={i === active ? 'true' : undefined}>
                  <span className="vrail__node" aria-hidden="true" />
                  <span className="vrail__label">{item.label}</span>
                  <span className="vrail__tag">{item.tag}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={list} className="evolve__list">
          {releases.map((r) => {
            if (r.layout === 'exhibit') return <Exhibit key={r.id} r={r} reverse={exhibitCount++ % 2 === 1} />
            if (r.layout === 'research') return <Research key={r.id} r={r} />
            return <Notes key={r.id} r={r} />
          })}
          <Finale />
        </div>
      </div>
    </section>
  )
}
