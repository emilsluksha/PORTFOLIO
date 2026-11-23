import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, ArrowRight } from 'lucide-react'
import {
  AURA_COLOR_ORDER,
  AURA_FINISHES,
  AURA_PERFORMANCE_METRICS,
} from '../data/finishes'
import { sceneBridge } from '../three/sceneBridge'
import type { AuraColorId, NavSection } from '../types/aura'
import { MagneticButton } from './MagneticButton'

gsap.registerPlugin(ScrollTrigger)

interface HomeViewProps {
  selectedColor: AuraColorId
  introReady: boolean
  reducedMotion: boolean
  onSelectColor: (color: AuraColorId) => void
  onExplore: () => void
  onGoOrder: () => void
  onActiveSectionChange: (section: NavSection) => void
}

export function HomeView({
  selectedColor,
  introReady,
  reducedMotion,
  onSelectColor,
  onExplore,
  onGoOrder,
  onActiveSectionChange,
}: HomeViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const theme = AURA_FINISHES[selectedColor]

  // Bind smooth GSAP ScrollTrigger timeline to drive 3D choreography + subtle editorial text reveals
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ctx = gsap.context(() => {
      // Master non-hijacking scroll progress tracker for the persistent 3D laptop
      ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
        onUpdate: (self) => {
          sceneBridge.scrollProgress = self.progress
          if (self.progress > 0.1) {
            onActiveSectionChange('explore')
          } else {
            onActiveSectionChange('home')
          }
        },
      })

      // Subtle staggered editorial reveals for storytelling sections (stable once revealed)
      if (!reducedMotion) {
        const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal-block]')
        blocks.forEach((block) => {
          gsap.fromTo(
            block,
            { opacity: 0.45, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: block.parentElement || block,
                start: 'top 86%',
                toggleActions: 'play none none none',
                once: true,
              },
            }
          )
        })
      }
    }, container)

    ScrollTrigger.refresh()

    return () => {
      ctx.revert()
    }
  }, [onActiveSectionChange, reducedMotion])

  return (
    <main
      ref={containerRef}
      id="aura-home-main"
      className="relative z-20 pointer-events-none"
    >
      {/* ============================================================
          HERO SECTION — CINEMATIC FIRST IMPRESSION
         ============================================================ */}
      <section
        id="hero"
        className="relative flex min-h-[100svh] items-end lg:items-center mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 pb-14 lg:pb-0 pt-24"
      >
        <div className="pointer-events-auto w-full max-w-[540px] lg:max-w-[520px]">
          <motion.p
            initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
            animate={{ opacity: introReady ? 1 : 0, y: introReady ? 0 : 14 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="aura-eyebrow text-white/55 mb-5"
          >
            AURA ONE · {theme.name}
          </motion.p>

          {/* Masked luxury text reveal */}
          <div className="overflow-hidden">
            <motion.h1
              id="hero-headline"
              initial={{ opacity: 0, y: reducedMotion ? 0 : '105%' }}
              animate={{ opacity: introReady ? 1 : 0, y: introReady ? '0%' : '105%' }}
              transition={{ duration: 0.95, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="aura-headline text-[2.65rem] sm:text-[3.75rem] lg:text-[4.5rem] text-white"
            >
              Power, in its purest form.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
            animate={{ opacity: introReady ? 1 : 0, y: introReady ? 0 : 18 }}
            transition={{ duration: 0.85, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 text-[1.02rem] sm:text-[1.125rem] leading-[1.6] text-white/68 max-w-[430px] font-light"
          >
            Meet the next generation of beautifully engineered performance.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
            animate={{ opacity: introReady ? 1 : 0, y: introReady ? 0 : 18 }}
            transition={{ duration: 0.8, delay: 0.64, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3.5"
          >
            <MagneticButton
              id="hero-explore-btn"
              variant="primary"
              size="lg"
              onClick={onExplore}
            >
              Explore AURA
              <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </MagneticButton>

            <MagneticButton
              id="hero-order-btn"
              variant="secondary"
              size="lg"
              onClick={onGoOrder}
            >
              Order Now
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </MagneticButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: introReady ? 1 : 0 }}
            transition={{ duration: 0.9, delay: 0.95 }}
            className="mt-10 hidden lg:flex items-center gap-3 text-[0.75rem] tracking-[0.04em] text-white/40"
          >
            <span className="h-px w-6 bg-white/25" />
            <span>Drag laptop to rotate · Double-click to reset view</span>
          </motion.div>
        </div>

        {/* Minimal scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: introReady ? 1 : 0 }}
          transition={{ duration: 0.9, delay: 1.05 }}
          className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-white/35"
          aria-hidden="true"
        >
          <span className="text-[0.65rem] tracking-[0.26em] uppercase">Scroll</span>
          <span className="h-7 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </motion.div>
      </section>

      {/* ============================================================
          SECTION 1 — PRECISION ENGINEERED
         ============================================================ */}
      <section
        id="explore"
        className="relative flex min-h-[100svh] items-end lg:items-center justify-end mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-24"
      >
        <div
          data-reveal-block
          className="pointer-events-auto w-full max-w-[460px] lg:mr-6 rounded-3xl lg:rounded-none bg-black/25 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-6 sm:p-8 lg:p-0 border border-white/[0.06] lg:border-0"
        >
          <p className="aura-eyebrow text-white/50 mb-4">01 / Precision Engineered</p>
          <h2 className="aura-headline text-[2.25rem] sm:text-[3.1rem] lg:text-[3.6rem] text-white">
            Every detail matters.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-[1.7] text-white/65 font-light">
            Carved from a single block of aerospace-grade aluminum and micro-bead-blasted for a
            silky matte finish. Every bevel, Thunderbolt port, and thermal channel is machined to
            sub-millimeter precision.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/[0.1] pt-6">
            <div>
              <p className="font-display text-[1.25rem] sm:text-[1.45rem] font-medium text-white">
                11.4 mm
              </p>
              <p className="mt-1 text-[0.72rem] text-white/45">Thin profile</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] sm:text-[1.45rem] font-medium text-white">
                1.24 kg
              </p>
              <p className="mt-1 text-[0.72rem] text-white/45">Featherweight</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] sm:text-[1.45rem] font-medium text-white">
                0.02 mm
              </p>
              <p className="mt-1 text-[0.72rem] text-white/45">CNC tolerance</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — BEAUTIFUL FROM EVERY ANGLE
         ============================================================ */}
      <section
        id="section-angles"
        className="relative flex min-h-[100svh] items-end lg:items-center justify-start mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-24"
      >
        <div
          data-reveal-block
          className="pointer-events-auto w-full max-w-[460px] rounded-3xl lg:rounded-none bg-black/25 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-6 sm:p-8 lg:p-0 border border-white/[0.06] lg:border-0"
        >
          <p className="aura-eyebrow text-white/50 mb-4">02 / Architectural Form</p>
          <h2 className="aura-headline text-[2.25rem] sm:text-[3.1rem] lg:text-[3.6rem] text-white">
            Designed to be admired.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-[1.7] text-white/65 font-light">
            A concealed dual-barrel clutch hinge lets AURA ONE lift effortlessly with one finger,
            revealing an acoustic micro-perforated deck, backlit sculpted keys, and a wide etched
            glass haptic trackpad.
          </p>

          <div className="mt-8 space-y-3 border-t border-white/[0.1] pt-6 text-[0.84rem] text-white/70">
            <div className="flex items-center justify-between">
              <span>Articulated Clutch Hinge</span>
              <span className="text-white/40">130° balanced resistance</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Acoustic Array</span>
              <span className="text-white/40">6-speaker spatial chamber</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Force-Touch Surface</span>
              <span className="text-white/40">Diamond-cut satin glass</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — FOUR EXPRESSIONS (INTERACTIVE LIVE 3D SHOWCASE)
         ============================================================ */}
      <section
        id="section-expressions"
        className="relative flex min-h-[105svh] flex-col justify-end mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 pb-20 pt-32"
      >
        <div data-reveal-block className="pointer-events-auto mx-auto w-full max-w-[980px] text-center">
          <p className="aura-eyebrow text-white/50 mb-3.5">03 / Four Expressions</p>
          <h2 className="aura-headline text-[2.25rem] sm:text-[3.2rem] lg:text-[3.75rem] text-white">
            Your color. Your statement.
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-[0.96rem] leading-relaxed text-white/62 font-light">
            Identical sculptural geometry. Four bespoke anodized finishes—each paired with its own
            living OLED wallpaper and coordinated studio atmosphere. Select any finish to experience
            the transformation live.
          </p>

          {/* Interactive 4-finish selector bar */}
          <div className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {AURA_COLOR_ORDER.map((colorId) => {
              const finish = AURA_FINISHES[colorId]
              const isSelected = selectedColor === colorId
              return (
                <button
                  key={colorId}
                  id={`home-finish-card-${colorId}`}
                  type="button"
                  onClick={() => onSelectColor(colorId)}
                  aria-pressed={isSelected}
                  className={`group flex flex-col items-start text-left rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-400 border backdrop-blur-md ${
                    isSelected
                      ? 'bg-white/[0.085] border-white/[0.26] shadow-[0_18px_50px_rgba(0,0,0,0.3)]'
                      : 'bg-black/25 border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.18]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-3.5">
                    <span
                      className="h-7 w-7 rounded-full transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: finish.swatchGradient,
                        boxShadow:
                          'inset 0 1px 1.5px rgba(255,255,255,0.42), inset 0 -2px 4px rgba(0,0,0,0.45)',
                      }}
                    />
                    <span
                      className={`text-[0.65rem] tracking-[0.2em] uppercase transition-opacity duration-300 ${
                        isSelected ? 'text-white/90 opacity-100' : 'text-white/35 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected ? 'Active' : 'Preview'}
                    </span>
                  </div>
                  <p className="font-display text-[0.95rem] font-medium text-white">
                    {finish.name}
                  </p>
                  <p className="mt-1 text-[0.75rem] leading-snug text-white/52 line-clamp-2">
                    {finish.tagline}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — PERFORMANCE MEETS ELEGANCE
         ============================================================ */}
      <section
        id="section-performance"
        className="relative flex min-h-[100svh] items-end lg:items-center justify-end mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 py-24"
      >
        <div
          data-reveal-block
          className="pointer-events-auto w-full max-w-[500px] lg:mr-4 rounded-3xl lg:rounded-none bg-black/30 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-6 sm:p-8 lg:p-0 border border-white/[0.06] lg:border-0"
        >
          <p className="aura-eyebrow text-white/50 mb-4">04 / Performance Meets Elegance</p>
          <h2 className="aura-headline text-[2.25rem] sm:text-[3.1rem] lg:text-[3.6rem] text-white">
            Built for everything.
          </h2>
          <p className="mt-5 text-[0.98rem] leading-[1.7] text-white/65 font-light">
            Beneath its tranquil exterior lives the custom AURA M4 neural silicon—delivering
            effortless creative power across an illuminated 14.5-inch Tandem OLED display with
            whisper-silent acoustics.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/[0.1] pt-7">
            {AURA_PERFORMANCE_METRICS.map((metric) => (
              <div key={metric.label}>
                <p className="font-display text-[1.55rem] sm:text-[1.85rem] font-medium tracking-[-0.03em] text-white">
                  {metric.value}
                </p>
                <p className="mt-1 text-[0.8125rem] font-medium text-white/85">{metric.label}</p>
                <p className="mt-0.5 text-[0.74rem] text-white/45">{metric.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — CHOOSE YOUR AURA (FINALE CTA)
         ============================================================ */}
      <section
        id="section-choose"
        className="relative flex min-h-[92svh] flex-col justify-end items-center text-center mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 pb-16 pt-32"
      >
        <div data-reveal-block className="pointer-events-auto flex flex-col items-center max-w-[640px]">
          <p className="aura-eyebrow text-white/50 mb-4">05 / Virtual Showroom</p>
          <h2 className="aura-headline text-[2.5rem] sm:text-[3.6rem] lg:text-[4.4rem] text-white">
            Find your perfect finish.
          </h2>
          <p className="mt-5 text-[1rem] leading-relaxed text-white/62 font-light max-w-[460px]">
            Step into the AURA Studio to inspect every millimeter in interactive 3D, switch
            between all four anodized finishes, and configure your AURA ONE.
          </p>

          <div className="mt-9">
            <MagneticButton
              id="finale-customize-btn"
              variant="primary"
              size="lg"
              onClick={onGoOrder}
              className="px-10 h-14 text-[0.98rem]"
            >
              Customize Your AURA
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </MagneticButton>
          </div>

          <footer className="mt-16 pt-6 border-t border-white/[0.08] w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.72rem] text-white/38">
            <span>AURA ONE · Industrial Design Concept</span>
            <span>Fictional product showcase — no real hardware is sold.</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
