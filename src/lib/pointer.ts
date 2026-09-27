import gsap from 'gsap'

/**
 * Shared input state for every interactive layer (WebGL hero, cursor, HUD).
 * One set of listeners; consumers read the mutable `pointer` object each frame.
 *
 * Coordinates are normalised viewport units, y-down (0,0 = top-left).
 */

export type Burst = { x: number; y: number; strength: number }

export const pointer = {
  x: 0.5,
  y: 0.5,
  /** smoothed velocity in viewport-units per second */
  vx: 0,
  vy: 0,
  clientX: -100,
  clientY: -100,
  /** ms timestamp of the last real pointer movement */
  lastMove: 0,
  hasFinePointer: false,
  /** device tilt, -1..1 (touch devices with a gyroscope) */
  tiltX: 0,
  tiltY: 0,
  hasTilt: false,
  bursts: [] as Burst[],
}

let bound = false
let lastT = 0

export function initPointer() {
  if (bound || typeof window === 'undefined') return
  bound = true
  pointer.hasFinePointer = window.matchMedia('(pointer: fine)').matches
  pointer.lastMove = -Infinity
  gsap.ticker.add(decayVelocity)

  window.addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now()
      const nx = e.clientX / window.innerWidth
      const ny = e.clientY / window.innerHeight
      const dt = Math.max((now - lastT) / 1000, 1 / 240)
      // exponential smoothing keeps velocity readable across irregular event rates
      pointer.vx += ((nx - pointer.x) / dt - pointer.vx) * 0.35
      pointer.vy += ((ny - pointer.y) / dt - pointer.vy) * 0.35
      pointer.x = nx
      pointer.y = ny
      pointer.clientX = e.clientX
      pointer.clientY = e.clientY
      pointer.lastMove = now
      lastT = now
    },
    { passive: true },
  )

  window.addEventListener(
    'pointerdown',
    (e) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      if (e.pointerType !== 'mouse') {
        pointer.x = x
        pointer.y = y
        pointer.clientX = e.clientX
        pointer.clientY = e.clientY
        // iOS shows a system dialog for motion access — only ask from taps on the scene itself,
        // never from a tap on a link or button (the dialog would hijack that tap)
        if (!(e.target as Element | null)?.closest?.('a, button, input, textarea, [role="button"]')) requestTiltPermission()
      }
      pointer.bursts.push({ x, y, strength: e.pointerType === 'mouse' ? 0.7 : 1 })
    },
    { passive: true },
  )

  window.addEventListener(
    'deviceorientation',
    (e) => {
      if (e.gamma == null || e.beta == null) return
      pointer.hasTilt = true
      pointer.tiltX = Math.max(-1, Math.min(1, e.gamma / 30))
      pointer.tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 30))
    },
    { passive: true },
  )
}

let askedTilt = false
function requestTiltPermission() {
  if (askedTilt) return
  askedTilt = true
  // iOS requires an explicit permission prompt from a user gesture
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
  DOE?.requestPermission?.().catch(() => {})
}

function decayVelocity(_time: number, deltaMs: number) {
  // velocity relaxes to zero when the pointer rests
  const k = Math.exp((-deltaMs / 1000) * 6)
  pointer.vx *= k
  pointer.vy *= k
}

/** ms since the pointer last moved */
export const pointerIdleFor = () => performance.now() - pointer.lastMove
