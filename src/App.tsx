import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { initPointer } from './lib/pointer'
import { setLenis } from './lib/scroll'
import { useReducedMotion } from './lib/motion'
import { Cursor } from './components/chrome/Cursor'
import { Nav } from './components/chrome/Nav'
import { Hero } from './components/hero/Hero'
import { Learn } from './components/learn/Learn'
import { Build } from './components/build/Build'
import { Explore } from './components/explore/Explore'
import { Evolve } from './components/evolve/Evolve'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const reduced = useReducedMotion()

  useEffect(() => { initPointer() }, [])

  // smooth scroll, synced to GSAP's ticker so WebGL + ScrollTrigger share one clock
  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true })
    setLenis(lenis)
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(raf); setLenis(null); lenis.destroy() }
  }, [reduced])

  return (
    <>
      <a className="sr-only" href="#main">Skip to content</a>
      <Cursor />
      <Nav />
      <main id="main">
        <Hero />
        <Learn />
        <Build />
        <Explore />
        <Evolve />
      </main>
    </>
  )
}
