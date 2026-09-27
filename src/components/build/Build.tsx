import { useEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile } from '../../content/profile'
import { useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'
import { scrollToY } from '../../lib/scroll'
import { ChapterHead } from '../chapter/ChapterHead'
import { Schematic, type SchematicHandle } from './Schematic'
import './Build.css'

gsap.registerPlugin(ScrollTrigger)

/** viewport-heights of scroll given to each project */
const SEGMENT_VH = 115
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Chapter 02 — Build. One pinned workbench; scrolling moves through the projects.
 * Each project assembles from voxels as a running system schematic, holds for inspection,
 * then decompiles before the next one assembles. Scrubbed, so scrolling back reverses it.
 */
export function Build() {
  const reduced = useReducedMotion()
  const projects = profile.projects
  const N = projects.length
  const section = useRef<HTMLElement>(null)
  const info = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLOListElement>(null)
  const nameEl = useRef<HTMLSpanElement>(null)
  const schematic = useRef<SchematicHandle>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const target = useRef(0)
  const [index, setIndex] = useState(0)
  const [inspect, setInspect] = useState<string | null>(null)
  const [lit, setLit] = useState<string[]>([])
  const project = projects[index]
  const node = inspect ? project.system?.nodes.find((n) => n.id === inspect) ?? null : null

  // scroll → virtual time u ∈ [0, N]; project i owns u ∈ [i, i + 1)
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: 'top 30%',
      end: 'bottom bottom',
      onUpdate: (self) => {
        target.current = self.progress * N
        if (reduced) setIndex(Math.min(N - 1, Math.floor(target.current)))
      },
    })
    trigger.current = st
    return () => { st.kill(); trigger.current = null }
  }, [N, reduced])

  // render loop (paused off-screen); reduced motion renders static frames instead
  useEffect(() => {
    if (reduced) return
    let u = target.current
    let current = -1
    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 1 / 20)
      u += (target.current - u) * (1 - Math.exp(-dt * 6))
      const idx = Math.min(N - 1, Math.max(0, Math.floor(u)))
      if (idx !== current) {
        current = idx
        setIndex(idx)
        setInspect(null)
        setLit([])
      }
      const t = u - idx
      schematic.current?.update(t, dt)
      const o = clamp01(t / 0.12) * (1 - clamp01((t - 0.84) / 0.1))
      if (info.current) {
        info.current.style.opacity = String(o)
        info.current.style.transform = `translate3d(0, ${(1 - o) * (t < 0.5 ? 18 : -18)}px, 0)`
      }
      rail.current?.style.setProperty('--u', String(u))
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    })
    io.observe(section.current!)
    return () => { io.disconnect(); gsap.ticker.remove(tick) }
  }, [N, reduced])

  // reduced motion: schematic fully assembled, no packets — redraw on project change
  useEffect(() => {
    if (!reduced) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => schematic.current?.update(0.5, 0)))
    return () => cancelAnimationFrame(id)
  }, [reduced, index])

  useEffect(() => {
    if (nameEl.current) return scramble(nameEl.current, project.name, { duration: 0.7, reduced })
  }, [project.name, reduced])

  const goTo = (i: number) => {
    const st = trigger.current
    if (!st) return
    scrollToY(st.start + ((i + 0.5) / N) * (st.end - st.start))
  }

  return (
    <section
      ref={section}
      id="build"
      className="build"
      aria-labelledby="build-title"
      style={{ height: `calc(100svh + ${N * SEGMENT_VH}svh)` }}
    >
      <div className="build__stage">
        <div className="build__bg" aria-hidden="true" />

        <div className="build__schematic">
          {project.system && (
            <Schematic
              key={project.name}
              ref={schematic}
              system={project.system}
              inspect={inspect}
              lit={lit}
              onInspect={setInspect}
              reduced={reduced}
            />
          )}
        </div>

        <div className="build__left">
          <ChapterHead id="build" titleId="build-title" />
          <p className="sr-only">{`${N} projects. Use the project buttons to move between them.`}</p>

          <div ref={info} className="proj" style={reduced ? undefined : { opacity: 0 }}>
            <p className="proj__meta hud-label">
              <span className="proj__index">Project {String(index + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</span>
              {project.period && <span>{project.period}</span>}
            </p>
            <h3 className="proj__name">
              <span className="sr-only">{project.name}</span>
              <span ref={nameEl} aria-hidden="true">{project.name}</span>
            </h3>
            {(project.repo || project.live) && (
              <p className="proj__links">
                {project.repo && <a href={project.repo} target="_blank" rel="noreferrer" data-cursor="Source">Source <Arrow /></a>}
                {project.live && <a href={project.live} target="_blank" rel="noreferrer" data-cursor="Launch">Live <Arrow /></a>}
              </p>
            )}
            <ul className="proj__stack" aria-label="Stack">
              {project.stack.map((tech) => (
                <li key={tech}>
                  <button
                    className={`proj__chip${lit.includes(tech) ? ' is-on' : ''}`}
                    onPointerEnter={(e) => { if (e.pointerType === 'mouse') setLit([tech]) }}
                    onPointerLeave={() => setLit([])}
                    onFocus={() => setLit([tech])}
                    onBlur={() => setLit([])}
                  >
                    {tech}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="build__inspector" aria-live="polite">
          {node ? (
            <>
              <p className="hud-label inspector__kind">Module · {node.kind}</p>
              <p className="inspector__title">{node.label}</p>
              {node.tech.length > 0 && <p className="inspector__tech">{node.tech.join(' · ')}</p>}
              <p className="inspector__note">{node.note}</p>
            </>
          ) : (
            <>
              <p className="hud-label inspector__kind">Build log · {project.name}</p>
              <ol className="inspector__log">
                {project.points.map((pt, i) => (
                  <li key={i}><span className="inspector__n">{String(i + 1).padStart(2, '0')}</span>{pt}</li>
                ))}
              </ol>
            </>
          )}
        </aside>

        <ol ref={rail} className="build__rail" aria-label="Projects">
          {projects.map((p, i) => (
            <li key={p.name} style={{ '--i': i } as CSSProperties}>
              <button className={`rail__item${i === index ? ' is-active' : ''}`} onClick={() => goTo(i)} aria-current={i === index ? 'true' : undefined}>
                <span className="rail__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="rail__name">{p.name}</span>
                <span className="rail__bar" aria-hidden="true"><i /></span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
