export type AuraColorId = 'crimson' | 'blue' | 'emerald' | 'solar'

export type AppPage = 'home' | 'order'

export type NavSection = 'home' | 'explore' | 'order'

export type CameraPreset = 'front' | 'back' | 'side' | 'top'

export type CheckoutStep = 'none' | 'summary' | 'confirmed'

export interface AuraFinishTheme {
  id: AuraColorId
  name: string
  shortName: string
  tagline: string
  description: string
  /** Physically-based anodized aluminum primary albedo */
  chassisColor: string
  /** Subtle specular sheen / chamfer lift color */
  chassisAccent: string
  /** Inner trackpad glass tint */
  trackpadTint: string
  /** Polished mirror emblem metallic tint */
  logoTint: string
  /** Studio matte background gradient stops */
  bgCenter: string
  bgMid: string
  bgEdge: string
  /** Subtle radial atmospheric studio lift behind laptop */
  studioGlow: string
  /** Studio 3D lighting palette */
  keyLightColor: string
  rimLightColor: string
  fillLightColor: string
  ambientLightColor: string
  lightformerAccent: string
  /** OLED dynamic shader wallpaper colors */
  wallpaperA: string
  wallpaperB: string
  wallpaperC: string
  /** UI semantic tokens */
  uiAccent: string
  uiText: string
  uiMuted: string
  /** Metallic swatch CSS radial gradient */
  swatchGradient: string
  swatchRing: string
}

export interface ProductSpec {
  label: string
  detail: string
}
