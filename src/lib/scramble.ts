const GLYPHS = '<>/_-=+*#01'

/**
 * Decode-style text reveal: characters resolve left→right out of HUD glyph noise.
 * Keep the real text available to assistive tech separately (the target should be aria-hidden).
 */
export function scramble(el: HTMLElement, text: string, { duration = 0.9, reduced = false } = {}) {
  if (reduced) {
    el.textContent = text
    return () => {}
  }
  const start = performance.now()
  let raf = 0
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / (duration * 1000))
    let out = ''
    for (let i = 0; i < text.length; i++) {
      const settled = i / text.length < p * 1.25 - 0.25
      out += settled || text[i] === ' ' ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    el.textContent = out
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
