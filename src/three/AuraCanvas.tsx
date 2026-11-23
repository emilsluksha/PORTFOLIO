import { Component, type ReactNode, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { AURA_FINISHES } from '../data/finishes'
import type { AppPage, AuraColorId, CameraPreset, CheckoutStep } from '../types/aura'
import { clampZoom, sceneBridge } from './sceneBridge'
import { StudioScene } from './StudioScene'

interface AuraCanvasProps {
  selectedColor: AuraColorId
  page: AppPage
  cameraPreset: CameraPreset
  isLidOpen: boolean
  checkoutStep: CheckoutStep
  introReady: boolean
  isMobile: boolean
  reducedMotion: boolean
  onResetView?: () => void
}

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

interface ErrorBoundaryState {
  hasError: boolean
}

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function WebGLFallback({ selectedColor }: { selectedColor: AuraColorId }) {
  const theme = AURA_FINISHES[selectedColor]
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div
          className="w-56 h-36 rounded-2xl border border-white/15 shadow-2xl transition-all duration-700"
          style={{
            background: theme.swatchGradient,
            boxShadow: `0 30px 90px ${theme.studioGlow}`,
          }}
        />
        <p className="aura-eyebrow text-white/60">
          AURA ONE — {theme.name} · Interactive 3D requires WebGL
        </p>
      </div>
    </div>
  )
}

export function AuraCanvas({
  selectedColor,
  page,
  cameraPreset,
  isLidOpen,
  checkoutStep,
  introReady,
  isMobile,
  reducedMotion,
  onResetView,
}: AuraCanvasProps) {
  const [hasWebGL] = useState<boolean>(() => detectWebGLSupport())
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    lastTapTime: 0,
    moved: false,
  })
  const pinchRef = useRef<number | null>(null)

  // Global cursor tracking for gentle studio parallax
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      sceneBridge.pointerX = nx
      sceneBridge.pointerY = ny

      if (dragRef.current.active && dragRef.current.pointerId === e.pointerId) {
        const dx = e.clientX - dragRef.current.lastX
        const dy = e.clientY - dragRef.current.lastY
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true

        const sensitivity = isMobile ? 0.0085 : 0.0068
        sceneBridge.userRotY += dx * sensitivity
        sceneBridge.userRotX += dy * sensitivity * 0.72
        sceneBridge.userVelY = dx * sensitivity * 0.35
        sceneBridge.userVelX = dy * sensitivity * 0.25

        dragRef.current.lastX = e.clientX
        dragRef.current.lastY = e.clientY
      }
    }

    const endDrag = (e: PointerEvent) => {
      if (dragRef.current.active && dragRef.current.pointerId === e.pointerId) {
        dragRef.current.active = false
        dragRef.current.pointerId = -1
        sceneBridge.isDragging = false
        document.body.style.cursor = ''
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', endDrag, { passive: true })
    window.addEventListener('pointercancel', endDrag, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      document.body.style.cursor = ''
    }
  }, [isMobile])

  // Controlled zoom via wheel on Order page (or Ctrl+wheel anywhere) without hijacking homepage scroll!
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null
      const inScrollablePanel = target?.closest('[data-scrollable-panel="true"]')
      if (page === 'order' && !inScrollablePanel && !isMobile) {
        e.preventDefault()
        const delta = -e.deltaY * 0.0008
        sceneBridge.zoomTarget = clampZoom(sceneBridge.zoomTarget + delta)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [page, isMobile])

  // Expose interactive drag handlers on a dedicated interaction overlay zone
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTapTime: dragRef.current.lastTapTime,
      moved: false,
    }
    sceneBridge.isDragging = true
    sceneBridge.userVelX = 0
    sceneBridge.userVelY = 0
    if (e.pointerType === 'mouse') {
      document.body.style.cursor = 'grabbing'
    }
  }

  const handleStageDoubleClick = () => {
    sceneBridge.resetNonce += 1
    onResetView?.()
  }

  // Two-finger pinch zoom on touch devices
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (pinchRef.current !== null) {
        const diff = (dist - pinchRef.current) * 0.0035
        sceneBridge.zoomTarget = clampZoom(sceneBridge.zoomTarget + diff)
      }
      pinchRef.current = dist
    }
  }

  const handleTouchEnd = () => {
    pinchRef.current = null
  }

  if (!hasWebGL) {
    return <WebGLFallback selectedColor={selectedColor} />
  }

  return (
    <>
      {/* Persistent Fixed WebGL Studio Canvas (never remounted across pages or color changes!) */}
      <div
        id="aura-3d-canvas-container"
        className="fixed inset-0 z-10 pointer-events-none select-none"
        aria-label="Interactive 3D AURA ONE Laptop"
      >
        <WebGLErrorBoundary fallback={<WebGLFallback selectedColor={selectedColor} />}>
          <Canvas
            shadows="percentage"
            dpr={isMobile ? [1, 1.5] : [1, 2]}
            camera={{ position: [0, 0.52, isMobile ? 7.7 : 6.15], fov: 34, near: 0.1, far: 60 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.08,
            }}
            style={{ background: 'transparent' }}
          >
            <StudioScene
              selectedColor={selectedColor}
              page={page}
              cameraPreset={cameraPreset}
              isLidOpen={isLidOpen}
              checkoutStep={checkoutStep}
              introReady={introReady}
              isMobile={isMobile}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      {/* Dedicated interactive drag surface for 3D manipulation.
          On Home: positioned over the hero showcase zone so dragging works effortlessly while scrolling remains 100% natural.
          On Order: spans the expansive 3D showroom stage for seamless mouse + touch drag, pinch zoom, and double-click reset! */}
      <div
        id="aura-3d-interaction-layer"
        role="application"
        aria-label="Drag to rotate the 3D AURA ONE laptop. Double-click to reset view."
        onPointerDown={handleStagePointerDown}
        onDoubleClick={handleStageDoubleClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={
          page === 'order'
            ? isMobile
              ? 'fixed top-16 left-0 right-0 h-[42vh] z-20 cursor-grab active:cursor-grabbing touch-none'
              : 'fixed top-0 right-0 bottom-0 left-[440px] z-20 cursor-grab active:cursor-grabbing touch-none'
            : isMobile
              ? 'fixed inset-0 z-[15] touch-pan-y'
              : 'fixed inset-0 z-[15] cursor-grab active:cursor-grabbing'
        }
      />
    </>
  )
}
