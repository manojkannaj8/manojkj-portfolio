import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { pointer } from '../../lib/pointer'
import { prefersReducedMotion } from '../../lib/motion'

gsap.registerPlugin(ScrollTrigger)

type Voxel = {
  tx: number; ty: number    // resting position
  sx: number; sy: number    // scattered start (falls in from above, like the hero's dispersed voxels)
  delay: number
  ox: number; oy: number    // cursor displacement
  vx: number; vy: number
  twinkle: number
}

const FONT = (px: number) => `800 ${px}px "Unbounded Variable", "Arial Black", sans-serif`

/**
 * Display type built from voxels. Assembles as it scrolls into view; the cursor (or a touch)
 * pushes voxels aside and they spring back. Decorative — pair with real heading text for a11y.
 */
export function VoxelTitle({ text, maxSize = 190 }: { text: string; maxSize?: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = wrap.current!
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    const reduced = prefersReducedMotion()
    let voxels: Voxel[] = []
    let cell = 6
    let cssW = 0
    let cssH = 0
    let dpr = 1
    let progress = reduced ? 1 : 0
    let target = progress
    let visible = false
    let disposed = false
    // touch devices have no hover: the pointer position is just "wherever the last tap was", so
    // continuous repulsion would shove voxels as titles scroll past it. Taps give an impulse instead.
    const fine = pointer.hasFinePointer
    let impulse: { x: number; y: number } | null = null
    let moving = false
    let frame = 0

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cssW = el.clientWidth
      const probe = document.createElement('canvas').getContext('2d')!
      probe.font = FONT(100)
      const m = probe.measureText(text.toUpperCase())
      const size = Math.min(maxSize, (cssW / m.width) * 100)
      probe.font = FONT(size)
      const mm = probe.measureText(text.toUpperCase())
      const asc = mm.actualBoundingBoxAscent
      const desc = mm.actualBoundingBoxDescent
      cssH = Math.ceil(asc + desc + 4)
      cv.width = Math.round(cssW * dpr)
      cv.height = Math.round(cssH * dpr)
      cv.style.height = `${cssH}px`

      // rasterise once at 1x and sample on a grid
      const off = document.createElement('canvas')
      off.width = Math.ceil(mm.width) + 4
      off.height = cssH
      const o = off.getContext('2d', { willReadFrequently: true })!
      o.font = FONT(size)
      o.fillStyle = '#fff'
      o.fillText(text.toUpperCase(), 2, asc + 2)
      const data = o.getImageData(0, 0, off.width, off.height).data
      cell = Math.max(4, Math.round(size / 24))
      voxels = []
      let seed = 1
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      for (let y = cell / 2; y < off.height; y += cell) {
        for (let x = cell / 2; x < off.width; x += cell) {
          if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] < 128) continue
          const r = rand()
          voxels.push({
            tx: x - cell / 2, ty: y - cell / 2,
            sx: x + (rand() - 0.5) * cssW * 0.5,
            sy: y - cssH * (1.5 + rand() * 3.5),
            delay: r * 0.45 + (x / off.width) * 0.2,
            ox: 0, oy: 0, vx: 0, vy: 0,
            twinkle: rand(),
          })
        }
      }
      draw(0)
    }

    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const draw = (dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)
      let px = -1e5, py = -1e5
      if (fine) {
        const rect = cv.getBoundingClientRect()
        px = pointer.clientX - rect.left
        py = pointer.clientY - rect.top
      }
      const R = Math.max(60, cssH * 0.7)
      const hit = impulse
      impulse = null
      moving = false
      const t = performance.now() / 1000
      const settled: number[] = []
      ctx.fillStyle = 'rgba(143, 181, 255, 0.9)'
      for (const v of voxels) {
        // cursor repulsion with spring return
        if (!reduced && dt > 0) {
          const dx = v.tx + v.ox - px, dy = v.ty + v.oy - py
          const d = Math.hypot(dx, dy)
          if (d < R && d > 0.01) {
            const f = (1 - d / R) ** 2 * 900 * dt
            v.vx += (dx / d) * f
            v.vy += (dy / d) * f
          }
          if (hit) {
            const hx = v.tx + v.ox - hit.x, hy = v.ty + v.oy - hit.y, hd = Math.hypot(hx, hy)
            if (hd < R * 1.5 && hd > 0.01) {
              const f = (1 - hd / (R * 1.5)) * 260
              v.vx += (hx / hd) * f
              v.vy += (hy / hd) * f
            }
          }
          v.vx += -v.ox * 60 * dt
          v.vy += -v.oy * 60 * dt
          const damp = Math.exp(-dt * 9)
          v.vx *= damp
          v.vy *= damp
          v.ox += v.vx * dt
          v.oy += v.vy * dt
          if (!moving && Math.abs(v.vx) + Math.abs(v.vy) > 1) moving = true
        }
        const k = Math.min(1, Math.max(0, (progress - v.delay) / 0.4))
        if (k <= 0) continue
        const e = ease(k)
        const x = v.sx + (v.tx - v.sx) * e + v.ox
        const y = v.sy + (v.ty - v.sy) * e + v.oy
        const disturbed = Math.abs(v.ox) + Math.abs(v.oy) > 1.5
        if (e > 0.995 && !disturbed) {
          settled.push(x, y)
          continue
        }
        const s = cell * (0.45 + 0.4 * e)
        ctx.globalAlpha = Math.min(1, k * 2)
        ctx.fillRect(x, y, s, s)
      }
      // settled voxels in ink, with a sparse data-twinkle
      ctx.globalAlpha = 1
      ctx.fillStyle = '#e4ebf6'
      const s = cell * 0.86
      for (let i = 0; i < settled.length; i += 2) ctx.fillRect(settled[i], settled[i + 1], s, s)
      if (!reduced && progress > 0.9) {
        ctx.fillStyle = '#8fb5ff'
        for (const v of voxels) {
          if (Math.sin(t * 1.7 + v.twinkle * 40) > 0.985) ctx.fillRect(v.tx + v.ox, v.ty + v.oy, s, s)
        }
      }
    }

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 1 / 20)
      progress += (target - progress) * (1 - Math.exp(-dt * 5))
      // touch: once assembled and still, redraw every 4th frame — the twinkle stays, the cost drops
      if (!fine && !moving && !impulse && Math.abs(target - progress) < 0.001 && frame++ % 4) return
      draw(dt)
    }
    const onTap = (e: PointerEvent) => {
      if (fine || reduced || !visible || e.pointerType === 'mouse') return
      const r = cv.getBoundingClientRect()
      const x = e.clientX - r.left, y = e.clientY - r.top
      if (x > -40 && y > -40 && x < r.width + 40 && y < r.height + 40) impulse = { x, y }
    }
    window.addEventListener('pointerdown', onTap, { passive: true })

    const st = reduced
      ? null
      : ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          end: 'top 30%',
          onUpdate: (self) => { target = self.progress },
        })
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (reduced) return
      if (visible) gsap.ticker.add(tick)
      else gsap.ticker.remove(tick)
    })

    const ro = new ResizeObserver(() => { if (!disposed) layout() })
    document.fonts.load(FONT(100)).catch(() => {}).then(() => {
      if (disposed) return
      layout()
      ro.observe(el)
      io.observe(el)
    })

    return () => {
      disposed = true
      st?.kill()
      io.disconnect()
      ro.disconnect()
      gsap.ticker.remove(tick)
      window.removeEventListener('pointerdown', onTap)
    }
  }, [text, maxSize])

  return (
    <div ref={wrap} className="voxel-title" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  )
}
