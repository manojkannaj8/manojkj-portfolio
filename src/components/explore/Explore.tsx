import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { currentMonth, formatMonth } from '../../lib/dates'
import { pointer } from '../../lib/pointer'
import { useReducedMotion } from '../../lib/motion'
import { scrollToY } from '../../lib/scroll'
import { ChapterHead } from '../chapter/ChapterHead'
import { FlightScene, type FlightState } from './FlightScene'
import { buildMissions } from './missions'
import { Dossier } from './Dossier'
import { Timeline } from './Timeline'
import './Explore.css'

gsap.registerPlugin(ScrollTrigger)

const SEGMENT_VH = 120
const isWide = (w: number, h: number) => w >= 760 && w / h >= 1.25

/**
 * Chapter 03 — Explore. Experience as a flight: one ring-gate per role, in chronological order.
 * Scroll flies the camera forward; the cursor / gyro steers; passing a gate flashes its colour.
 * Docking at a gate opens that mission's dossier. A mission clock and timeline track the date.
 */
export function Explore() {
  const reduced = useReducedMotion()
  const missions = useMemo(() => buildMissions(), [])
  const N = missions.length
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const labels = useRef<(HTMLButtonElement | null)[]>([])
  const clock = useRef<HTMLSpanElement>(null)
  const status = useRef<HTMLSpanElement>(null)
  const timeline = useRef<HTMLDivElement>(null)
  const scene = useRef<FlightScene | null>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const progress = useRef(0)
  const [active, setActive] = useState(-1)

  const axis = useMemo(() => {
    const dated = missions.filter((m) => m.start !== null)
    const now = currentMonth()
    const from = Math.min(...dated.map((m) => m.start!))
    const to = Math.max(now, ...dated.map((m) => m.end!))
    return { from, to, count: to - from + 1 }
  }, [missions])

  useEffect(() => {
    const cv = canvas.current!
    const sc = new FlightScene(cv, missions.map((m) => ({ color: m.color, featured: m.featured, current: m.present })), reduced)
    scene.current = sc

    // camera depth ↔ date: docked at a gate = that mission's start month; the route ends at "now"
    const anchors: [number, number][] = missions.flatMap((m, i) => (m.start !== null ? [[sc.dockZ(i), m.start] as [number, number]] : []))
    anchors.push([sc.zEnd, currentMonth() + 0.999])
    const dateAt = (z: number) => {
      if (z <= anchors[0][0]) return anchors[0][1]
      for (let k = 1; k < anchors.length; k++) {
        const [z0, d0] = anchors[k - 1], [z1, d1] = anchors[k]
        if (z <= z1) return d0 + ((z - z0) / (z1 - z0)) * (d1 - d0)
      }
      return anchors[anchors.length - 1][1]
    }

    const st: FlightState = { cz: sc.zStart, steerX: 0, steerY: 0, speed: 0, time: 0, flash: 0, flashColor: '#8fb5ff', active: -1 }
    let current = -2
    let lastClock = ''
    let lastStatus = ''

    const activeAt = (z: number) => sc.gateZ.reduce((a, gz, i) => (z >= gz - 900 ? i : a), -1)

    const frame = (dt: number) => {
      const flightZ = sc.zStart + progress.current * (sc.zEnd - sc.zStart)
      const prev = st.cz
      if (reduced) {
        // no continuous flight: jump between docked views
        const a = activeAt(flightZ)
        st.cz = a < 0 ? sc.zStart : sc.dockZ(a)
      } else {
        st.cz += (flightZ - st.cz) * (1 - Math.exp(-dt * 5))
        st.speed = dt > 0 ? (st.cz - prev) / dt : 0
        const fine = pointer.hasFinePointer
        const tx = fine ? (pointer.x - 0.5) * 2 : pointer.hasTilt ? pointer.tiltX : 0
        const ty = fine ? (pointer.y - 0.5) * 2 : pointer.hasTilt ? pointer.tiltY : 0
        const k = 1 - Math.exp(-dt * 2.5)
        st.steerX += (tx - st.steerX) * k
        st.steerY += (ty - st.steerY) * k
        st.time += dt
        sc.gateZ.forEach((gz, i) => {
          if ((prev < gz) !== (st.cz < gz)) { st.flash = 1; st.flashColor = missions[i].color }
        })
        st.flash *= Math.exp(-dt * 3)
      }

      const a = activeAt(st.cz)
      st.active = a
      if (a !== current) { current = a; setActive(a) }
      sc.render(st)

      labels.current.forEach((el, i) => {
        if (!el) return
        const g = sc.gateScreen(i, st)
        // label only the gate ahead — the docked one is described by the dossier, further ones stay anonymous lights
        const alpha = i === a + 1 ? g.alpha : 0
        el.style.opacity = String(alpha)
        el.style.visibility = alpha < 0.05 ? 'hidden' : 'visible'
        // keep the label on-stage (widths cached on resize)
        const x = Math.max(8, Math.min(g.x + g.r * 0.72, stageW - (labelW[i] || 0) - 8))
        el.style.transform = `translate3d(${x}px, ${g.y - g.r * 0.72}px, 0)`
      })

      const docked = a >= 0 && Math.abs(st.cz - sc.dockZ(a)) < 260
      const date = dateAt(st.cz)
      // docked reads exactly the mission's start month (the eased camera may sit just short of it)
      const label = formatMonth(docked && missions[a].start !== null ? missions[a].start! : Math.min(date, currentMonth()))
      if (label !== lastClock && clock.current) { clock.current.textContent = label; lastClock = label }
      timeline.current?.style.setProperty('--x', String(Math.min(1, Math.max(0, (date - axis.from) / axis.count))))

      let s: string
      if (a < 0) s = `Pre-flight · ${N} missions plotted`
      else if (docked) s = `Docked · ${missions[a].org}`
      else if (st.cz < sc.gateZ[a]) s = `Entering gate ${String(a + 1).padStart(2, '0')}`
      else if (a < N - 1) s = `In transit → ${missions[a + 1].org}`
      else s = 'Route complete · present day'
      if (s !== lastStatus && status.current) { status.current.textContent = s; lastStatus = s }
    }

    let stageW = cv.clientWidth
    const labelW: number[] = []
    const resize = () => {
      const w = cv.clientWidth, h = cv.clientHeight
      stageW = w
      labels.current.forEach((el, i) => { labelW[i] = el?.offsetWidth ?? 0 })
      sc.resize(w, h, isWide(w, h))
      frame(0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const trig = ScrollTrigger.create({
      trigger: section.current,
      start: 'top 70%',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress
        if (reduced) frame(0)
      },
    })
    trigger.current = trig

    const tick = (_t: number, deltaMs: number) => frame(Math.min(deltaMs / 1000, 1 / 20))
    const io = new IntersectionObserver(([e]) => {
      if (reduced) return
      if (e.isIntersecting) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    })
    io.observe(section.current!)

    return () => {
      ro.disconnect()
      io.disconnect()
      trig.kill()
      gsap.ticker.remove(tick)
      trigger.current = null
      scene.current = null
    }
  }, [missions, reduced, axis, N])

  const goTo = (i: number) => {
    const sc = scene.current, st = trigger.current
    if (!sc || !st) return
    const q = (sc.dockZ(i) - sc.zStart) / (sc.zEnd - sc.zStart)
    scrollToY(st.start + q * (st.end - st.start))
  }

  return (
    <section
      ref={section}
      id="explore"
      className="explore"
      aria-labelledby="explore-title"
      style={{ height: `calc(100svh + ${N * SEGMENT_VH}svh)` }}
    >
      <div className="explore__stage">
        <canvas ref={canvas} className="explore__canvas" aria-hidden="true" />
        <div className="explore__vignette" aria-hidden="true" />

        {missions.map((m, i) => (
          <button
            key={m.org}
            ref={(el) => { labels.current[i] = el }}
            className={`gate-label${i === active ? ' is-active' : ''}${m.featured ? ' is-featured' : ''}`}
            style={{ '--c': m.color, opacity: 0, visibility: 'hidden' } as CSSProperties}
            onClick={() => goTo(i)}
            data-cursor="Dock"
            tabIndex={-1}
            aria-hidden="true"
          >
            <span className="gate-label__n">{String(i + 1).padStart(2, '0')}</span>
            <span className="gate-label__org">
              {m.highlight?.logo && <img className="org-logo" src={m.highlight.logo} alt="" width={16} height={16} />}
              {m.org}
              {m.highlight?.badge && <span className="org-tag">{m.highlight.badge.label}</span>}
              {m.currentLead && <span className="org-tag org-tag--live"><i />Current</span>}
            </span>
            <span className="gate-label__period">{m.period}</span>
          </button>
        ))}

        <div className="explore__left">
          <ChapterHead id="explore" titleId="explore-title" />
          <div className="clock" aria-hidden="true">
            <span className="hud-label clock__label">Mission clock</span>
            <span ref={clock} className="clock__value">—</span>
            <span ref={status} className="clock__status" />
          </div>
        </div>

        <div className="explore__dossier">
          <Dossier missions={missions} active={active} onGo={goTo} />
        </div>

        <div className="explore__timeline">
          <Timeline ref={timeline} missions={missions} axis={axis} active={active} onGo={goTo} />
        </div>
      </div>
    </section>
  )
}
