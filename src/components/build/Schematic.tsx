import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import type { Project } from '../../content/profile'
import { layoutSystem, type SystemLayout } from '../../lib/systemLayout'
import { pointer } from '../../lib/pointer'
import { NodeIcon } from './NodeIcon'

export type SchematicHandle = {
  /** t = local project time: 0 → 0.3 assemble, hold, 0.78 → 1 decompile */
  update: (t: number, dt: number) => void
}

type Props = {
  system: NonNullable<Project['system']>
  inspect: string | null
  lit: string[]
  onInspect: (id: string | null) => void
  reduced: boolean
  ref: Ref<SchematicHandle>
}

type Voxel = { x: number; y: number; ix: number; iy: number; ox: number; oy: number; d: number; edge: boolean }

const CELL = 7
const PACKETS_PER_EDGE = 2
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => { const k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k) }
const easeOut = (k: number) => 1 - (1 - k) ** 3

/** Module presence at local time t — assembles column by column, holds, then decompiles. */
function presence(t: number, col: number) {
  const pin = clamp01((t - col * 0.045) / 0.2)
  const pout = clamp01((t - 0.78 - col * 0.03) / 0.12)
  return { p: pin * (1 - pout), leaving: pout > 0 }
}
const edgePresence = (t: number, col: number) => clamp01((t - 0.2 - col * 0.045) / 0.1) * (1 - clamp01((t - 0.76) / 0.05))

/** Each module is a grid of voxels that fly in from scattered positions and drift up-right when leaving. */
function buildVoxels(layout: SystemLayout) {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const out: Record<string, Voxel[]> = {}
  for (const n of layout.nodes) {
    const list: Voxel[] = []
    for (let y = 0; y < n.h - 2; y += CELL) {
      for (let x = 0; x < n.w - 2; x += CELL) {
        const a = rand() * Math.PI * 2, r = 60 + rand() * 220
        list.push({
          x: n.x + x, y: n.y + y,
          ix: n.x + x + Math.cos(a) * r, iy: n.y + y + Math.sin(a) * r * 0.6 - rand() * 140,
          ox: n.x + x + (0.3 + rand()) * 150, oy: n.y + y - (0.4 + rand()) * 220,
          d: rand() * 0.3,
          edge: x < CELL || y < CELL || x + CELL * 2 > n.w || y + CELL * 2 > n.h,
        })
      }
    }
    out[n.id] = list
  }
  return out
}

/**
 * A project drawn as a running system. Modules are real buttons (inspectable);
 * traces carry animated packets; a voxel canvas handles assembly and decompile.
 */
export function Schematic({ system, inspect, lit, onInspect, reduced, ref }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const nodeEls = useRef<Record<string, HTMLButtonElement | null>>({})
  const pathEls = useRef<(SVGPathElement | null)[]>([])
  const packetEls = useRef<(SVGGElement | null)[]>([])
  const lens = useRef<number[]>([])
  const clock = useRef(0)
  const tilt = useRef({ x: 0, y: 0 })
  const inspectRef = useRef(inspect)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => { inspectRef.current = inspect }, [inspect])

  useLayoutEffect(() => {
    const el = box.current!
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => (size.w > 0 ? layoutSystem(system, size.w, size.h, size.w < 560) : null), [system, size])
  const voxels = useMemo(() => (layout ? buildVoxels(layout) : {}), [layout])

  // size the voxel canvas and measure traces whenever the layout changes
  useLayoutEffect(() => {
    if (!layout) return
    const cv = canvas.current!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(size.w * dpr)
    cv.height = Math.round(size.h * dpr)
    cv.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
    lens.current = pathEls.current.map((p) => p?.getTotalLength() ?? 0)
    pathEls.current.forEach((p, i) => { if (p) p.style.strokeDasharray = `${lens.current[i]}` })
  }, [layout, size])

  useImperativeHandle(ref, () => ({
    update(t: number, dt: number) {
      if (!layout) return
      clock.current += dt

      if (!reduced) {
        const k = 1 - Math.exp(-dt * 3)
        const tx = pointer.hasFinePointer ? pointer.x - 0.5 : pointer.hasTilt ? pointer.tiltX * 0.5 : 0
        const ty = pointer.hasFinePointer ? pointer.y - 0.5 : pointer.hasTilt ? pointer.tiltY * 0.5 : 0
        tilt.current.x += (tx - tilt.current.x) * k
        tilt.current.y += (ty - tilt.current.y) * k
        plane.current!.style.transform = `rotateY(${tilt.current.x * 9}deg) rotateX(${-tilt.current.y * 7}deg)`
      }

      const ctx = canvas.current!.getContext('2d')!
      ctx.clearRect(0, 0, size.w, size.h)

      for (const n of layout.nodes) {
        const { p, leaving } = reduced ? { p: t >= 0 && t < 1 ? 1 : 0, leaving: false } : presence(t, n.col)
        const vis = smooth(0.82, 1, p)
        const el = nodeEls.current[n.id]
        if (el) {
          el.style.opacity = String(vis)
          el.style.visibility = vis < 0.02 ? 'hidden' : 'visible'
        }
        if (reduced || p <= 0 || p >= 1) continue
        const fade = 1 - vis
        for (const pass of [true, false]) {
          ctx.fillStyle = pass ? '#8fb5ff' : 'rgba(150, 172, 205, 0.5)'
          for (const v of voxels[n.id]) {
            if (v.edge !== pass) continue
            const k = clamp01((p - v.d) / 0.7)
            if (k <= 0) continue
            const e = easeOut(k)
            const sx = leaving ? v.ox : v.ix, sy = leaving ? v.oy : v.iy
            const s = CELL * (0.4 + 0.45 * e)
            ctx.globalAlpha = Math.min(1, k * 2.5) * fade
            ctx.fillRect(sx + (v.x - sx) * e, sy + (v.y - sy) * e, s, s)
          }
        }
      }
      ctx.globalAlpha = 1

      const hot = inspectRef.current
      layout.edges.forEach((e, i) => {
        const path = pathEls.current[i]
        const len = lens.current[i] || 0
        const ep = reduced ? 1 : edgePresence(t, e.fromCol)
        if (path) path.style.strokeDashoffset = String(len * (1 - ep))
        const isHot = hot === e.from || hot === e.to
        for (let k = 0; k < PACKETS_PER_EDGE; k++) {
          const g = packetEls.current[i * PACKETS_PER_EDGE + k]
          if (!g || !path || !len) continue
          if (reduced || ep < 1) { g.style.opacity = '0'; continue }
          const speed = isHot ? 260 : 110
          const u = ((clock.current * speed) / len + k / PACKETS_PER_EDGE + i * 0.37) % 1
          const pt = path.getPointAtLength(u * len)
          g.setAttribute('transform', `translate(${pt.x} ${pt.y})`)
          g.style.opacity = String(Math.sin(u * Math.PI) * (isHot ? 1 : 0.75))
        }
      })
    },
  }), [layout, voxels, reduced, size])

  const litSet = new Set(lit)
  const neighbours = new Set<string>()
  if (inspect) system.edges.forEach(([a, b]) => { if (a === inspect) neighbours.add(b); if (b === inspect) neighbours.add(a) })

  return (
    <div ref={box} className={`schematic${layout?.vertical ? ' is-vertical' : ''}${layout?.compact ? ' is-compact' : ''}${inspect ? ' has-inspect' : ''}`}>
      <div ref={plane} className="schematic__plane">
        <svg className="schematic__svg" width={size.w} height={size.h} aria-hidden="true">
          {layout?.edges.map((e, i) => (
            <path
              key={`${e.from}-${e.to}`}
              ref={(el) => { pathEls.current[i] = el }}
              className={`sys-edge${inspect === e.from || inspect === e.to ? ' is-hot' : ''}`}
              d={e.d}
            />
          ))}
          {layout?.edges.flatMap((e, i) =>
            Array.from({ length: PACKETS_PER_EDGE }, (_, k) => (
              <g key={`${e.from}-${e.to}-${k}`} ref={(el) => { packetEls.current[i * PACKETS_PER_EDGE + k] = el }} className="sys-packet" style={{ opacity: 0 }}>
                <circle className="sys-packet__halo" r="6" />
                <circle r="2.2" />
              </g>
            )),
          )}
        </svg>
        <canvas ref={canvas} className="schematic__voxels" aria-hidden="true" />
        {layout?.nodes.map((n) => {
          const cls = [
            'sys-node',
            inspect === n.id && 'is-inspect',
            inspect && inspect !== n.id && !neighbours.has(n.id) && 'is-dim',
            n.tech.some((tech) => litSet.has(tech)) && 'is-lit',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={n.id}
              ref={(el) => { nodeEls.current[n.id] = el }}
              className={cls}
              style={{ left: n.x, top: n.y, width: n.w, height: n.h, opacity: 0 }}
              data-kind={n.kind}
              data-cursor="Inspect"
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') onInspect(n.id) }}
              onPointerLeave={(e) => { if (e.pointerType === 'mouse') onInspect(null) }}
              onFocus={() => onInspect(n.id)}
              onBlur={() => onInspect(null)}
              onClick={(e) => {
                // touch has no hover: taps toggle the inspector
                const type = e.nativeEvent instanceof PointerEvent ? e.nativeEvent.pointerType : ''
                if (type === 'touch' || type === 'pen') onInspect(inspect === n.id ? null : n.id)
              }}
            >
              <NodeIcon kind={n.kind} />
              <span className="sys-node__text">
                <span className="sys-node__label">{n.label}</span>
                <span className="sys-node__tech">{n.tech.length ? n.tech.join(' · ') : KIND_LABEL[n.kind]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = {
  input: 'Input', external: 'External source', ui: 'Interface', api: 'Service', data: 'Data',
  model: 'Model', store: 'Storage', agent: 'Agents', llm: 'Models', viz: 'Visualisation', output: 'Output',
}
