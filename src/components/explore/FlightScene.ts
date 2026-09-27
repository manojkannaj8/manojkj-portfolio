/**
 * Canvas 2D flight through ring-gates (Chapter 03 · Explore).
 *
 * World: +z is forward. A smooth lateral path runs through one gate per mission,
 * gates are `GAP` apart. The camera rides the path; scroll sets its z.
 * Everything is projected with a simple pinhole camera (no rotation needed:
 * gates face the camera, so they stay circles).
 */

export const GAP = 1600
export const GATE_R = 260
const NEAR = 40
const FAR = 4200
const TRAIL_STEP = 46

export type FlightState = {
  cz: number
  steerX: number
  steerY: number
  /** camera speed in world units / s — stars streak with it */
  speed: number
  time: number
  /** 0..1 flash after passing through a gate */
  flash: number
  flashColor: string
  /** index of the mission being shown (-1 = none) */
  active: number
}

type Projected = { x: number; y: number; k: number }

export type GateOptions = {
  color: string
  /** slightly larger gate with an outer ring and an accent dot */
  featured?: boolean
  /** ongoing role: a slow beacon pulse */
  current?: boolean
}

export class FlightScene {
  private ctx: CanvasRenderingContext2D
  private W = 1
  private H = 1
  private dpr = 1
  private f = 600
  private ox = 0.43
  private oy = 0.47
  private stars: Float32Array
  private ctrl: { z: number; x: number; y: number }[]
  readonly gateZ: number[]
  readonly zStart: number
  readonly zEnd: number
  private gates: GateOptions[]
  private reduced: boolean
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, gates: GateOptions[], reduced: boolean) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.gates = gates
    this.reduced = reduced
    const n = gates.length
    this.gateZ = gates.map((_, i) => i * GAP)
    // lateral path: gates alternate left/right, eased in and out by extra control points
    this.ctrl = [
      { z: -GAP * 2.2, x: 0, y: 0 },
      ...this.gateZ.map((z, i) => ({ z, x: (i % 2 ? 1 : -1) * 240, y: (i % 2 ? -60 : 70) })),
      { z: (n - 1) * GAP + GAP * 1.6, x: 0, y: -20 },
      { z: (n - 1) * GAP + GAP * 3.5, x: 0, y: 0 },
    ]
    this.zStart = -1500
    this.zEnd = (n - 1) * GAP + 500

    const count = window.matchMedia('(max-width: 759px)').matches ? 520 : 900
    this.stars = new Float32Array(count * 4)
    let seed = 11
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      this.stars[i * 4] = (rand() - 0.5) * 3600
      this.stars[i * 4 + 1] = (rand() - 0.5) * 2200
      this.stars[i * 4 + 2] = this.zStart - 400 + rand() * (this.zEnd - this.zStart + FAR + 400)
      this.stars[i * 4 + 3] = rand()
    }
  }

  private gateR(i: number) {
    return GATE_R * (this.gates[i]?.featured ? 1.14 : 1)
  }

  /** Dock position for a mission: in front of its gate, ring framing the view. */
  dockZ(i: number) {
    return this.gateZ[i] - 650
  }

  resize(cssW: number, cssH: number, wide: boolean) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.W = cssW
    this.H = cssH
    this.canvas.width = Math.round(cssW * this.dpr)
    this.canvas.height = Math.round(cssH * this.dpr)
    this.f = Math.min(cssW, cssH) * 0.95
    this.ox = wide ? 0.42 : 0.5
    this.oy = wide ? 0.48 : 0.4
  }

  /** Path lateral position at depth z (Catmull-Rom through the control points). */
  lateral(z: number) {
    const c = this.ctrl
    let k = 0
    while (k < c.length - 2 && z > c[k + 1].z) k++
    const p0 = c[Math.max(0, k - 1)], p1 = c[k], p2 = c[k + 1], p3 = c[Math.min(c.length - 1, k + 2)]
    const u = Math.min(1, Math.max(0, (z - p1.z) / (p2.z - p1.z)))
    const cr = (a: number, b: number, cc: number, d: number) =>
      0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u)
    return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) }
  }

  private camera(st: FlightState) {
    const l = this.lateral(st.cz)
    return { x: l.x + st.steerX * 150, y: l.y - 30 + st.steerY * 90, z: st.cz }
  }

  private project(x: number, y: number, z: number, cam: { x: number; y: number; z: number }): Projected | null {
    const dz = z - cam.z
    if (dz < NEAR) return null
    const k = this.f / dz
    return { x: this.W * this.ox + (x - cam.x) * k, y: this.H * this.oy + (y - cam.y) * k, k }
  }

  /** Screen placement of a gate for its DOM label; alpha 0 when not worth labelling. */
  gateScreen(i: number, st: FlightState) {
    const cam = this.camera(st)
    const z = this.gateZ[i]
    const l = this.lateral(z)
    const p = this.project(l.x, l.y, z, cam)
    if (!p) return { x: 0, y: 0, r: 0, alpha: 0 }
    const r = this.gateR(i) * p.k
    const dz = z - cam.z
    const maxDim = Math.max(this.W, this.H)
    const alpha = smooth(FAR, FAR * 0.55, dz) * (1 - smooth(0.34 * maxDim, 0.55 * maxDim, r))
    return { x: p.x, y: p.y, r, alpha }
  }

  render(st: FlightState) {
    const { ctx, W, H } = this
    const cam = this.camera(st)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    this.drawPlanet(st)

    // ── stars (streak with speed) ──
    const streak = this.reduced ? 0 : Math.min(360, Math.abs(st.speed) * 0.09) * Math.sign(st.speed || 1)
    const s = this.stars
    ctx.fillStyle = '#dfe7f5'
    ctx.strokeStyle = 'rgba(190, 210, 255, 0.55)'
    ctx.lineWidth = 1
    if (Math.abs(streak) > 6) ctx.beginPath()
    for (let i = 0; i < s.length; i += 4) {
      const z = s[i + 2]
      const dz = z - cam.z
      if (dz < NEAR || dz > FAR) continue
      const p = this.project(s[i], s[i + 1], z, cam)!
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue
      const depth = 1 - dz / FAR
      if (Math.abs(streak) > 6) {
        const q = this.project(s[i], s[i + 1], z + streak, cam)
        if (q) { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y) }
      } else {
        const tw = this.reduced ? 1 : 0.6 + 0.4 * Math.sin(st.time * (1 + s[i + 3] * 2) + s[i + 3] * 40)
        ctx.globalAlpha = depth * depth * tw
        const size = Math.min(2.4, 0.6 + p.k * 2.2)
        ctx.fillRect(p.x, p.y, size, size)
      }
    }
    if (Math.abs(streak) > 6) ctx.stroke()
    ctx.globalAlpha = 1

    // ── voxel trail along the path ──
    const first = Math.ceil((cam.z + NEAR + 10) / TRAIL_STEP) * TRAIL_STEP
    ctx.fillStyle = '#8fb5ff'
    for (let z = first; z < cam.z + FAR; z += TRAIL_STEP) {
      const l = this.lateral(z)
      const p = this.project(l.x, l.y + 40, z, cam)
      if (!p) continue
      const dz = z - cam.z
      const a = Math.pow(1 - dz / FAR, 1.6)
      const size = Math.max(1, Math.min(7, p.k * 9))
      const pulse = this.reduced ? 1 : 0.55 + 0.45 * Math.sin(z * 0.012 - st.time * 3)
      ctx.globalAlpha = a * pulse * 0.9
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
    }
    ctx.globalAlpha = 1

    // ── gates, far to near ──
    const maxDim = Math.max(W, H)
    for (let i = this.gateZ.length - 1; i >= 0; i--) {
      const z = this.gateZ[i]
      const dz = z - cam.z
      if (dz < NEAR || dz > FAR) continue
      const l = this.lateral(z)
      const p = this.project(l.x, l.y, z, cam)!
      const r = this.gateR(i) * p.k
      if (r > maxDim * 1.6) continue
      const alpha = smooth(FAR, FAR * 0.6, dz) * (1 - smooth(maxDim * 0.9, maxDim * 1.6, r))
      this.drawGate(p.x, p.y, r, this.gates[i], alpha, st, i === st.active)
    }

    // ── gate-crossing flash ──
    if (st.flash > 0.01) {
      const g = ctx.createRadialGradient(W * this.ox, H * this.oy, Math.min(W, H) * 0.25, W * this.ox, H * this.oy, maxDim * 0.75)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, st.flashColor)
      ctx.globalAlpha = st.flash * 0.45
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
  }

  private drawGate(x: number, y: number, r: number, gate: GateOptions, alpha: number, st: FlightState, active: boolean) {
    const { ctx } = this
    const { color } = gate
    ctx.save()
    ctx.strokeStyle = color
    // glow
    ctx.globalAlpha = alpha * 0.12
    ctx.lineWidth = Math.max(2, r * 0.06)
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    // ring
    ctx.globalAlpha = alpha * (active ? 1 : 0.8)
    ctx.lineWidth = Math.max(1, Math.min(2.4, r * 0.012))
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    // HUD ticks
    ctx.globalAlpha = alpha * 0.45
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let t = 0; t < 48; t++) {
      const a = (t / 48) * Math.PI * 2
      const r1 = r * (t % 4 === 0 ? 1.07 : 1.09), r2 = r * 1.12
      ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1)
      ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2)
    }
    ctx.stroke()
    // rotating arc segments
    const rot = this.reduced ? 0.6 : st.time * 0.5
    ctx.globalAlpha = alpha
    ctx.lineWidth = Math.max(1.5, Math.min(4, r * 0.02))
    for (let k = 0; k < 3; k++) {
      const a0 = rot + (k * Math.PI * 2) / 3
      ctx.beginPath(); ctx.arc(x, y, r * 0.93, a0, a0 + 0.5); ctx.stroke()
    }

    // featured: faint dashed outer ring + an accent dot on the rim
    if (gate.featured) {
      ctx.globalAlpha = alpha * 0.4
      ctx.lineWidth = 1
      ctx.setLineDash([Math.max(2, r * 0.02), Math.max(4, r * 0.04)])
      ctx.beginPath(); ctx.arc(x, y, r * 1.2, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      const a = Math.PI * 0.25
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.max(2.5, r * 0.035), 0, Math.PI * 2); ctx.fill()
    }

    // current role: a slow beacon expanding from the ring
    if (gate.current) {
      ctx.lineWidth = 1.2
      for (let k = 0; k < 2; k++) {
        const ph = this.reduced ? 0.35 + k * 0.3 : (st.time * 0.3 + k * 0.5) % 1
        ctx.globalAlpha = alpha * (1 - ph) * 0.45
        ctx.beginPath(); ctx.arc(x, y, r * (1.02 + ph * 0.45), 0, Math.PI * 2); ctx.stroke()
      }
    }
    ctx.restore()
  }

  /** Distant ringed planet — a quiet nod to the hero's earth + orbit ring. */
  private drawPlanet(st: FlightState) {
    const { ctx, W, H } = this
    const progress = (st.cz - this.zStart) / (this.zEnd - this.zStart)
    const R = Math.min(W, H) * (0.07 + progress * 0.03)
    const x = W * 0.82 - st.steerX * 18
    const y = H * 0.2 - st.steerY * 12
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R)
    g.addColorStop(0, 'rgba(60, 86, 130, 0.55)')
    g.addColorStop(0.6, 'rgba(18, 26, 42, 0.5)')
    g.addColorStop(1, 'rgba(6, 8, 12, 0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(143, 181, 255, 0.28)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.ellipse(x, y, R * 1.8, R * 0.42, -0.35, 0, Math.PI * 2); ctx.stroke()
  }
}

function smooth(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
