import { useEffect, useMemo, useRef } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import { AURA_FINISHES } from '../data/finishes'
import type { AppPage, AuraColorId, CameraPreset, CheckoutStep } from '../types/aura'
import { AuraLaptop, type AuraLaptopHandle } from './AuraLaptop'
import { sceneBridge } from './sceneBridge'

interface StudioSceneProps {
  selectedColor: AuraColorId
  page: AppPage
  cameraPreset: CameraPreset
  isLidOpen: boolean
  checkoutStep: CheckoutStep
  introReady: boolean
  isMobile: boolean
  reducedMotion: boolean
}

interface PoseKeyframe {
  p: number
  x: number
  y: number
  z: number
  rotX: number
  rotY: number
  rotZ: number
  lid: number
  camY: number
  camZ: number
  scale: number
}

const DESKTOP_SCROLL_KEYFRAMES: PoseKeyframe[] = [
  // 0.00 — Hero: Commanding three-quarter product hero floating cleanly below navbar on right
  {
    p: 0.0,
    x: 1.18,
    y: -0.18,
    z: 0.0,
    rotX: 0.17,
    rotY: -0.46,
    rotZ: -0.02,
    lid: -0.3,
    camY: 0.56,
    camZ: 6.95,
    scale: 0.95,
  },
  // 0.22 — Section 1: Precision Engineered (cleanly left while text breathes on right)
  {
    p: 0.22,
    x: -1.52,
    y: -0.14,
    z: 0.16,
    rotX: 0.21,
    rotY: 0.62,
    rotZ: 0.03,
    lid: -0.24,
    camY: 0.44,
    camZ: 6.65,
    scale: 0.89,
  },
  // 0.44 — Section 2: Beautiful From Every Angle (sweeping profile/rear reveal cleanly right while text sits left)
  {
    p: 0.44,
    x: 1.52,
    y: -0.14,
    z: 0.0,
    rotX: 0.21,
    rotY: -2.42,
    rotZ: -0.025,
    lid: -0.33,
    camY: 0.5,
    camZ: 6.85,
    scale: 0.89,
  },
  // 0.66 — Section 3: Four Expressions (full laptop gracefully elevated in upper sky above the 4 finish cards)
  {
    p: 0.66,
    x: 0.0,
    y: 0.96,
    z: 0.0,
    rotX: 0.16,
    rotY: -0.34,
    rotZ: 0.0,
    lid: -0.29,
    camY: 0.44,
    camZ: 7.95,
    scale: 0.74,
  },
  // 0.85 — Section 4: Performance Meets Elegance (cleanly left, lid opens wider illuminating OLED & keyboard)
  {
    p: 0.85,
    x: -1.48,
    y: -0.14,
    z: 0.08,
    rotX: 0.12,
    rotY: 0.42,
    rotZ: 0.015,
    lid: -0.44,
    camY: 0.44,
    camZ: 6.85,
    scale: 0.88,
  },
  // 1.00 — Section 5: Choose Your AURA (full sculptural laptop hovering cleanly above CTA headline)
  {
    p: 1.0,
    x: 0.0,
    y: 1.02,
    z: 0.0,
    rotX: 0.17,
    rotY: -0.26,
    rotZ: 0.0,
    lid: -0.29,
    camY: 0.44,
    camZ: 8.1,
    scale: 0.73,
  },
]

const MOBILE_SCROLL_KEYFRAMES: PoseKeyframe[] = [
  {
    p: 0.0,
    x: 0.0,
    y: 0.64,
    z: 0.0,
    rotX: 0.17,
    rotY: -0.44,
    rotZ: -0.02,
    lid: -0.3,
    camY: 0.56,
    camZ: 8.35,
    scale: 0.82,
  },
  {
    p: 0.22,
    x: 0.0,
    y: 0.6,
    z: 0.2,
    rotX: 0.24,
    rotY: 0.78,
    rotZ: 0.03,
    lid: -0.24,
    camY: 0.46,
    camZ: 7.55,
    scale: 0.82,
  },
  {
    p: 0.44,
    x: 0.0,
    y: 0.6,
    z: 0.0,
    rotX: 0.24,
    rotY: -2.35,
    rotZ: -0.02,
    lid: -0.34,
    camY: 0.56,
    camZ: 8.1,
    scale: 0.82,
  },
  {
    p: 0.66,
    x: 0.0,
    y: 0.86,
    z: 0.0,
    rotX: 0.16,
    rotY: -0.34,
    rotZ: 0.0,
    lid: -0.29,
    camY: 0.56,
    camZ: 8.5,
    scale: 0.78,
  },
  {
    p: 0.85,
    x: 0.0,
    y: 0.68,
    z: 0.06,
    rotX: 0.11,
    rotY: 0.34,
    rotZ: 0.02,
    lid: -0.44,
    camY: 0.42,
    camZ: 8.0,
    scale: 0.8,
  },
  {
    p: 1.0,
    x: 0.0,
    y: 0.84,
    z: 0.0,
    rotX: 0.16,
    rotY: -0.26,
    rotZ: 0.0,
    lid: -0.29,
    camY: 0.54,
    camZ: 8.6,
    scale: 0.78,
  },
]

const PRESET_POSES: Record<
  CameraPreset,
  { rotX: number; rotY: number; rotZ: number; camY: number; camZ: number }
> = {
  front: { rotX: 0.17, rotY: -0.42, rotZ: 0.0, camY: 0.52, camZ: 7.2 },
  back: { rotX: 0.11, rotY: Math.PI - 0.34, rotZ: 0.0, camY: 0.42, camZ: 7.0 },
  side: { rotX: 0.05, rotY: Math.PI / 2, rotZ: 0.0, camY: 0.28, camZ: 6.75 },
  top: { rotX: 1.12, rotY: 0.0, rotZ: 0.0, camY: 0.96, camZ: 6.95 },
}

function sampleScrollPose(progress: number, isMobile: boolean): PoseKeyframe {
  const frames = isMobile ? MOBILE_SCROLL_KEYFRAMES : DESKTOP_SCROLL_KEYFRAMES
  const clamped = Math.min(1, Math.max(0, progress))

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]
    const b = frames[i + 1]
    if (clamped >= a.p && clamped <= b.p) {
      const span = b.p - a.p || 1
      const rawT = (clamped - a.p) / span
      // Quintic smoothstep for cinema-grade ease between scroll chapters
      const t = rawT * rawT * rawT * (rawT * (rawT * 6 - 15) + 10)
      return {
        p: clamped,
        x: THREE.MathUtils.lerp(a.x, b.x, t),
        y: THREE.MathUtils.lerp(a.y, b.y, t),
        z: THREE.MathUtils.lerp(a.z, b.z, t),
        rotX: THREE.MathUtils.lerp(a.rotX, b.rotX, t),
        rotY: THREE.MathUtils.lerp(a.rotY, b.rotY, t),
        rotZ: THREE.MathUtils.lerp(a.rotZ, b.rotZ, t),
        lid: THREE.MathUtils.lerp(a.lid, b.lid, t),
        camY: THREE.MathUtils.lerp(a.camY, b.camY, t),
        camZ: THREE.MathUtils.lerp(a.camZ, b.camZ, t),
        scale: THREE.MathUtils.lerp(a.scale, b.scale, t),
      }
    }
  }
  return frames[frames.length - 1]
}

export function StudioScene({
  selectedColor,
  page,
  cameraPreset,
  isLidOpen,
  checkoutStep,
  introReady,
  isMobile,
  reducedMotion,
}: StudioSceneProps) {
  const { camera } = useThree()

  const laptopRef = useRef<AuraLaptopHandle | null>(null)
  const stageGroupRef = useRef<THREE.Group | null>(null)
  const poseGroupRef = useRef<THREE.Group | null>(null)
  const spinGroupRef = useRef<THREE.Group | null>(null)
  const userGroupRef = useRef<THREE.Group | null>(null)

  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null)
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null)
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null)
  const floorShadowRef = useRef<THREE.Mesh | null>(null)

  // Lightweight high-craft radial elliptical studio floor shadow texture (0 extra render passes/frame)
  const floorShadowTex = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 12, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)')
    grad.addColorStop(0.42, 'rgba(0, 0, 0, 0.34)')
    grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.1)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  useEffect(() => {
    return () => {
      floorShadowTex.dispose()
    }
  }, [floorShadowTex])

  // Signature spin & intro animation state (driven imperatively by GSAP)
  const spinState = useRef({ y: 0, tiltX: 0, tiltZ: 0, liftY: 0 })
  const introState = useRef({
    offsetY: -0.7,
    offsetZ: -1.4,
    rotX: 0.42,
    rotY: -1.35,
    lidOffset: 0.95,
    scale: 0.88,
  })
  const orderRigState = useRef({
    rotX: PRESET_POSES.front.rotX,
    rotY: PRESET_POSES.front.rotY,
    rotZ: PRESET_POSES.front.rotZ,
    camY: PRESET_POSES.front.camY,
    camZ: PRESET_POSES.front.camZ,
  })
  const lidControlState = useRef({
    angle: -0.3,
    screenBrightness: 1.0,
    kbGlow: 1.0,
  })
  const smoothPose = useRef({
    x: isMobile ? 0 : 1.05,
    y: isMobile ? 0.56 : -0.04,
    z: 0,
    rotX: 0.16,
    rotY: -0.48,
    rotZ: -0.025,
    camY: 0.52,
    camZ: isMobile ? 7.7 : 6.15,
    scale: isMobile ? 0.88 : 1.0,
  })
  const parallaxSmooth = useRef({ x: 0, y: 0 })

  // Track previous values for state-machine transitions
  const lastColorRef = useRef<AuraColorId>(selectedColor)
  const prevPageRef = useRef<AppPage>(page)
  const lastResetNonceRef = useRef<number>(sceneBridge.resetNonce)
  const lastConfirmNonceRef = useRef<number>(sceneBridge.confirmNonce)

  // Active GSAP timelines for clean cancellation & interruption safety
  const spinTlRef = useRef<gsap.core.Timeline | null>(null)
  const materialTlRef = useRef<gsap.core.Timeline | null>(null)
  const lightTlRef = useRef<gsap.core.Timeline | null>(null)
  const lidTlRef = useRef<gsap.core.Timeline | null>(null)
  const presetTlRef = useRef<gsap.core.Timeline | null>(null)
  const resetTlRef = useRef<gsap.core.Timeline | null>(null)
  const textureSwapCallRef = useRef<gsap.core.Tween | null>(null)

  // 1. CINEMATIC INITIAL LOAD SWEEP-IN
  useEffect(() => {
    if (!introReady) return
    if (reducedMotion) {
      introState.current.offsetY = 0
      introState.current.offsetZ = 0
      introState.current.rotX = 0
      introState.current.rotY = 0
      introState.current.lidOffset = 0
      introState.current.scale = 1
      return
    }

    const tl = gsap.timeline()
    tl.to(introState.current, {
      offsetY: 0,
      offsetZ: 0,
      rotX: 0,
      rotY: 0,
      lidOffset: 0,
      scale: 1,
      duration: 1.45,
      ease: 'expo.out',
    })
    return () => {
      tl.kill()
    }
  }, [introReady, reducedMotion])

  // 2. SIGNATURE 3D ROTATING COLOR TRANSITION (Rapid-click resilient, zero scene rebuild)
  useEffect(() => {
    if (selectedColor === lastColorRef.current) return
    const prevColor = lastColorRef.current
    lastColorRef.current = selectedColor

    const theme = AURA_FINISHES[selectedColor]
    const laptop = laptopRef.current
    if (!laptop) return

    const targetChamfer = new THREE.Color(theme.chassisAccent)
    const targetTrackpad = new THREE.Color(theme.trackpadTint)
    const targetLogo = new THREE.Color(theme.logoTint)

    const targetKey = new THREE.Color(theme.keyLightColor)
    const targetRim = new THREE.Color(theme.rimLightColor)
    const targetFill = new THREE.Color(theme.fillLightColor)
    const targetAmbient = new THREE.Color(theme.ambientLightColor)

    // Kill previous color/light/texture-swap tweens cleanly so rapid clicks retarget mid-flight
    materialTlRef.current?.kill()
    lightTlRef.current?.kill()
    textureSwapCallRef.current?.kill()

    // Prepare smooth OLED wallpaper cross-fade between preloaded user-provided screen textures
    const prevScreenTex =
      laptop.wallpaperUniforms.uMix.value >= 0.5
        ? laptop.wallpaperUniforms.uNextMap.value
        : laptop.getScreenTexture(prevColor)
    laptop.wallpaperUniforms.uPrevMap.value = prevScreenTex
    laptop.wallpaperUniforms.uNextMap.value = laptop.getScreenTexture(selectedColor)
    laptop.wallpaperUniforms.uMix.value = 0

    if (reducedMotion) {
      laptop.applyColorTextures(selectedColor)
      const mTl = gsap.timeline()
      const dur = 0.48
      mTl.to(laptop.chamferMaterial.color, { r: targetChamfer.r, g: targetChamfer.g, b: targetChamfer.b, duration: dur, ease: 'power2.inOut' }, 0)
      mTl.to(laptop.trackpadMaterial.color, { r: targetTrackpad.r, g: targetTrackpad.g, b: targetTrackpad.b, duration: dur, ease: 'power2.inOut' }, 0)
      mTl.to(laptop.logoMaterial.color, { r: targetLogo.r, g: targetLogo.g, b: targetLogo.b, duration: dur, ease: 'power2.inOut' }, 0)
      mTl.to(laptop.wallpaperUniforms.uMix, { value: 1, duration: dur, ease: 'power2.inOut' }, 0)
      materialTlRef.current = mTl

      const lTl = gsap.timeline()
      if (keyLightRef.current) lTl.to(keyLightRef.current.color, { r: targetKey.r, g: targetKey.g, b: targetKey.b, duration: dur }, 0)
      if (rimLightRef.current) lTl.to(rimLightRef.current.color, { r: targetRim.r, g: targetRim.g, b: targetRim.b, duration: dur }, 0)
      if (fillLightRef.current) lTl.to(fillLightRef.current.color, { r: targetFill.r, g: targetFill.g, b: targetFill.b, duration: dur }, 0)
      if (ambientLightRef.current) lTl.to(ambientLightRef.current.color, { r: targetAmbient.r, g: targetAmbient.g, b: targetAmbient.b, duration: dur }, 0)
      lightTlRef.current = lTl
      return
    }

    // --- FULL CINEMATIC SPIN & CONCEALED TEXTURE/MATERIAL MORPH (1.18s) ---
    spinTlRef.current?.kill()

    const TWO_PI = Math.PI * 2
    const currentY = spinState.current.y
    const minEnd = currentY + TWO_PI * 0.82
    const targetY = Math.ceil(minEnd / TWO_PI) * TWO_PI
    const spanY = targetY - currentY
    const apexY = currentY + spanY * 0.43

    const sTl = gsap.timeline({
      onComplete: () => {
        spinState.current.y = 0
      },
    })

    // Step 1 & 2: Smooth controlled acceleration + cinematic poise tilt & gentle lift
    sTl.to(
      spinState.current,
      {
        y: apexY,
        tiltX: 0.11,
        tiltZ: -0.075,
        liftY: 0.11,
        duration: 0.39,
        ease: 'power2.in',
      },
      0
    )

    // Step 5 & 6: Natural exponential deceleration & weightless settle back to idle float
    sTl.to(
      spinState.current,
      {
        y: targetY,
        tiltX: 0,
        tiltZ: 0,
        liftY: 0,
        duration: 0.79,
        ease: 'expo.out',
      },
      0.39
    )
    spinTlRef.current = sTl

    // Step 3 & 4: Swap preloaded anodized metal/lid/bottom textures cleanly at peak spin velocity
    textureSwapCallRef.current = gsap.delayedCall(0.35, () => {
      laptop.applyColorTextures(selectedColor)
    })

    // Smoothly morph chamfer, trackpad, logo tint & cross-fade OLED wallpaper texture across spin apex
    const mTl = gsap.timeline({ delay: 0.25 })
    const morphDur = 0.46
    const morphEase = 'power2.inOut'
    mTl.to(laptop.chamferMaterial.color, { r: targetChamfer.r, g: targetChamfer.g, b: targetChamfer.b, duration: morphDur, ease: morphEase }, 0)
    mTl.to(laptop.trackpadMaterial.color, { r: targetTrackpad.r, g: targetTrackpad.g, b: targetTrackpad.b, duration: morphDur, ease: morphEase }, 0)
    mTl.to(laptop.logoMaterial.color, { r: targetLogo.r, g: targetLogo.g, b: targetLogo.b, duration: morphDur, ease: morphEase }, 0)
    mTl.to(laptop.wallpaperUniforms.uMix, { value: 1, duration: morphDur, ease: morphEase }, 0)
    materialTlRef.current = mTl

    // Step 7 & 8: Synchronized studio lighting glide
    const lTl = gsap.timeline()
    const lightDur = 1.02
    if (keyLightRef.current) lTl.to(keyLightRef.current.color, { r: targetKey.r, g: targetKey.g, b: targetKey.b, duration: lightDur, ease: 'power2.inOut' }, 0)
    if (rimLightRef.current) lTl.to(rimLightRef.current.color, { r: targetRim.r, g: targetRim.g, b: targetRim.b, duration: lightDur, ease: 'power2.inOut' }, 0)
    if (fillLightRef.current) lTl.to(fillLightRef.current.color, { r: targetFill.r, g: targetFill.g, b: targetFill.b, duration: lightDur, ease: 'power2.inOut' }, 0)
    if (ambientLightRef.current) lTl.to(ambientLightRef.current.color, { r: targetAmbient.r, g: targetAmbient.g, b: targetAmbient.b, duration: lightDur, ease: 'power2.inOut' }, 0)
    lightTlRef.current = lTl
  }, [selectedColor, reducedMotion])

  // 3. SEAMLESS PAGE TRANSITION SPIN (Home <-> Order)
  useEffect(() => {
    if (prevPageRef.current === page) return
    prevPageRef.current = page

    // Smoothly reset interactive drag and zoom on page switch
    resetTlRef.current?.kill()
    resetTlRef.current = gsap.timeline()
    resetTlRef.current.to(
      sceneBridge,
      {
        userRotX: 0,
        userRotY: 0,
        zoomTarget: 1,
        duration: reducedMotion ? 0.25 : 0.9,
        ease: 'power3.out',
      },
      0
    )

    // Add a graceful studio entry turn when entering the Order Showroom
    if (!reducedMotion && page === 'order') {
      spinTlRef.current?.kill()
      const TWO_PI = Math.PI * 2
      const curY = spinState.current.y
      const targetY = Math.ceil((curY + TWO_PI * 0.5) / TWO_PI) * TWO_PI
      const tl = gsap.timeline({
        onComplete: () => {
          spinState.current.y = 0
        },
      })
      tl.to(spinState.current, {
        y: targetY,
        liftY: 0,
        tiltX: 0,
        tiltZ: 0,
        duration: 1.15,
        ease: 'power3.inOut',
      })
      spinTlRef.current = tl
    }
  }, [page, reducedMotion])

  // 4. CAMERA PRESETS & CHECKOUT PRESENTATION ANGLES
  useEffect(() => {
    presetTlRef.current?.kill()

    let targetPose = PRESET_POSES[cameraPreset]
    if (checkoutStep === 'summary') {
      targetPose = { rotX: 0.14, rotY: -0.54, rotZ: -0.02, camY: 0.46, camZ: 6.85 }
    } else if (checkoutStep === 'confirmed') {
      targetPose = { rotX: 0.16, rotY: -0.34, rotZ: 0.0, camY: 0.5, camZ: 6.95 }
    }

    const dur = reducedMotion ? 0.35 : 0.95
    const tl = gsap.timeline()
    tl.to(
      orderRigState.current,
      {
        rotX: targetPose.rotX,
        rotY: targetPose.rotY,
        rotZ: targetPose.rotZ,
        camY: targetPose.camY,
        camZ: targetPose.camZ,
        duration: dur,
        ease: 'power3.inOut',
      },
      0
    )

    // Also ease user drag back to neutral when clicking a preset or entering checkout
    tl.to(
      sceneBridge,
      {
        userRotX: 0,
        userRotY: 0,
        duration: dur * 0.85,
        ease: 'power3.out',
      },
      0
    )

    presetTlRef.current = tl
  }, [cameraPreset, checkoutStep, reducedMotion])

  // 5. ARTICULATED LID OPEN / CLOSE HINGE ANIMATION
  useEffect(() => {
    lidTlRef.current?.kill()
    const dur = reducedMotion ? 0.3 : 1.05
    const tl = gsap.timeline()

    if (isLidOpen) {
      tl.to(
        lidControlState.current,
        {
          angle: -0.31,
          duration: dur,
          ease: 'power3.inOut',
        },
        0
      )
      tl.to(
        lidControlState.current,
        {
          screenBrightness: 1.04,
          kbGlow: 1.0,
          duration: dur * 0.6,
          ease: 'power2.out',
        },
        dur * 0.25
      )
    } else {
      tl.to(
        lidControlState.current,
        {
          screenBrightness: 0.0,
          kbGlow: 0.0,
          duration: dur * 0.35,
          ease: 'power2.in',
        },
        0
      )
      tl.to(
        lidControlState.current,
        {
          angle: Math.PI / 2,
          duration: dur,
          ease: 'power3.inOut',
        },
        0
      )
    }

    lidTlRef.current = tl
  }, [isLidOpen, reducedMotion])

  // Cleanup all GSAP timelines on unmount
  useEffect(() => {
    return () => {
      spinTlRef.current?.kill()
      materialTlRef.current?.kill()
      lightTlRef.current?.kill()
      lidTlRef.current?.kill()
      presetTlRef.current?.kill()
      resetTlRef.current?.kill()
      textureSwapCallRef.current?.kill()
    }
  }, [])

  // 6. CONTINUOUS 60 FPS FRAME LOOP: Scroll Choreography, Drag Inertia, Parallax, Idle Float & Zoom
  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime

    // Handle double-click / button Reset View event smoothly
    if (sceneBridge.resetNonce !== lastResetNonceRef.current) {
      lastResetNonceRef.current = sceneBridge.resetNonce
      sceneBridge.userVelX = 0
      sceneBridge.userVelY = 0
      resetTlRef.current?.kill()
      resetTlRef.current = gsap.timeline()
      resetTlRef.current.to(sceneBridge, {
        userRotX: 0,
        userRotY: 0,
        zoomTarget: 1,
        duration: reducedMotion ? 0.25 : 0.85,
        ease: 'power3.out',
      })
    }

    // Handle Checkout Confirmation celebratory smooth turn
    if (sceneBridge.confirmNonce !== lastConfirmNonceRef.current) {
      lastConfirmNonceRef.current = sceneBridge.confirmNonce
      if (!reducedMotion) {
        spinTlRef.current?.kill()
        const TWO_PI = Math.PI * 2
        const curY = spinState.current.y
        const targetY = Math.ceil((curY + TWO_PI * 0.9) / TWO_PI) * TWO_PI
        const tl = gsap.timeline({
          onComplete: () => {
            spinState.current.y = 0
          },
        })
        tl.to(spinState.current, {
          y: targetY,
          liftY: 0.09,
          duration: 0.65,
          ease: 'power2.inOut',
        })
        tl.to(
          spinState.current,
          {
            liftY: 0,
            duration: 0.85,
            ease: 'expo.out',
          },
          0.65
        )
        spinTlRef.current = tl
      }
    }

    // Apply physical drag inertia + damping
    if (!sceneBridge.isDragging) {
      sceneBridge.userRotY += sceneBridge.userVelY
      sceneBridge.userRotX += sceneBridge.userVelX
      const friction = Math.pow(0.06, dt)
      sceneBridge.userVelY *= friction
      sceneBridge.userVelX *= friction
      if (Math.abs(sceneBridge.userVelY) < 0.00005) sceneBridge.userVelY = 0
      if (Math.abs(sceneBridge.userVelX) < 0.00005) sceneBridge.userVelX = 0
    }
    // Clamp vertical user tilt so laptop stays gracefully controllable and never flips awkwardly
    sceneBridge.userRotX = THREE.MathUtils.clamp(sceneBridge.userRotX, -0.78, 0.92)

    // Smooth controlled zoom damping
    sceneBridge.zoomCurrent = THREE.MathUtils.damp(
      sceneBridge.zoomCurrent,
      sceneBridge.zoomTarget,
      6.5,
      dt
    )

    // Compute desired stage & pose targets based on current page mode
    let targetX: number
    let targetY: number
    let targetZ: number
    let targetRotX: number
    let targetRotY: number
    let targetRotZ: number
    let targetCamY: number
    let targetCamZ: number
    let targetScale: number
    let targetLidAngle: number

    if (page === 'order') {
      targetX = isMobile ? 0.0 : 1.24
      targetY = isMobile ? 0.78 : -0.14
      targetZ = 0.0
      targetRotX = orderRigState.current.rotX
      targetRotY = orderRigState.current.rotY
      targetRotZ = orderRigState.current.rotZ
      targetCamY = orderRigState.current.camY
      targetCamZ = isMobile ? orderRigState.current.camZ + 1.55 : orderRigState.current.camZ
      targetScale = isMobile ? 0.8 : 0.94
      targetLidAngle = lidControlState.current.angle
    } else {
      const sample = sampleScrollPose(sceneBridge.scrollProgress, isMobile)
      targetX = sample.x
      targetY = sample.y
      targetZ = sample.z
      targetRotX = sample.rotX
      targetRotY = sample.rotY
      targetRotZ = sample.rotZ
      targetCamY = sample.camY
      targetCamZ = sample.camZ
      targetScale = sample.scale
      // On home page, allow user lid toggle if explicitly closed; otherwise follow storytelling lid angle
      targetLidAngle = isLidOpen ? sample.lid : lidControlState.current.angle
    }

    // Exponentially damp pose values for silky continuous page + scroll motion
    const dampSpeed = page === 'order' ? 5.2 : 6.4
    const sp = smoothPose.current
    sp.x = THREE.MathUtils.damp(sp.x, targetX, dampSpeed, dt)
    sp.y = THREE.MathUtils.damp(sp.y, targetY, dampSpeed, dt)
    sp.z = THREE.MathUtils.damp(sp.z, targetZ, dampSpeed, dt)
    sp.rotX = THREE.MathUtils.damp(sp.rotX, targetRotX, dampSpeed, dt)
    sp.rotY = THREE.MathUtils.damp(sp.rotY, targetRotY, dampSpeed, dt)
    sp.rotZ = THREE.MathUtils.damp(sp.rotZ, targetRotZ, dampSpeed, dt)
    sp.camY = THREE.MathUtils.damp(sp.camY, targetCamY, dampSpeed, dt)
    sp.camZ = THREE.MathUtils.damp(sp.camZ, targetCamZ, dampSpeed, dt)
    sp.scale = THREE.MathUtils.damp(sp.scale, targetScale, dampSpeed, dt)

    // Smooth mouse parallax
    const parallaxStrength = reducedMotion || sceneBridge.isDragging ? 0 : 1
    parallaxSmooth.current.x = THREE.MathUtils.damp(
      parallaxSmooth.current.x,
      sceneBridge.pointerX * 0.065 * parallaxStrength,
      4.0,
      dt
    )
    parallaxSmooth.current.y = THREE.MathUtils.damp(
      parallaxSmooth.current.y,
      sceneBridge.pointerY * 0.042 * parallaxStrength,
      4.0,
      dt
    )

    // Gentle weightless idle floating motion
    const floatFactor = reducedMotion ? 0 : 1
    const idleFloatY = Math.sin(t * 1.15) * 0.042 * floatFactor
    const idleRollZ = Math.sin(t * 0.72 + 0.6) * 0.014 * floatFactor
    const idlePitchX = Math.cos(t * 0.85) * 0.011 * floatFactor

    // Apply Stage placement (with intro sweep offsets)
    const intro = introState.current
    if (stageGroupRef.current) {
      stageGroupRef.current.position.set(
        sp.x,
        sp.y + intro.offsetY,
        sp.z + intro.offsetZ
      )
      const finalScale = sp.scale * intro.scale
      stageGroupRef.current.scale.setScalar(finalScale)
    }

    // Apply Choreographed Pose orientation
    if (poseGroupRef.current) {
      poseGroupRef.current.rotation.set(
        sp.rotX + intro.rotX,
        sp.rotY + intro.rotY,
        sp.rotZ
      )
    }

    // Apply Signature Color-Spin layer
    if (spinGroupRef.current) {
      spinGroupRef.current.position.y = spinState.current.liftY
      spinGroupRef.current.rotation.set(
        spinState.current.tiltX,
        spinState.current.y,
        spinState.current.tiltZ
      )
    }

    // Apply Interactive Drag + Parallax + Idle Float layer
    if (userGroupRef.current) {
      userGroupRef.current.position.y = idleFloatY
      userGroupRef.current.rotation.set(
        sceneBridge.userRotX + parallaxSmooth.current.y + idlePitchX,
        sceneBridge.userRotY + parallaxSmooth.current.x,
        idleRollZ
      )
    }

    // Apply Articulated Lid angle + OLED brightness + Backlit keyboard response
    const laptop = laptopRef.current
    if (laptop?.lidPivot) {
      const desiredLid = targetLidAngle + intro.lidOffset
      laptop.lidPivot.rotation.x = THREE.MathUtils.damp(
        laptop.lidPivot.rotation.x,
        desiredLid,
        7.0,
        dt
      )

      // Smooth OLED illumination boost in Section 4 (Performance) and dim when closed
      const section4GlowBoost =
        page === 'home'
          ? Math.max(0, 1 - Math.abs(sceneBridge.scrollProgress - 0.84) * 5.2) * 0.16
          : 0
      const lidOpenness = THREE.MathUtils.clamp(
        1 - (laptop.lidPivot.rotation.x - -0.45) / (Math.PI / 2 - -0.45),
        0,
        1
      )
      const screenTarget = isLidOpen
        ? Math.max(0.2, Math.min(1.15, lidOpenness * 1.1 + section4GlowBoost))
        : lidControlState.current.screenBrightness

      laptop.wallpaperUniforms.uBrightness.value = THREE.MathUtils.damp(
        laptop.wallpaperUniforms.uBrightness.value,
        screenTarget,
        6.0,
        dt
      )

      const kbFactor = isLidOpen ? lidOpenness : lidControlState.current.kbGlow
      laptop.keyTopMaterial.emissiveIntensity = kbFactor * (0.48 + section4GlowBoost * 0.6)
      laptop.keyboardUnderGlowMaterial.opacity = kbFactor * (0.09 + section4GlowBoost * 0.25)
    }

    // Subtle dynamic studio shadow response to float & spin lift
    if (floorShadowRef.current) {
      const elevation = Math.max(0, idleFloatY + spinState.current.liftY)
      const spread = 1 + elevation * 1.1
      floorShadowRef.current.scale.set(4.5 * spread, 3.3 * spread, 1)
      const mat = floorShadowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = THREE.MathUtils.clamp(0.55 - elevation * 1.4, 0.25, 0.58)
    }

    // Update Camera with controlled zoom (never clips near the model!)
    const zoomedCamZ = sp.camZ / sceneBridge.zoomCurrent
    camera.position.set(
      THREE.MathUtils.damp(camera.position.x, 0, 5.0, dt),
      THREE.MathUtils.damp(camera.position.y, sp.camY, 5.0, dt),
      THREE.MathUtils.damp(camera.position.z, zoomedCamZ, 6.0, dt)
    )
    camera.lookAt(0, 0.08, 0)
  })

  const initialTheme = AURA_FINISHES[selectedColor]

  return (
    <>
      {/* ============================================================
          PROCEDURAL LUXURY STUDIO HDRI ENVIRONMENT
          Sculpted softboxes that reveal anodized metal contours & 3D keycap bevels
         ============================================================ */}
      <Environment resolution={256} frames={1}>
        {/* Steep overhead-front softbox: highlights top edges & keycaps without hitting flat palm-rest grazing angle */}
        <Lightformer
          form="rect"
          intensity={1.15}
          color="#FFFFFF"
          scale={[8.5, 1.8, 1]}
          position={[0, 9.2, 4.6]}
          rotation={[Math.PI / 2.1, 0, 0]}
        />
        {/* Sculpted left studio rim strip */}
        <Lightformer
          form="rect"
          intensity={1.75}
          color="#F5F8FF"
          scale={[1.6, 7.5, 1]}
          position={[-8.8, 4.6, 2.2]}
          rotation={[0, Math.PI / 2.1, 0]}
        />
        {/* Warm right studio side strip */}
        <Lightformer
          form="rect"
          intensity={1.35}
          color="#FFF3E6"
          scale={[2.0, 6.8, 1]}
          position={[8.8, 4.4, 1.8]}
          rotation={[0, -Math.PI / 2.1, 0]}
        />
        {/* Gentle low-glare rear diffused softbox: illuminates outer anodized lid & 3D AURA logo clearly without blowing out front deck */}
        <Lightformer
          form="rect"
          intensity={1.08}
          color="#F0F2F6"
          scale={[12, 6.2, 1]}
          position={[0, 1.8, -9.4]}
        />
        {/* Subtle lower bounce card so underside cooling vents & rubber feet stay readable */}
        <Lightformer
          form="rect"
          intensity={0.78}
          color="#D2D8E2"
          scale={[11, 11, 1]}
          position={[0, -6.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </Environment>

      {/* ============================================================
          SYNCHRONIZED STUDIO LIGHT RIG (Color-morphed smoothly by GSAP)
          Balanced brightness so every chassis chamfer & 3D keycap reads clearly
         ============================================================ */}
      <ambientLight ref={ambientLightRef} intensity={0.86} color={initialTheme.ambientLightColor} />

      {/* Raking Hero Key Softbox Light (casts subtle contact depth across 3D keys & hinge) */}
      <directionalLight
        ref={keyLightRef}
        position={[4.6, 5.2, 5.0]}
        intensity={1.72}
        color={initialTheme.keyLightColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Sculptural Color-Matched Rear/Rim Light (lights outer lid back & bevel edges cleanly) */}
      <directionalLight
        ref={rimLightRef}
        position={[-4.8, 3.6, -5.2]}
        intensity={2.8}
        color={initialTheme.rimLightColor}
      />

      {/* Soft Front-Left Studio Fill (reveals dark keycap faces, ports & recessed keyboard pocket) */}
      <directionalLight
        ref={fillLightRef}
        position={[-4.6, 2.5, 4.6]}
        intensity={1.26}
        color={initialTheme.fillLightColor}
      />

      {/* Balanced rear-right fill so outer anodized lid stays vivid and legible across its full width */}
      <directionalLight position={[4.5, 3.0, -5.2]} intensity={1.38} color="#FFF7F0" />

      {/* Low grazing keycap-relief rim accent highlighting all 78 sculpted keycap bevels */}
      <pointLight position={[-2.6, 2.0, 2.8]} intensity={0.58} distance={14} color="#FFFFFF" />
      <pointLight position={[3.0, 2.1, 3.2]} intensity={0.38} distance={14} color="#FFF8F0" />

      {/* ============================================================
          HIERARCHICAL ANIMATED LAPTOP RIG
         ============================================================ */}
      <group ref={stageGroupRef}>
        <group ref={poseGroupRef}>
          <group ref={spinGroupRef}>
            <group ref={userGroupRef}>
              {/* Offset slightly on Y so center of open laptop sits right on the rotation origin */}
              <group position={[0, -0.34, 0.14]}>
                <AuraLaptop
                  ref={laptopRef}
                  initialColor={selectedColor}
                  reducedMotion={reducedMotion}
                />
              </group>
            </group>
          </group>
        </group>

        {/* Soft Studio Contact Shadow grounded directly under the floating laptop */}
        <mesh
          ref={floorShadowRef}
          position={[0, -0.96, 0.1]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[4.5, 3.3, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={floorShadowTex}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}
