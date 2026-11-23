import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'
import { AURA_FINISHES } from '../data/finishes'
import type { AppPage, AuraColorId } from '../types/aura'

interface StudioBackdropProps {
  selectedColor: AuraColorId
  page: AppPage
  isMobile: boolean
  reducedMotion: boolean
}

export function StudioBackdrop({
  selectedColor,
  page,
  isMobile,
  reducedMotion,
}: StudioBackdropProps) {
  const bgLayerRef = useRef<HTMLDivElement | null>(null)
  const glowLayerRef = useRef<HTMLDivElement | null>(null)

  const colorState = useRef({
    center: new THREE.Color(AURA_FINISHES[selectedColor].bgCenter),
    mid: new THREE.Color(AURA_FINISHES[selectedColor].bgMid),
    edge: new THREE.Color(AURA_FINISHES[selectedColor].bgEdge),
    accent: new THREE.Color(AURA_FINISHES[selectedColor].uiAccent),
    muted: new THREE.Color(AURA_FINISHES[selectedColor].uiMuted),
  })

  const tweenRef = useRef<gsap.core.Timeline | null>(null)

  const applyColorsToDOM = () => {
    const s = colorState.current
    const centerHex = `#${s.center.getHexString()}`
    const midHex = `#${s.mid.getHexString()}`
    const edgeHex = `#${s.edge.getHexString()}`
    const accentHex = `#${s.accent.getHexString()}`
    const mutedHex = `#${s.muted.getHexString()}`

    const root = document.documentElement.style
    root.setProperty('--aura-bg-center', centerHex)
    root.setProperty('--aura-bg-mid', midHex)
    root.setProperty('--aura-bg-edge', edgeHex)
    root.setProperty('--aura-accent', accentHex)
    root.setProperty('--aura-text-muted', mutedHex)

    if (bgLayerRef.current) {
      const originX = isMobile ? '50%' : page === 'order' ? '68%' : '62%'
      const originY = isMobile ? '30%' : '46%'
      bgLayerRef.current.style.background = `radial-gradient(ellipse 82% 76% at ${originX} ${originY}, ${centerHex} 0%, ${midHex} 50%, ${edgeHex} 100%)`
    }

    if (glowLayerRef.current) {
      const originX = isMobile ? '50%' : page === 'order' ? '68%' : '62%'
      const originY = isMobile ? '28%' : '48%'
      const r = Math.round(s.accent.r * 255)
      const g = Math.round(s.accent.g * 255)
      const b = Math.round(s.accent.b * 255)
      glowLayerRef.current.style.background = `radial-gradient(circle 42vmax at ${originX} ${originY}, rgba(${r}, ${g}, ${b}, 0.14) 0%, rgba(${r}, ${g}, ${b}, 0.04) 42%, transparent 72%)`
    }
  }

  // Apply initial studio background immediately on mount & layout change
  useEffect(() => {
    applyColorsToDOM()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isMobile])

  // Smooth GSAP synchronized studio color interpolation when finish changes
  useEffect(() => {
    const theme = AURA_FINISHES[selectedColor]
    const targetCenter = new THREE.Color(theme.bgCenter)
    const targetMid = new THREE.Color(theme.bgMid)
    const targetEdge = new THREE.Color(theme.bgEdge)
    const targetAccent = new THREE.Color(theme.uiAccent)
    const targetMuted = new THREE.Color(theme.uiMuted)

    tweenRef.current?.kill()
    const dur = reducedMotion ? 0.45 : 1.08

    const tl = gsap.timeline({ onUpdate: applyColorsToDOM })
    tl.to(
      colorState.current.center,
      { r: targetCenter.r, g: targetCenter.g, b: targetCenter.b, duration: dur, ease: 'power2.inOut' },
      0
    )
    tl.to(
      colorState.current.mid,
      { r: targetMid.r, g: targetMid.g, b: targetMid.b, duration: dur, ease: 'power2.inOut' },
      0
    )
    tl.to(
      colorState.current.edge,
      { r: targetEdge.r, g: targetEdge.g, b: targetEdge.b, duration: dur, ease: 'power2.inOut' },
      0
    )
    tl.to(
      colorState.current.accent,
      { r: targetAccent.r, g: targetAccent.g, b: targetAccent.b, duration: dur, ease: 'power2.inOut' },
      0
    )
    tl.to(
      colorState.current.muted,
      { r: targetMuted.r, g: targetMuted.g, b: targetMuted.b, duration: dur, ease: 'power2.inOut' },
      0
    )
    tweenRef.current = tl

    // Update mobile browser theme-color meta cleanly
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.setAttribute('content', theme.bgEdge)

    return () => {
      tl.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, reducedMotion])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Primary matte studio gradient sweep */}
      <div
        ref={bgLayerRef}
        className="absolute inset-0 transition-opacity duration-700"
      />

      {/* Soft atmospheric studio cyclorama halo behind product */}
      <div
        ref={glowLayerRef}
        className="absolute inset-0 transition-opacity duration-700"
      />

      {/* Subtle architectural vignette framing */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.48) 100%)',
        }}
      />

      {/* Delicate tactile photographic film grain */}
      <div className="absolute inset-0 aura-grain opacity-[0.032] mix-blend-overlay" />
    </div>
  )
}
