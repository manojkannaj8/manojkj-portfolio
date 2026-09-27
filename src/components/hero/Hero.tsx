import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { profile } from '../../content/profile'
import { isTouchDevice, useReducedMotion } from '../../lib/motion'
import { scramble } from '../../lib/scramble'
import { HeroScene, HERO_ART } from '../../webgl/hero/HeroScene'
import { setFigureProbe } from '../chrome/Cursor'
import { HeroStatus } from './HeroStatus'
import { HeroReadout } from './HeroReadout'
import { HeroChapters } from './HeroChapters'
import './Hero.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Chapter 01 — the hero. A tall section with a sticky stage: the first screen is the
 * interactive scene; the extra scroll length disperses the figure into voxels
 * before the next chapter takes over.
 */
export function Hero() {
  const reduced = useReducedMotion()
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const eyebrow = useRef<HTMLSpanElement>(null)
  const [fallback, setFallback] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // WebGL scene lifecycle
  useEffect(() => {
    const el = section.current!
    let scene: HeroScene
    try {
      scene = new HeroScene(canvas.current!, { wordmark: profile.wordmark, reducedMotion: reduced, onError: () => setFallback(true) })
    } catch {
      setFallback(true)
      setRevealed(true)
      return
    }
    setFigureProbe(scene.isFigureAt.bind(scene))
    if (import.meta.env.DEV) (window as unknown as { __hero: HeroScene }).__hero = scene
    const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting))
    io.observe(el)
    window.addEventListener('resize', scene.resize)
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => scene.setScroll(self.progress),
    })
    let intro: gsap.core.Timeline | undefined
    let disposed = false
    scene.ready
      .then(() => {
        if (disposed) return
        scene.start()
        intro = scene.playIntro(() => setRevealed(true)) ?? undefined
      })
      .catch(() => {
        if (disposed) return
        setFallback(true)
        setRevealed(true)
      })

    return () => {
      disposed = true
      intro?.kill()
      st.kill()
      io.disconnect()
      window.removeEventListener('resize', scene.resize)
      setFigureProbe(null)
      scene.destroy()
    }
  }, [reduced])

  // copy entrance, then scroll-linked exit
  useEffect(() => {
    if (!revealed) return
    const stop = scramble(eyebrow.current!, profile.heroEyebrow, { reduced })
    if (reduced) return stop
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero__line-inner', { yPercent: 115, filter: 'blur(8px)' }, { yPercent: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: 0.09 })
      gsap.fromTo('[data-reveal]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.35 })
      gsap.to('.hero__content', {
        yPercent: -18,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top top', end: '45% top', scrub: true },
      })
    }, section)
    return () => { stop(); ctx.revert() }
  }, [revealed, reduced])

  return (
    <section ref={section} id="top" className={`hero${revealed ? ' is-revealed' : ''}`} aria-label="Introduction">
      <div className="hero__stage">
        {fallback ? (
          <img className="hero__fallback" src={HERO_ART.src} alt="" width={HERO_ART.width} height={HERO_ART.height} />
        ) : (
          <canvas ref={canvas} className="hero__canvas" aria-hidden="true" />
        )}
        <div className="hero__scrim" aria-hidden="true" />

        <div className="hero__content">
          <HeroReadout />

          <div className="hero__copy">
            <p className="hero__eyebrow hud-label" data-reveal>
              <span className="sr-only">{profile.heroEyebrow}</span>
              <span ref={eyebrow} aria-hidden="true" />
            </p>
            <h1 className="hero__title">
              <span className="sr-only">{profile.name} — </span>
              {profile.heroHeadline.map((line, i) => (
                <span key={i} className={`hero__line${i === profile.heroHeadline.length - 1 ? ' is-dim' : ''}`}>
                  <span className="hero__line-inner">{line}</span>
                </span>
              ))}
            </h1>
            <p className="hero__lede" data-reveal>
              <strong>{profile.name}</strong> — {profile.tagline}
            </p>
          </div>

          <HeroChapters />
          <HeroStatus />

          <div className="hero__scroll" data-reveal aria-hidden="true">
            {!reduced && (
              <span className="hud-label hero__hint">{isTouchDevice() ? 'Tap to pulse · tilt to look' : 'Move to disrupt · click to pulse'}</span>
            )}
            <span className="hud-label">Scroll to decompile</span>
            <span className="hero__scroll-line" />
          </div>
        </div>
      </div>
    </section>
  )
}
