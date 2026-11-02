import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { pointer } from '../../lib/pointer'
import { prefersReducedMotion } from '../../lib/motion'
import './VoxelImage.css'

gsap.registerPlugin(ScrollTrigger)

type Props = {
  src: string
  alt: string
  /** source crop as fractions of the image: [x, y, w, h] */
  crop?: [number, number, number, number]
  /** cover-fit focus point, fractions (like object-position) */
  focus?: [number, number]
  /** voxel size in CSS px */
  cell?: number
  className?: string
}

/**
 * Canvas preparation (decode → cover-fit into an offscreen canvas → voxel grid) is queued one image
 * per frame: several images entering lazy-load range together otherwise stall a single frame.
 * They are still ~800px off-screen when this runs, so the stagger is invisible.
 */
const blobs = new Map<string, Promise<Blob>>()
const getBlob = (src: string) => {
  if (!blobs.has(src)) blobs.set(src, fetch(src).then((r) => r.blob()))
  return blobs.get(src)!
}

const prepQueue: (() => void)[] = []
let prepScheduled = false
function schedulePrep(job: () => void) {
  prepQueue.push(job)
  if (prepScheduled) return
  prepScheduled = true
  const run = () => {
    prepQueue.shift()?.()
    if (prepQueue.length) requestAnimationFrame(run)
    else prepScheduled = false
  }
  requestAnimationFrame(run)
}

type Cell = { x: number; y: number; sx: number; sy: number; d: number; ox: number; oy: number; vx: number; vy: number }

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * An image that assembles from voxels as it scrolls into view (the hero's language),
 * and breaks apart around the cursor / a tap, revealing dark "interior" holes.
 * Lazy: the image only loads when it's near the viewport. Reduced motion: plain image.
 */
export function VoxelImage({ src, alt, crop, focus, cell = 16, className = '' }: Props) {
  // arrays → stable keys so the effect doesn't restart on every render
  const cropKey = (crop ?? [0, 0, 1, 1]).join(',')
  const focusKey = (focus ?? [0.5, 0.5]).join(',')
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [near, setNear] = useState(false)

  // lazy-load trigger
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '800px 0px' })
    io.observe(wrap.current!)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    const el = wrap.current!
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    const reduced = prefersReducedMotion()
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    let off: HTMLCanvasElement | ImageBitmap | null = null
    let cells: Cell[] = []
    let W = 0, H = 0, dpr = 1
    let p = reduced ? 1 : 0
    let target = p
    let visible = false
    let running = false
    let disposed = false
    let impulse: { x: number; y: number } | null = null

    const layout = () => {
      if (!img.naturalWidth) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = el.clientWidth
      H = el.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      // cover-fit the (cropped) source into an offscreen canvas at device resolution
      const [cx, cy, cw, ch] = cropKey.split(',').map(Number)
      const [fx, fy] = focusKey.split(',').map(Number)
      const sw = img.naturalWidth * cw, sh = img.naturalHeight * ch
      const s = Math.max(W / sw, H / sh)
      const vw = W / s, vh = H / s
      const sx = img.naturalWidth * cx + (sw - vw) * fx
      const sy = img.naturalHeight * cy + (sh - vh) * fy
      const tw = cv.width, th = cv.height
      const viaCanvas = () => {
        const c = document.createElement('canvas')
        c.width = tw
        c.height = th
        c.getContext('2d')!.drawImage(img, sx, sy, vw, vh, 0, 0, tw, th)
        return c
      }
      const adopt = (source: HTMLCanvasElement | ImageBitmap) => {
        if (off && 'close' in off) off.close()
        off = source
        buildCells()
      }
      // Decode + crop + resize off the main thread: createImageBitmap(Blob) runs on a background thread
      // (from an <img> it runs on the main thread — measured 370ms at 4× CPU). Same high-quality result;
      // falls back to the canvas path where resize options aren't supported.
      // touch devices only: desktop keeps the original canvas resample (pixel-identical to before)
      if (!pointer.hasFinePointer && typeof createImageBitmap === 'function') {
        getBlob(src)
          .then((blob) => createImageBitmap(blob, Math.round(sx), Math.round(sy), Math.round(vw), Math.round(vh), { resizeWidth: tw, resizeHeight: th, resizeQuality: 'high' }))
          .then((bm) => {
            if (disposed || cv.width !== tw || cv.height !== th) { bm.close(); return }
            if (bm.width !== tw || bm.height !== th) { bm.close(); adopt(viaCanvas()); return } // resize options unsupported
            adopt(bm)
          })
          .catch(() => { if (!disposed) adopt(viaCanvas()) })
      } else adopt(viaCanvas())
    }

    const buildCells = () => {
      // voxel grid; assembly sweeps diagonally with jitter, voxels fall in from above
      let seed = 3
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      cells = []
      for (let y = 0; y < H; y += cell) {
        for (let x = 0; x < W; x += cell) {
          cells.push({
            x, y,
            sx: (rand() - 0.5) * W * 0.3,
            sy: -(0.15 + rand() * 0.6) * H * 0.5,
            d: rand() * 0.35 + (x / W) * 0.15 + (y / H) * 0.12,
            ox: 0, oy: 0, vx: 0, vy: 0,
          })
        }
      }
      draw(0)
      wake()
    }

    const draw = (dt: number) => {
      if (!off) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // hover only exists on fine pointers — touch skips the per-frame layout read (taps use `impulse`)
      let px = -1, py = -1
      if (pointer.hasFinePointer) {
        const rect = cv.getBoundingClientRect()
        px = pointer.clientX - rect.left
        py = pointer.clientY - rect.top
      }
      const inside = !reduced && pointer.hasFinePointer && px >= 0 && py >= 0 && px <= W && py <= H
      const R = Math.max(70, Math.min(W, H) * 0.22)
      let moving = false

      // physics: cursor pushes voxels out, springs pull them home
      if (!reduced && dt > 0) {
        for (const c of cells) {
          const cx = c.x + cell / 2, cy = c.y + cell / 2
          if (inside) {
            const dx = cx + c.ox - px, dy = cy + c.oy - py, d = Math.hypot(dx, dy)
            if (d < R && d > 0.01) {
              const f = (1 - d / R) ** 2 * 520 * dt
              c.vx += (dx / d) * f; c.vy += (dy / d) * f
            }
          }
          if (impulse) {
            const dx = cx - impulse.x, dy = cy - impulse.y, d = Math.hypot(dx, dy)
            if (d < R * 1.6 && d > 0.01) {
              const f = (1 - d / (R * 1.6)) * 420
              c.vx += (dx / d) * f; c.vy += (dy / d) * f
            }
          }
          c.vx += -c.ox * 70 * dt; c.vy += -c.oy * 70 * dt
          const damp = Math.exp(-dt * 10)
          c.vx *= damp; c.vy *= damp
          c.ox += c.vx * dt; c.oy += c.vy * dt
          if (Math.abs(c.ox) + Math.abs(c.oy) > 0.3 || Math.abs(c.vx) + Math.abs(c.vy) > 2) moving = true
        }
        impulse = null
      }

      ctx.clearRect(0, 0, W, H)
      if (p >= 0.999) {
        // assembled: full image, then pop displaced voxels out of their slots
        ctx.drawImage(off, 0, 0, W, H)
        for (const c of cells) {
          const disp = Math.abs(c.ox) + Math.abs(c.oy)
          if (disp < 0.6) continue
          ctx.fillStyle = '#05070b'
          ctx.fillRect(c.x, c.y, cell, cell)
          ctx.fillStyle = 'rgba(74, 125, 255, 0.35)'
          ctx.fillRect(c.x + cell * 0.46, c.y + cell * 0.46, 1, 1)
        }
        for (const c of cells) {
          const disp = Math.abs(c.ox) + Math.abs(c.oy)
          if (disp < 0.6) continue
          const s = cell * Math.max(0.55, 1 - disp / 120)
          const x = c.x + c.ox + (cell - s) / 2, y = c.y + c.oy + (cell - s) / 2
          ctx.drawImage(off, c.x * dpr, c.y * dpr, cell * dpr, cell * dpr, x, y, s, s)
          ctx.globalAlpha = Math.min(0.5, disp / 60)
          ctx.fillStyle = '#8fb5ff'
          ctx.fillRect(x, y, s, s)
          ctx.globalAlpha = 1
        }
      } else {
        // assembling
        for (const c of cells) {
          const k = Math.min(1, Math.max(0, (p - c.d) / 0.4))
          if (k <= 0) continue
          const e = ease(k)
          const s = k >= 1 ? cell + 0.5 : cell * (0.45 + 0.5 * e)
          const x = c.x + c.sx * (1 - e) + (cell - s) / 2 + c.ox
          const y = c.y + c.sy * (1 - e) + (cell - s) / 2 + c.oy
          ctx.globalAlpha = Math.min(1, k * 2.5)
          ctx.drawImage(off, c.x * dpr, c.y * dpr, cell * dpr, cell * dpr, x, y, s, s)
          if (k < 1) {
            ctx.globalAlpha = (1 - e) * 0.55
            ctx.fillStyle = '#8fb5ff'
            ctx.fillRect(x, y, s, s)
          }
        }
        ctx.globalAlpha = 1
        moving = true
      }
      return moving || inside
    }

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 1 / 20)
      p += (target - p) * (1 - Math.exp(-dt * 4))
      if (Math.abs(target - p) < 0.001) p = target
      const busy = draw(dt)
      if (!busy && p === target) sleep()
    }
    const wake = () => {
      if (reduced || running || !visible || disposed || !off) return
      running = true
      gsap.ticker.add(tick)
    }
    const sleep = () => {
      if (!running) return
      running = false
      gsap.ticker.remove(tick)
    }

    const st = reduced ? null : ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      end: 'top 42%',
      onUpdate: (self) => { target = self.progress; wake() },
      onLeave: () => { target = 1; wake() },
    })
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) wake(); else sleep()
    })
    io.observe(el)
    const ro = new ResizeObserver(() => layout())
    const onMove = () => wake()
    const onDown = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      impulse = { x: e.clientX - r.left, y: e.clientY - r.top }
      wake()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)

    // only the natural size is needed here — pixels come from the off-thread bitmap (no main-thread decode)
    const loaded = new Promise<void>((res) => {
      if (img.complete && img.naturalWidth) res()
      else { img.onload = () => res(); img.onerror = () => res() }
    })
    loaded.then(() => {
      if (disposed) return
      schedulePrep(() => {
        if (disposed) return
        layout()
        ro.observe(el)
      })
    })

    return () => {
      disposed = true
      if (off && 'close' in off) off.close()
      sleep()
      st?.kill()
      io.disconnect()
      ro.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
    }
  }, [near, src, cropKey, focusKey, cell])

  return (
    // an empty alt marks the image as decorative: hide it rather than expose an unnamed role="img"
    <div
      ref={wrap}
      className={`voxel-image ${className}`}
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      data-cursor="Decompile"
    >
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  )
}
