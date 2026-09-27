/**
 * Marks animation scopes (chapters, Evolve releases, the finale) with `data-offscreen` while they
 * are out of view. global.css pauses every CSS animation inside them, and JS timers can check
 * `isOffscreen(el)` to skip work. Invisible by design: scopes resume 200px before they appear.
 * (Found by the mobile audit: dozens of infinite animations kept ticking off-screen, costing
 * style/paint work every frame and dirtying layout for every other section.)
 */
const SCOPES = 'main > section, .release, .finale'

export function watchAnimationScopes() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.toggleAttribute('data-offscreen', !e.isIntersecting)),
    { rootMargin: '200px 0px' },
  )
  document.querySelectorAll(SCOPES).forEach((el) => io.observe(el))
  return () => io.disconnect()
}

export const isOffscreen = (el: Element | null | undefined) => !!el?.closest('[data-offscreen]')
