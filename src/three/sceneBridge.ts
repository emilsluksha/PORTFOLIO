/**
 * High-frequency mutable state bridge shared between React UI / ScrollTrigger
 * and the 60fps R3F `useFrame` loop without causing React re-renders.
 */
export interface SceneBridge {
  /** Normalized scroll progress [0..1] across the homepage storytelling timeline */
  scrollProgress: number
  /** Normalized cursor position [-1..1] for subtle parallax */
  pointerX: number
  pointerY: number
  /** True while user is actively dragging the 3D laptop */
  isDragging: boolean
  /** User interactive rotation offsets (radians) applied smoothly with inertia */
  userRotX: number
  userRotY: number
  userVelX: number
  userVelY: number
  /** Controlled zoom multiplier (1.0 = default; clamped 0.76..1.34) */
  zoomTarget: number
  zoomCurrent: number
  /** Incremented whenever user triggers double-click reset or reset button */
  resetNonce: number
  /** Incremented whenever checkout confirmation triggers a subtle celebratory flourish */
  confirmNonce: number
}

export const sceneBridge: SceneBridge = {
  scrollProgress: 0,
  pointerX: 0,
  pointerY: 0,
  isDragging: false,
  userRotX: 0,
  userRotY: 0,
  userVelX: 0,
  userVelY: 0,
  zoomTarget: 1,
  zoomCurrent: 1,
  resetNonce: 0,
  confirmNonce: 0,
}

export function clampZoom(value: number): number {
  return Math.min(1.34, Math.max(0.76, value))
}
