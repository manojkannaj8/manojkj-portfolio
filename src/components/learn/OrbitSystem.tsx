import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import gsap from 'gsap'
import { profile } from '../../content/profile'
import { pointer } from '../../lib/pointer'
import { prefersReducedMotion } from '../../lib/motion'
import type { SkillGraph } from '../../lib/skillGraph'
import { CoreGauge, type CoreGaugeHandle } from './CoreGauge'
import type { Ring } from './rings'

/** Ring radii as a fraction of the system radius, inner → outer. */
const RADII = [0.42, 0.61, 0.8, 1]
/** Base angular speed per ring (rad/s); alternating directions. */
const SPEEDS = [0.16, -0.11, 0.075, -0.05]
const easeOut = gsap.parseEase('power3.out')
type Layout = { cx: number; cy: number; R: number; flat: number; core: number }

function layoutFor(W: number, H: number): Layout {
  if (W < 760) {
    const R = Math.min(W * 0.45, H * 0.3)
    return { cx: W * 0.5, cy: H * 0.555, R, flat: 0.52, core: R * 0.3 }
  }
  if (W / H < 1.25) {
    const R = Math.min(W * 0.42, H * 0.42)
    return { cx: W * 0.5, cy: H * 0.55, R, flat: 0.42, core: R * 0.29 }
  }
  const R = Math.min(W * 0.33, H * 0.95)
  return { cx: W * 0.6, cy: H * 0.565, R, flat: 0.34, core: R * 0.28 }
}

type Props = {
  graph: SkillGraph
  rings: Ring[]
  active: string | null
  focusCat: string | null
  onHover: (name: string | null) => void
  onPick: (name: string) => void
  /** scroll-driven build target, 0 → 1 */
  build: { current: number }
  /** element the core's HUD leader line points at (education details) */
  callout?: { current: HTMLElement | null }
}

/**
 * Skills as a tilted orbital system around the education core.
 * DOM nodes (accessible buttons) are positioned every frame; SVG draws the rings
 * (back half behind the core, front half over it) and the constellation of related skills.
 */
export function OrbitSystem({ graph, rings, active, focusCat, onHover, onPick, build, callout }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const coreWrap = useRef<HTMLDivElement>(null)
  const gauge = useRef<CoreGaugeHandle>(null)
  const nodeEls = useRef<Record<string, HTMLButtonElement | null>>({})
  const backRings = useRef<(SVGEllipseElement | null)[]>([])
  const frontRings = useRef<(SVGPathElement | null)[]>([])
  const glints = useRef<(SVGCircleElement | null)[]>([])
  const lineEls = useRef<(SVGLineElement | null)[]>([])
  const svgs = useRef<(SVGSVGElement | null)[]>([])
  const leader = useRef<SVGPolylineElement>(null)
  const related = useMemo(() => (active ? graph.byName[active]?.related ?? [] : []), [active, graph])
  // the render loop reads the latest selection through refs
  const activeRef = useRef(active)
  const relatedRef = useRef(related)
  useLayoutEffect(() => {
    activeRef.current = active
    relatedRef.current = related
  }, [active, related])

  const edu = profile.education[0]
  const redraw = useRef<(dt: number) => void>(() => {})

  // reduced motion has no render loop — redraw when the selection changes
  useEffect(() => { if (prefersReducedMotion()) redraw.current(0) }, [active])

  useEffect(() => {
    const el = root.current!
    const reduced = prefersReducedMotion()
    let W = 0, H = 0
    let L: Layout = layoutFor(1, 1)
    const angles = rings.map((_, i) => i * 0.9)
    const pos: Record<string, [number, number]> = {}
    const side: Record<string, string> = {}
    const labelW: Record<string, number> = {}
    const s = { tiltX: 0, tiltY: 0, spin: 1, drag: 0, build: reduced ? 1 : 0, t: 0 }
    let target: { x: number; y: number } | null = null

    const resize = () => {
      W = el.clientWidth
      H = el.clientHeight
      for (const k in labelW) delete labelW[k]
      L = layoutFor(W, H)
      svgs.current.forEach((svg) => svg?.setAttribute('viewBox', `0 0 ${W} ${H}`))
      coreWrap.current!.style.width = coreWrap.current!.style.height = `${L.core * 2}px`
      const t = callout?.current
      if (t && getComputedStyle(t).position === 'absolute') {
        // offset metrics ignore the entrance transform; both share the stage as offsetParent
        target = { x: t.offsetLeft - 14, y: t.offsetTop + t.offsetHeight / 2 }
      } else target = null
      frame(0)
    }

    const frame = (dt: number) => {
      s.t += dt
      if (!reduced) {
        const fine = pointer.hasFinePointer
        const tx = fine ? (pointer.x - 0.5) * 2 : pointer.hasTilt ? pointer.tiltX : 0
        const ty = fine ? (pointer.y - 0.5) * 2 : pointer.hasTilt ? pointer.tiltY : 0
        const k = 1 - Math.exp(-dt * 3)
        s.tiltX += (tx - s.tiltX) * k
        s.tiltY += (ty - s.tiltY) * k
        s.spin += ((activeRef.current ? 0 : 1) - s.spin) * (1 - Math.exp(-dt * 4))
        s.build += (build.current - s.build) * (1 - Math.exp(-dt * 4))
      }
      s.drag *= Math.exp(-dt * 2.2)
      const roll = s.tiltX * 0.09
      const flat = Math.max(0.18, L.flat + s.tiltY * 0.07)
      const cr = Math.cos(roll), sr = Math.sin(roll)
      const b = s.build

      // core fills first, then rings expand outward one by one
      gauge.current?.set(Math.min(1, b / 0.35))
      const coreScale = 0.6 + 0.4 * Math.min(1, b / 0.2)
      coreWrap.current!.style.transform =
        `translate3d(${L.cx + s.tiltX * 8}px, ${L.cy + s.tiltY * 6}px, 0) translate(-50%, -50%) scale(${coreScale})`
      coreWrap.current!.style.opacity = String(Math.min(1, b / 0.12))

      // HUD leader line: core rim → elbow → education callout
      const ln = leader.current
      if (ln) {
        if (target && L.cx + L.core < target.x) {
          const ang = -Math.PI / 4
          const ox = L.cx + s.tiltX * 8 + Math.cos(ang) * L.core * 0.9 * coreScale
          const oy = L.cy + s.tiltY * 6 + Math.sin(ang) * L.core * 0.9 * coreScale
          const ex = Math.max(ox + 20, target.x - 60)
          ln.setAttribute('points', `${ox},${oy} ${ex},${target.y} ${target.x},${target.y}`)
          ln.style.opacity = String(Math.max(0, Math.min(1, (b - 0.3) / 0.2)))
        } else ln.style.opacity = '0'
      }

      rings.forEach((ring, i) => {
        angles[i] += (SPEEDS[i] * s.spin + s.drag * (1.3 - i * 0.12)) * dt
        const rp = easeOut(Math.min(1, Math.max(0, (b - 0.2 - i * 0.12) / 0.4)))
        const rad = L.R * RADII[i] * (0.25 + 0.75 * rp)
        const ry = rad * flat
        const rot = `rotate(${(roll * 180) / Math.PI} ${L.cx} ${L.cy})`

        const back = backRings.current[i]
        if (back) {
          back.setAttribute('cx', String(L.cx)); back.setAttribute('cy', String(L.cy))
          back.setAttribute('rx', String(rad)); back.setAttribute('ry', String(ry))
          back.setAttribute('transform', rot)
          back.style.opacity = String(rp)
        }
        const front = frontRings.current[i]
        if (front) {
          front.setAttribute('d', `M ${L.cx + rad} ${L.cy} A ${rad} ${ry} 0 0 1 ${L.cx - rad} ${L.cy}`)
          front.setAttribute('transform', rot)
          front.style.opacity = String(rp)
        }
        const g = glints.current[i]
        if (g) {
          const ga = s.t * 0.5 * Math.sign(SPEEDS[i]) + i * 1.7
          const gx = Math.cos(ga) * rad, gy = Math.sin(ga) * ry
          g.setAttribute('cx', String(L.cx + gx * cr - gy * sr))
          g.setAttribute('cy', String(L.cy + gx * sr + gy * cr))
          g.style.opacity = String(rp * (0.35 + 0.65 * (Math.sin(ga) + 1) / 2))
        }

        const n = ring.skills.length
        ring.skills.forEach((name, j) => {
          const node = nodeEls.current[name]
          if (!node) return
          const th = angles[i] + (j / n) * Math.PI * 2
          const ux = Math.cos(th) * rad, uy = Math.sin(th) * ry
          const x = L.cx + ux * cr - uy * sr
          const y = L.cy + ux * sr + uy * cr
          const depth = Math.sin(th) // +1 front … -1 back
          const d01 = (depth + 1) / 2
          pos[name] = [x, y]
          node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${0.78 + 0.22 * d01})`
          node.style.opacity = String(rp * rp * (0.38 + 0.62 * d01)) // labels arrive late so collapsed rings don't clutter the core
          node.style.zIndex = depth > 0 ? '30' : '6'
          // label faces outward, unless that would run off the stage
          const lw = labelW[name] || (labelW[name] = (node.lastElementChild as HTMLElement).offsetWidth)
          let sd = ux < 0 ? 'left' : 'right'
          if (sd === 'left' && x - 14 - lw < 6) sd = 'right'
          else if (sd === 'right' && x + 14 + lw > W - 6) sd = 'left'
          if (side[name] !== sd) { side[name] = sd; node.dataset.side = sd }
        })
      })

      // constellation: active skill → every skill it has been used alongside
      const a = activeRef.current
      const from = a ? pos[a] : null
      relatedRef.current.forEach((name, i) => {
        const line = lineEls.current[i]
        const to = pos[name]
        if (!line || !from || !to) return
        line.setAttribute('x1', String(from[0])); line.setAttribute('y1', String(from[1]))
        line.setAttribute('x2', String(to[0])); line.setAttribute('y2', String(to[1]))
      })
    }

    redraw.current = frame
    const tick = (_t: number, deltaMs: number) => frame(Math.min(deltaMs / 1000, 1 / 20))

    // drag (mouse or touch) spins the system, with inertia
    let dragging = false
    let lastX = 0, lastT = 0
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest('button')) return
      dragging = true
      lastX = e.clientX
      lastT = performance.now()
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const dt = Math.max((now - lastT) / 1000, 1 / 240)
      const v = ((e.clientX - lastX) / Math.max(W, 1)) * 3.2 / dt
      s.drag += (Math.max(-6, Math.min(6, v)) - s.drag) * 0.5
      if (reduced) frame(dt)
      lastX = e.clientX
      lastT = now
    }
    const up = () => { dragging = false }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)

    const ro = new ResizeObserver(resize)
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      if (reduced) return
      if (e.isIntersecting) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    })
    io.observe(el)
    resize()

    return () => {
      ro.disconnect()
      io.disconnect()
      gsap.ticker.remove(tick)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [rings, build, callout])

  const relatedSet = new Set(related)

  return (
    <div ref={root} className={`orbit${active ? ' has-active' : ''}${focusCat ? ' has-focus' : ''}`}>
      <svg ref={(e) => { svgs.current[0] = e }} className="orbit__svg orbit__svg--back" aria-hidden="true">
        {rings.map((r, i) => (
          <ellipse key={r.name} ref={(e) => { backRings.current[i] = e }} className={`orbit__ring${focusCat && focusCat !== r.name ? ' is-muted' : ''}${focusCat === r.name ? ' is-focus' : ''}`} style={{ stroke: r.color }} />
        ))}
      </svg>

      <div ref={coreWrap} className="orbit__core">
        <CoreGauge ref={gauge} value={edu.score.value} outOf={edu.score.outOf} label={edu.score.label} />
      </div>

      <svg ref={(e) => { svgs.current[1] = e }} className="orbit__svg orbit__svg--front" aria-hidden="true">
        {rings.map((r, i) => (
          <path key={r.name} ref={(e) => { frontRings.current[i] = e }} className={`orbit__arc${focusCat && focusCat !== r.name ? ' is-muted' : ''}${focusCat === r.name ? ' is-focus' : ''}`} style={{ stroke: r.color }} />
        ))}
        {rings.map((r, i) => (
          <circle key={r.name} ref={(e) => { glints.current[i] = e }} className="orbit__glint" r="2.6" style={{ fill: r.color }} />
        ))}
        <polyline ref={leader} className="orbit__leader" />
        {related.map((name, i) => (
          <line key={`${active}-${name}`} ref={(e) => { lineEls.current[i] = e }} className="orbit__link" />
        ))}
      </svg>

      {rings.map((ring) => (
        <div key={ring.name} role="group" aria-label={ring.name} className="orbit__group">
          {ring.skills.map((name) => {
            const skill = graph.byName[name]
            const cls = [
              'orb-node',
              name === active && 'is-active',
              relatedSet.has(name) && 'is-related',
              active && name !== active && !relatedSet.has(name) && 'is-dim',
              focusCat && focusCat !== ring.name && 'is-muted',
              skill.applied.length > 0 && 'is-applied',
            ].filter(Boolean).join(' ')
            return (
              <button
                key={name}
                ref={(e) => { nodeEls.current[name] = e }}
                className={cls}
                style={{ '--c': ring.color } as CSSProperties}
                data-side="right"
                data-cursor="Trace"
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover(name) }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') onHover(null) }}
                onFocus={() => onHover(name)}
                onBlur={() => onHover(null)}
                onClick={() => onPick(name)}
              >
                <span className="orb-node__dot" />
                <span className="orb-node__label">{name}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
