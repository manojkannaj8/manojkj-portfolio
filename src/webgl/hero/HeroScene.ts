import gsap from 'gsap'
import { pointer, pointerIdleFor } from '../../lib/pointer'
import { createProgram, createRenderTarget, createTexture, deleteRenderTarget, loadImage, type RenderTarget, type Uniforms } from '../gl'
import { FULLSCREEN_VS, SCENE_FS, TRAIL_FS, VOXEL_FS, VOXEL_VS } from './shaders'

/**
 * Facts about the hero artwork. If the image is replaced, regenerate the assets
 * (tools/make_depth.py, tools/clean_plate.py — original lives in /art) and update these.
 */
export const HERO_ART = {
  /** original artwork with its baked lettering painted out (re-created as live type) */
  src: '/hero/hero-plate.webp',
  depth: '/hero/hero-depth.png',
  width: 1366,
  height: 1151,
  /** point on the artwork that should stay framed (the visor) */
  focus: { x: 0.56, y: 0.32 },
  /** glowing orbit ring behind the head: centre + radius in image px */
  ring: [667.4, 699.3, 437.2] as const,
  /** voxel size in image px */
  cell: 9,
}

type Options = {
  wordmark: string
  reducedMotion: boolean
  onError?: (err: unknown) => void
}

const IMG_ASPECT = HERO_ART.width / HERO_ART.height
const SHOCK_LIFE = 0.9 // seconds
/** at or above this aspect the figure sits right-of-centre; below it, copy stacks under the figure (keep in sync with Hero.css) */
const WIDE_ASPECT = 1.25

export class HeroScene {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private opts: Options
  private scene!: { program: WebGLProgram; uniforms: Uniforms }
  private trail!: { program: WebGLProgram; uniforms: Uniforms }
  private voxel!: { program: WebGLProgram; uniforms: Uniforms }
  private quadVao!: WebGLVertexArrayObject
  private voxelVao!: WebGLVertexArrayObject
  private voxelCount = 0
  private tex: Record<'img' | 'depth' | 'word', WebGLTexture | null> = { img: null, depth: null, word: null }
  private rt: [RenderTarget, RenderTarget] | null = null
  private halfFloat = false
  private depthData: Uint8ClampedArray | null = null

  private dpr = 1
  private rect = [0, 0, 1, 1]
  private wordRect = [0, 0, 1, 1]
  private wordAspect = 4
  private running = false
  private destroyed = false
  private visible = true
  private time = 0
  private lastTrail = { x: 0.5, y: 0.5 }
  private shock: { x: number; y: number; age: number; strength: number } | null = null

  /** animated values; tweened by GSAP or driven by input */
  readonly state = { intro: 0, wordIn: 0, scroll: 0, tiltX: 0, tiltY: 0, light: 0, lightX: 0.6, lightY: 0.35, velX: 0, velY: 0 }

  readonly ready: Promise<void>

  constructor(canvas: HTMLCanvasElement, opts: Options) {
    this.canvas = canvas
    this.opts = opts
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', premultipliedAlpha: false })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    this.halfFloat = !!gl.getExtension('EXT_color_buffer_float')
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    this.ready = this.init()
  }

  private async init() {
    const { gl } = this
    const [img, depth] = await Promise.all([loadImage(HERO_ART.src), loadImage(HERO_ART.depth), document.fonts.ready])
    await document.fonts.load('800 200px "Unbounded Variable"').catch(() => {})
    if (this.destroyed) throw new Error('HeroScene destroyed during init')

    this.tex.img = createTexture(gl, img, { mipmaps: true })
    this.tex.depth = createTexture(gl, depth)
    this.tex.word = createTexture(gl, this.drawWordmark(), { mipmaps: true })
    this.depthData = readPixels(depth)

    this.scene = createProgram(gl, FULLSCREEN_VS, SCENE_FS)
    this.trail = createProgram(gl, FULLSCREEN_VS, TRAIL_FS)
    this.voxel = createProgram(gl, VOXEL_VS, VOXEL_FS)

    // full-screen triangle
    this.quadVao = gl.createVertexArray()!
    gl.bindVertexArray(this.quadVao)
    bindAttrib(gl, new Float32Array([-1, -1, 3, -1, -1, 3]))

    // one point per voxel cell
    const cols = Math.ceil(HERO_ART.width / HERO_ART.cell)
    const rows = Math.ceil(HERO_ART.height / HERO_ART.cell)
    const cells = new Float32Array(cols * rows * 2)
    for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++) { cells[i++] = x; cells[i++] = y }
    this.voxelCount = cols * rows
    this.voxelVao = gl.createVertexArray()!
    gl.bindVertexArray(this.voxelVao)
    bindAttrib(gl, cells)
    gl.bindVertexArray(null)

    this.resize()
    if (this.opts.reducedMotion) {
      Object.assign(this.state, { intro: 1, wordIn: 1 })
      this.render(0)
    }
  }

  /** White-on-black wordmark, sampled as a coverage mask in the scene shader. */
  private drawWordmark() {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    const text = this.opts.wordmark.toUpperCase()
    const font = (px: number) => `800 ${px}px "Unbounded Variable", "Arial Black", sans-serif`
    ctx.font = font(400)
    const m = ctx.measureText(text)
    const size = Math.floor((400 * 1900) / m.width)
    c.width = 2048
    ctx.font = font(size)
    const mm = ctx.measureText(text)
    const asc = mm.actualBoundingBoxAscent
    const desc = mm.actualBoundingBoxDescent
    const pad = size * 0.12
    c.height = Math.ceil(asc + desc + pad * 2)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.font = font(size)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(text, c.width / 2, pad + asc)
    this.wordAspect = c.width / c.height
    return c
  }

  resize = () => {
    const { gl, canvas } = this
    const coarse = window.matchMedia('(pointer: coarse)').matches
    this.dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5)
    const cssW = canvas.clientWidth || window.innerWidth
    const cssH = canvas.clientHeight || window.innerHeight
    const W = Math.round(cssW * this.dpr)
    const H = Math.round(cssH * this.dpr)
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W
      canvas.height = H
    }

    // frame the artwork: landscape keeps you right-of-centre so copy can breathe on the left
    let w: number, h: number, x: number, y: number
    const wide = W / H >= WIDE_ASPECT
    if (wide) {
      h = H * 1.08
      w = h * IMG_ASPECT
      if (w < W * 0.62) { w = W * 0.62; h = w / IMG_ASPECT }
      x = W * 0.6 - HERO_ART.focus.x * w
      if (x + w < W) x = W - w
      y = -H * 0.03
    } else {
      // stacked: pull back so the wordmark and ring breathe around the head
      w = Math.max(W * 1.55, Math.min(H * 0.8 * IMG_ASPECT, W * 2.2))
      h = w / IMG_ASPECT
      x = W * 0.5 - (HERO_ART.focus.x - 0.02) * w
      y = H * 0.06
    }
    this.rect = [x, y, w, h]

    const ww = wide ? 0.9 : 0.94
    const wh = (ww * W) / this.wordAspect / H
    const wy = wide ? 0.25 : 0.12
    this.wordRect = [(1 - ww) / 2, wy - wh / 2, ww, wh]

    // trail buffer at ~¼ resolution
    const tw = Math.min(512, Math.round(cssW / 3))
    const th = Math.max(1, Math.round((tw * H) / W))
    if (!this.rt || this.rt[0].w !== tw || this.rt[0].h !== th) {
      if (this.rt) this.rt.forEach((r) => deleteRenderTarget(gl, r))
      this.rt = [createRenderTarget(gl, tw, th, this.halfFloat), createRenderTarget(gl, tw, th, this.halfFloat)]
    }
    if (this.opts.reducedMotion && this.tex.img) this.render(0)
  }

  playIntro(onReveal?: () => void) {
    if (this.opts.reducedMotion) { onReveal?.(); return }
    const tl = gsap.timeline()
    tl.to(this.state, { intro: 1, duration: 2.8, ease: 'power2.inOut' }, 0)
    tl.to(this.state, { wordIn: 1, duration: 1.6, ease: 'power3.out' }, 1.0)
    tl.call(() => onReveal?.(), [], 1.3)
    return tl
  }

  setScroll(p: number) {
    // reduced motion: the figure stays intact while scrolling
    if (!this.opts.reducedMotion) this.state.scroll = p
  }

  setVisible(v: boolean) {
    this.visible = v
    this.syncLoop()
  }

  start() {
    if (this.destroyed) return
    this.running = true
    this.syncLoop()
  }

  private looping = false
  private syncLoop() {
    const should = this.running && this.visible && !this.opts.reducedMotion
    if (should && !this.looping) { gsap.ticker.add(this.tick); this.looping = true }
    if (!should && this.looping) { gsap.ticker.remove(this.tick); this.looping = false }
  }

  /** Is the given viewport point over the figure (not the background)? */
  isFigureAt(clientX: number, clientY: number) {
    if (!this.depthData) return false
    const [x, y, w, h] = this.rect
    const u = (clientX * this.dpr - x) / w
    const v = (clientY * this.dpr - y) / h
    if (u < 0 || u > 1 || v < 0 || v > 1) return false
    const dw = Math.round(HERO_ART.width / 2)
    const dh = Math.round(HERO_ART.height / 2)
    const i = (Math.floor(v * (dh - 1)) * dw + Math.floor(u * (dw - 1))) * 4
    return this.depthData[i] / 255 > 0.18
  }

  private tick = (_t: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 1 / 20)
    this.time += dt
    const s = this.state
    const mouseActive = pointer.hasFinePointer && pointerIdleFor() < 3500

    // parallax driver: mouse → gyro → gentle autonomous drift
    let tx: number, ty: number
    if (pointer.hasFinePointer) {
      tx = (pointer.x - 0.5) * 2
      ty = (pointer.y - 0.5) * 2
    } else if (pointer.hasTilt) {
      tx = pointer.tiltX
      ty = pointer.tiltY
    } else {
      tx = Math.sin(this.time * 0.35) * 0.5
      ty = Math.cos(this.time * 0.27) * 0.3 + s.scroll
    }
    const k = 1 - Math.exp(-dt * 3.5)
    s.tiltX += (tx - s.tiltX) * k
    s.tiltY += (ty - s.tiltY) * k

    // light: follows the mouse; on touch it orbits the visor
    const lx = mouseActive ? pointer.x : 0.58 + Math.cos(this.time * 0.5) * 0.18
    const ly = mouseActive ? pointer.y : 0.32 + Math.sin(this.time * 0.5) * 0.12
    const kl = 1 - Math.exp(-dt * 8)
    s.lightX += (lx - s.lightX) * kl
    s.lightY += (ly - s.lightY) * kl
    const lightTarget = mouseActive ? 1 : pointer.hasFinePointer ? 0.25 : 0.6
    s.light += (lightTarget - s.light) * (1 - Math.exp(-dt * 2))

    const kv = 1 - Math.exp(-dt * 5)
    s.velX += (pointer.vx - s.velX) * kv
    s.velY += (pointer.vy - s.velY) * kv

    this.render(dt)
  }

  private render(dt: number) {
    const { gl } = this
    if (!this.rt || !this.tex.img) return
    const s = this.state
    const W = this.canvas.width
    const H = this.canvas.height
    const aspect = W / H
    const [rtA, rtB] = this.rt

    // ── 1. trail ──
    const bx = pointer.x, by = 1 - pointer.y
    let ax = this.lastTrail.x, ay = this.lastTrail.y
    const seg = Math.hypot((bx - ax) * aspect, by - ay)
    if (seg > 0.3) { ax = bx; ay = by } // pointer re-entered: no streak across the screen
    const burst = pointer.bursts.shift()
    if (burst && !this.opts.reducedMotion) this.shock = { x: burst.x, y: 1 - burst.y, age: 0, strength: burst.strength }
    const sh = this.shock
    if (sh) {
      sh.age += dt
      if (sh.age > SHOCK_LIFE) this.shock = null
    }
    this.lastTrail = { x: bx, y: by }
    const vlen = Math.hypot(s.velX, s.velY) || 1

    gl.bindFramebuffer(gl.FRAMEBUFFER, rtB.fbo)
    gl.viewport(0, 0, rtB.w, rtB.h)
    gl.disable(gl.BLEND)
    gl.useProgram(this.trail.program)
    const tu = this.trail.uniforms
    bindTex(gl, 0, rtA.tex, tu.uPrev)
    gl.uniform2f(tu.uA, ax, ay)
    gl.uniform2f(tu.uB, bx, by)
    gl.uniform2f(tu.uVelIn, s.velX / vlen, -s.velY / vlen)
    gl.uniform1f(tu.uStrength, this.opts.reducedMotion ? 0 : Math.min(0.9, seg * 40))
    gl.uniform1f(tu.uRadius, 0.05)
    gl.uniform1f(tu.uDecay, Math.pow(0.955, dt * 60))
    gl.uniform1f(tu.uAspect, aspect)
    if (sh) {
      const t = sh.age / SHOCK_LIFE
      gl.uniform4f(tu.uBurst, sh.x, sh.y, 0.02 + (1 - (1 - t) ** 3) * 0.5, sh.strength * 0.35 * (1 - t))
    } else gl.uniform4f(tu.uBurst, 0, 0, 0, 0)
    gl.bindVertexArray(this.quadVao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    this.rt = [rtB, rtA]

    // scroll pushes the camera slightly into the scene
    const zoom = 1 + s.scroll * 0.12
    const [rx, ry, rw, rh] = this.rect
    const fx = rx + rw * HERO_ART.focus.x
    const fy = ry + rh * HERO_ART.focus.y
    const rect = [fx - (fx - rx) * zoom, fy - (fy - ry) * zoom, rw * zoom, rh * zoom]

    // ── 2. scene ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)
    gl.useProgram(this.scene.program)
    const u = this.scene.uniforms
    this.setCommon(u, rect, rtB.tex)
    bindTex(gl, 3, this.tex.word!, u.uWord)
    gl.uniform4f(u.uWordRect, this.wordRect[0], this.wordRect[1], this.wordRect[2], this.wordRect[3])
    gl.uniform2f(u.uVel, s.velX, s.velY)
    gl.uniform2f(u.uLightPos, s.lightX, s.lightY)
    gl.uniform1f(u.uLight, s.light * s.intro)
    gl.uniform1f(u.uWordIn, s.wordIn)
    gl.uniform3f(u.uRing, HERO_ART.ring[0], HERO_ART.ring[1], HERO_ART.ring[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // ── 3. voxels ──
    if (!this.opts.reducedMotion) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(this.voxel.program)
      this.setCommon(this.voxel.uniforms, rect, rtB.tex)
      gl.bindVertexArray(this.voxelVao)
      gl.drawArrays(gl.POINTS, 0, this.voxelCount)
      gl.disable(gl.BLEND)
    }
    gl.bindVertexArray(null)
  }

  private setCommon(u: Uniforms, rect: number[], trailTex: WebGLTexture) {
    const { gl } = this
    const s = this.state
    bindTex(gl, 0, this.tex.img!, u.uImg)
    bindTex(gl, 1, this.tex.depth!, u.uDepth)
    bindTex(gl, 2, trailTex, u.uTrail)
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height)
    gl.uniform4f(u.uRect, rect[0], rect[1], rect[2], rect[3])
    gl.uniform2f(u.uImgSize, HERO_ART.width, HERO_ART.height)
    gl.uniform1f(u.uCell, HERO_ART.cell)
    gl.uniform2f(u.uTilt, this.opts.reducedMotion ? 0 : s.tiltX, this.opts.reducedMotion ? 0 : s.tiltY)
    gl.uniform1f(u.uTime, this.time)
    gl.uniform1f(u.uIntro, s.intro)
    gl.uniform1f(u.uScroll, s.scroll)
    gl.uniform1f(u.uIdle, this.opts.reducedMotion ? 0 : 1)
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    this.running = false
    this.syncLoop()
    this.opts.onError?.(new Error('WebGL context lost'))
  }

  destroy() {
    this.destroyed = true
    this.running = false
    this.syncLoop()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    const { gl } = this
    Object.values(this.tex).forEach((t) => t && gl.deleteTexture(t))
    this.rt?.forEach((r) => deleteRenderTarget(gl, r))
    ;[this.scene, this.trail, this.voxel].forEach((p) => p && gl.deleteProgram(p.program))
  }
}

function bindTex(gl: WebGL2RenderingContext, unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null | undefined) {
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  if (loc) gl.uniform1i(loc, unit)
}

/** Every vertex shader here declares its single vec2 input at location 0. */
function bindAttrib(gl: WebGL2RenderingContext, data: Float32Array) {
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
}

function readPixels(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, c.width, c.height).data
}
