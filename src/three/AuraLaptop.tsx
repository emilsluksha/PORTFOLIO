import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AURA_FINISHES } from '../data/finishes'
import type { AuraColorId } from '../types/aura'
import { buildMergedSculptedKeyboardGeometry } from './keyboardGeometry'
import { getKeyboardLayout } from './keyboardLayout'
import { getProceduralTextures } from './proceduralTextures'
import { getColorTexturePack } from './texturePack'
import { createAuraWallpaperMaterial, type WallpaperUniforms } from './wallpaperShader'

export interface AuraLaptopHandle {
  lidPivot: THREE.Group | null
  chassisMaterial: THREE.MeshPhysicalMaterial
  lidMaterial: THREE.MeshPhysicalMaterial
  bottomMaterial: THREE.MeshPhysicalMaterial
  chamferMaterial: THREE.MeshPhysicalMaterial
  trackpadMaterial: THREE.MeshPhysicalMaterial
  logoMaterial: THREE.MeshPhysicalMaterial
  keyTopMaterial: THREE.MeshPhysicalMaterial
  wallpaperUniforms: WallpaperUniforms
  keyboardUnderGlowMaterial: THREE.MeshBasicMaterial
  applyColorTextures: (color: AuraColorId) => void
  getScreenTexture: (color: AuraColorId) => THREE.Texture
}

interface AuraLaptopProps {
  initialColor: AuraColorId
  reducedMotion: boolean
}

const LAPTOP_W = 3.24
const LAPTOP_D = 2.22
const CORNER_R = 0.145

/** Creates a centered 2D rounded rectangle Shape */
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(radius, hw, hh)

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return shape
}

/** Creates an offset rounded rectangle Path suitable for ExtrudeGeometry cutouts */
function createRoundedHolePath(
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number
): THREE.Path {
  const path = new THREE.Path()
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(radius, hw, hh)

  // Clockwise winding for hole cutouts inside CCW outer shape
  path.moveTo(cx - hw + r, cy - hh)
  path.lineTo(cx - hw, cy - hh + r)
  path.lineTo(cx - hw, cy + hh - r)
  path.quadraticCurveTo(cx - hw, cy + hh, cx - hw + r, cy + hh)
  path.lineTo(cx + hw - r, cy + hh)
  path.quadraticCurveTo(cx + hw, cy + hh, cx + hw, cy + hh - r)
  path.lineTo(cx + hw, cy - hh + r)
  path.quadraticCurveTo(cx + hw, cy - hh, cx + hw - r, cy - hh)
  path.lineTo(cx - hw + r, cy - hh)
  return path
}

/** Creates a pill/capsule shape for side ports, feet, and thumb notch */
function createCapsuleShape(width: number, height: number): THREE.Shape {
  return createRoundedRectShape(width, height, height / 2)
}

/**
 * Normalizes ExtrudeGeometry UVs cleanly to [0.002..0.998] planar coordinates across
 * the full slab bounds so extracted anodized metal & lid textures map 1:1 with zero stretch.
 */
function applyNormalizedPlanarUVs(
  geo: THREE.ExtrudeGeometry,
  width: number,
  height: number
): void {
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const hw = width / 2
  const hh = height / 2

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const u = THREE.MathUtils.clamp((x + hw) / width, 0.003, 0.997)
    const v = THREE.MathUtils.clamp((y + hh) / height, 0.003, 0.997)
    uv.setXY(i, u, v)
  }
  uv.needsUpdate = true
}

/** Builds a clean extruded rounded slab with normalized planar [0..1] UVs */
function createExtrudedSlab(
  width: number,
  height: number,
  radius: number,
  depth: number,
  bevelThickness: number,
  bevelSize: number,
  bevelSegments = 4,
  hole?: { cx: number; cy: number; w: number; h: number; r: number }
): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(
    width - bevelSize * 2,
    height - bevelSize * 2,
    Math.max(0.01, radius - bevelSize)
  )
  if (hole) {
    // Expand hole by bevelSize*2 so the finished beveled top lip lands cleanly on the desired pocket bounds
    shape.holes.push(
      createRoundedHolePath(
        hole.cx,
        hole.cy,
        hole.w + bevelSize * 1.85,
        hole.h + bevelSize * 1.85,
        hole.r + bevelSize * 0.4
      )
    )
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments: 20,
  })
  applyNormalizedPlanarUVs(geo, width, height)
  geo.computeVertexNormals()
  return geo
}

/** Builds a precision hollow rounded perimeter frame for the rubber display gasket */
function createRoundedFrameGeometry(
  outerW: number,
  outerH: number,
  outerR: number,
  thickness: number
): THREE.ShapeGeometry {
  const outer = createRoundedRectShape(outerW, outerH, outerR)
  const hole = new THREE.Path()
  const iw = outerW / 2 - thickness
  const ih = outerH / 2 - thickness
  const ir = Math.max(0.01, outerR - thickness)

  hole.moveTo(-iw + ir, -ih)
  hole.lineTo(iw - ir, -ih)
  hole.quadraticCurveTo(iw, -ih, iw, -ih + ir)
  hole.lineTo(iw, ih - ir)
  hole.quadraticCurveTo(iw, ih, iw - ir, ih)
  hole.lineTo(-iw + ir, ih)
  hole.quadraticCurveTo(-iw, ih, -iw, ih - ir)
  hole.lineTo(-iw, -ih + ir)
  hole.quadraticCurveTo(-iw, -ih, -iw + ir, -ih)

  outer.holes.push(hole)
  return new THREE.ShapeGeometry(outer, 20)
}

export const AuraLaptop = forwardRef<AuraLaptopHandle, AuraLaptopProps>(
  function AuraLaptop({ initialColor, reducedMotion }, ref) {
    const lidPivotRef = useRef<THREE.Group | null>(null)

    const textures = useMemo(() => getProceduralTextures(), [])
    const colorPack = useMemo(() => getColorTexturePack(), [])
    const keyboard = useMemo(() => getKeyboardLayout(), [])

    const kbCenterZ = -0.255
    const trackpadCenterZ = 0.655
    const hingeZ = -LAPTOP_D / 2 + 0.032
    const kbWellFloorY = -0.0095

    // Create reusable PBR materials ONCE (smoothly updated by StudioScene without scene rebuilds)
    const materials = useMemo(() => {
      const theme = AURA_FINISHES[initialColor]
      const texSet = colorPack[initialColor]

      // Anodized machined aluminum lower body & side profile (pure metallic brushed response, zero white plastic washout)
      const chassisMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FFFFFF'),
        map: texSet.metal,
        metalness: 0.71,
        roughness: 0.36,
        roughnessMap: textures.anodizedRoughness,
        bumpMap: textures.anodizedBump,
        bumpScale: 0.0014,
        clearcoat: 0.0,
        envMapIntensity: 0.96,
      })

      // Outer anodized aluminum display lid (mapped 1:1 with user's extracted per-color lid texture)
      const lidMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FFFFFF'),
        map: texSet.lid,
        metalness: 0.72,
        roughness: 0.34,
        roughnessMap: textures.anodizedRoughness,
        bumpMap: textures.anodizedBump,
        bumpScale: 0.0013,
        clearcoat: 0.0,
        envMapIntensity: 1.08,
      })

      // Underside machined bottom plate (mapped 1:1 with cooling vents, Torx screws & AURA ONE etching)
      const bottomMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FAFAFC'),
        map: texSet.bottom,
        metalness: 0.71,
        roughness: 0.37,
        roughnessMap: textures.anodizedRoughness,
        bumpMap: textures.anodizedBump,
        bumpScale: 0.0012,
        envMapIntensity: 0.98,
      })

      // Diamond-cut chamfer trim & hinge collars
      const chamferMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.chassisAccent),
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.12,
        clearcoatRoughness: 0.24,
        envMapIntensity: 1.4,
      })

      // Color-matched satin etched glass haptic trackpad (distinct smooth glass feel without grazing white washout)
      const trackpadMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.trackpadTint),
        metalness: 0.44,
        roughness: 0.26,
        clearcoat: 0.14,
        clearcoatRoughness: 0.28,
        envMapIntensity: 0.78,
      })

      // Sculpted inlaid polished metallic AURA halo monogram on lid back
      const logoMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.logoTint),
        metalness: 0.96,
        roughness: 0.08,
        clearcoat: 0.5,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.95,
      })

      // Dark anodized clutch hinge, recessed trims, camera bezel
      const darkAnodizedMaterial = new THREE.MeshStandardMaterial({
        color: '#101115',
        metalness: 0.65,
        roughness: 0.4,
        envMapIntensity: 0.88,
      })

      // Recessed keyboard pocket sub-plate with per-key contact shadows & ambient occlusion
      const kbWellFloorMaterial = new THREE.MeshStandardMaterial({
        map: textures.keyboardWellAO,
        metalness: 0.22,
        roughness: 0.72,
        envMapIntensity: 0.45,
      })

      // Sculpted 3D keycap beveled sides & tapered skirts (dark matte polymer with subtle edge sheen)
      const keySideMaterial = new THREE.MeshPhysicalMaterial({
        color: '#121318',
        metalness: 0.12,
        roughness: 0.42,
        clearcoat: 0.2,
        clearcoatRoughness: 0.34,
        envMapIntensity: 1.05,
      })

      // Sculpted 3D keycap concave top surface (matte polymer + direct crisp backlit legends)
      const keyTopMaterial = new THREE.MeshPhysicalMaterial({
        map: textures.keyboardTopAlbedo,
        emissive: new THREE.Color('#F5F6FA'),
        emissiveMap: textures.keyboardTopEmissive,
        emissiveIntensity: 0.42,
        metalness: 0.06,
        roughness: 0.56,
        clearcoat: 0.08,
        clearcoatRoughness: 0.44,
        envMapIntensity: 0.72,
      })

      // Subtle under-key backlight spill glowing gently through physical gaps between keys
      const keyboardUnderGlowMaterial = new THREE.MeshBasicMaterial({
        color: '#F4F3EE',
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
      })

      const portCavityMaterial = new THREE.MeshStandardMaterial({
        color: '#050507',
        metalness: 0.28,
        roughness: 0.76,
      })

      const goldPinMaterial = new THREE.MeshStandardMaterial({
        color: '#E0BA65',
        metalness: 0.96,
        roughness: 0.16,
      })

      const rubberMaterial = new THREE.MeshStandardMaterial({
        color: '#0B0C0F',
        metalness: 0.02,
        roughness: 0.88,
      })

      // Deep laminated obsidian display bezel
      const bezelMaterial = new THREE.MeshPhysicalMaterial({
        color: '#040507',
        metalness: 0.08,
        roughness: 0.14,
        clearcoat: 0.88,
        clearcoatRoughness: 0.07,
        envMapIntensity: 0.72,
      })

      // Restrained optical glass cover sheen (subtle reflection without obscuring wallpaper)
      const glassOverlayMaterial = new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.042,
        metalness: 0.1,
        roughness: 0.04,
        clearcoat: 0.92,
        clearcoatRoughness: 0.035,
        envMapIntensity: 1.12,
        depthWrite: false,
      })

      const speakerMaterial = new THREE.MeshBasicMaterial({
        map: textures.speakerGrille,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })

      const bezelWordmarkMaterial = new THREE.MeshBasicMaterial({
        map: textures.bezelWordmark,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })

      const trackpadAOMaterial = new THREE.MeshBasicMaterial({
        map: textures.trackpadAO,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
      })

      const wallpaper = createAuraWallpaperMaterial(texSet.screen)

      return {
        chassisMaterial,
        lidMaterial,
        bottomMaterial,
        chamferMaterial,
        trackpadMaterial,
        logoMaterial,
        darkAnodizedMaterial,
        kbWellFloorMaterial,
        keySideMaterial,
        keyTopMaterial,
        keyboardUnderGlowMaterial,
        portCavityMaterial,
        goldPinMaterial,
        rubberMaterial,
        bezelMaterial,
        glassOverlayMaterial,
        speakerMaterial,
        bezelWordmarkMaterial,
        trackpadAOMaterial,
        wallpaperMaterial: wallpaper.material,
        wallpaperUniforms: wallpaper.uniforms,
      }
      // Created once on mount; StudioScene updates textures & colors cleanly without remounting
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textures, colorPack])

    // Reusable procedural geometries built ONCE
    const geometries = useMemo(() => {
      // Lower unibody top deck WITH REAL PHYSICAL BEVELED KEYBOARD POCKET CUTOUT!
      // Remember under rotation [-PI/2, 0, 0], shapeY = -worldZ -> hole cy = -kbCenterZ = +0.255
      const baseMain = createExtrudedSlab(
        LAPTOP_W,
        LAPTOP_D,
        CORNER_R,
        0.044,
        0.012,
        0.012,
        5,
        {
          cx: 0,
          cy: -kbCenterZ,
          w: keyboard.totalWidth + 0.068,
          h: keyboard.totalDepth + 0.058,
          r: 0.034,
        }
      )

      // Sculpted lower tapered bottom plate contour
      const baseUnderbelly = createExtrudedSlab(
        LAPTOP_W - 0.064,
        LAPTOP_D - 0.064,
        CORNER_R - 0.02,
        0.016,
        0.008,
        0.012,
        4
      )

      // Flat crisp underside texture plane for vents, screws & AURA ONE etching (normalized UVs)
      const bottomDetailShape = createRoundedRectShape(
        LAPTOP_W - 0.14,
        LAPTOP_D - 0.14,
        CORNER_R - 0.035
      )
      const bottomDetailPlate = new THREE.ShapeGeometry(bottomDetailShape, 20)
      {
        const pos = bottomDetailPlate.attributes.position
        const uv = bottomDetailPlate.attributes.uv
        const bw = LAPTOP_W - 0.14
        const bd = LAPTOP_D - 0.14
        for (let i = 0; i < pos.count; i++) {
          uv.setXY(i, (pos.getX(i) + bw / 2) / bw, (pos.getY(i) + bd / 2) / bd)
        }
        uv.needsUpdate = true
      }

      // Sculpted rounded-capsule rubber feet (matching attached underside sheets)
      const footBezelGeo = new THREE.ExtrudeGeometry(createCapsuleShape(0.24, 0.088), {
        depth: 0.007,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      footBezelGeo.center()

      const footPadGeo = new THREE.ExtrudeGeometry(createCapsuleShape(0.215, 0.072), {
        depth: 0.008,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      footPadGeo.center()

      // Ultra-thin display lid aluminum shell with normalized [0..1] planar UVs
      const lidShell = createExtrudedSlab(LAPTOP_W, LAPTOP_D, CORNER_R, 0.022, 0.007, 0.007, 4)

      // Edge-to-edge inner display glass / bezel plate
      const bezelShape = createRoundedRectShape(LAPTOP_W - 0.06, LAPTOP_D - 0.06, CORNER_R - 0.022)
      const bezelPlate = new THREE.ShapeGeometry(bezelShape, 20)

      // Perimeter micro rubber display seal gasket
      const gasketFrame = createRoundedFrameGeometry(
        LAPTOP_W - 0.046,
        LAPTOP_D - 0.046,
        CORNER_R - 0.018,
        0.015
      )

      // Merged 78-key sculpted 3D beveled + concave-top physical keyboard (1 draw call per group!)
      const sculptedKeyboard = buildMergedSculptedKeyboardGeometry(
        keyboard.keys,
        keyboard.totalWidth,
        keyboard.totalDepth
      )

      // Trackpad satin glass & subtle recessed border
      const trackpadShape = createRoundedRectShape(1.26, 0.74, 0.042)
      const trackpadGeo = new THREE.ShapeGeometry(trackpadShape, 16)

      const trackpadRimShape = createRoundedRectShape(1.278, 0.758, 0.046)
      const trackpadRimGeo = new THREE.ShapeGeometry(trackpadRimShape, 16)

      // Thumb-lift ergonomic front cutout capsule
      const thumbNotch = new THREE.ExtrudeGeometry(createCapsuleShape(0.46, 0.024), {
        depth: 0.028,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 3,
      })
      thumbNotch.center()

      // Side precision I/O ports with subtle machined outer collar sleeves
      const usbOuter = new THREE.ExtrudeGeometry(createCapsuleShape(0.098, 0.032), {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      usbOuter.center()

      const usbCapsule = new THREE.ExtrudeGeometry(createCapsuleShape(0.084, 0.023), {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      usbCapsule.center()

      const magOuter = new THREE.ExtrudeGeometry(createCapsuleShape(0.158, 0.034), {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      magOuter.center()

      const magCapsule = new THREE.ExtrudeGeometry(createCapsuleShape(0.144, 0.025), {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      magCapsule.center()

      const sdSlot = new THREE.ExtrudeGeometry(createCapsuleShape(0.21, 0.018), {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.0015,
        bevelSize: 0.0015,
        bevelSegments: 2,
      })
      sdSlot.center()

      return {
        baseMain,
        baseUnderbelly,
        bottomDetailPlate,
        footBezelGeo,
        footPadGeo,
        lidShell,
        bezelPlate,
        gasketFrame,
        sculptedKeyboard,
        trackpadGeo,
        trackpadRimGeo,
        thumbNotch,
        usbOuter,
        usbCapsule,
        magOuter,
        magCapsule,
        sdSlot,
      }
    }, [keyboard.keys, keyboard.totalDepth, keyboard.totalWidth, kbCenterZ])

    // Find Touch ID / Power key position to place a real 3D tactile metallic sensor ring
    const powerKey = useMemo(() => keyboard.keys.find((k) => k.isPower), [keyboard.keys])

    // Clean up GPU geometries & materials on unmount
    useEffect(() => {
      return () => {
        Object.values(geometries).forEach((g) => g.dispose())
        Object.values(materials).forEach((m) => {
          if (m instanceof THREE.Material) m.dispose()
        })
      }
    }, [geometries, materials])

    // Expose imperative handle to StudioScene (zero React re-renders during animations/color morphs)
    useImperativeHandle(
      ref,
      () => ({
        get lidPivot() {
          return lidPivotRef.current
        },
        chassisMaterial: materials.chassisMaterial,
        lidMaterial: materials.lidMaterial,
        bottomMaterial: materials.bottomMaterial,
        chamferMaterial: materials.chamferMaterial,
        trackpadMaterial: materials.trackpadMaterial,
        logoMaterial: materials.logoMaterial,
        keyTopMaterial: materials.keyTopMaterial,
        wallpaperUniforms: materials.wallpaperUniforms,
        keyboardUnderGlowMaterial: materials.keyboardUnderGlowMaterial,
        applyColorTextures: (color: AuraColorId) => {
          const nextSet = colorPack[color]
          materials.chassisMaterial.map = nextSet.metal
          materials.chassisMaterial.needsUpdate = true
          materials.lidMaterial.map = nextSet.lid
          materials.lidMaterial.needsUpdate = true
          materials.bottomMaterial.map = nextSet.bottom
          materials.bottomMaterial.needsUpdate = true
        },
        getScreenTexture: (color: AuraColorId) => colorPack[color].screen,
      }),
      [materials, colorPack]
    )

    // Animate subtle living OLED wallpaper sheen
    useFrame((_, delta) => {
      if (!reducedMotion) {
        materials.wallpaperUniforms.uTime.value += Math.min(delta, 0.05)
      }
    })

    const kbMaterialPair = useMemo(
      () => [materials.keySideMaterial, materials.keyTopMaterial],
      [materials.keySideMaterial, materials.keyTopMaterial]
    )

    return (
      <group name="aura-one-laptop">
        {/* ============================================================
            1. LOWER UNIBODY ALUMINUM CHASSIS (Top deck flush at y = 0)
           ============================================================ */}
        <group name="lower-chassis">
          {/* Primary CNC-milled anodized aluminum body with real physical recessed keyboard cutout */}
          <mesh
            geometry={geometries.baseMain}
            material={materials.chassisMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.056, 0]}
            castShadow
            receiveShadow
          />

          {/* Sculpted lower bottom plate contour */}
          <mesh
            geometry={geometries.baseUnderbelly}
            material={materials.chassisMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.083, 0]}
            castShadow
            receiveShadow
          />

          {/* Underside machined plate with dual cooling intake vents, perimeter Torx screws & AURA ONE etching */}
          <mesh
            geometry={geometries.bottomDetailPlate}
            material={materials.bottomMaterial}
            position={[0, -0.0915, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          {/* Four sleek low-profile sculpted capsule rubber feet with metallic housing collars */}
          {[
            [-1.24, -0.82],
            [1.24, -0.82],
            [-1.24, 0.82],
            [1.24, 0.82],
          ].map(([fx, fz], idx) => (
            <group key={idx} position={[fx, -0.094, fz]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={geometries.footBezelGeo} material={materials.darkAnodizedMaterial} />
              <mesh
                geometry={geometries.footPadGeo}
                position={[0, 0, 0.004]}
                material={materials.rubberMaterial}
              />
            </group>
          ))}

          {/* Front ergonomic thumb-lift cutout notch */}
          <mesh
            geometry={geometries.thumbNotch}
            material={materials.darkAnodizedMaterial}
            position={[0, -0.011, LAPTOP_D / 2 - 0.006]}
          />

          {/* ============================================================
              PHYSICAL RECESSED 3D KEYBOARD ASSEMBLY
             ============================================================ */}
          <group name="physical-keyboard-assembly" position={[0, 0, kbCenterZ]}>
            {/* Recessed matte-obsidian sub-plate floor with per-key contact shadows & wall AO */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, kbWellFloorY, 0]}
              material={materials.kbWellFloorMaterial}
              receiveShadow
            >
              <planeGeometry args={[keyboard.totalWidth + 0.092, keyboard.totalDepth + 0.082]} />
            </mesh>

            {/* Subtle warm-white backlight spill peeking through physical gaps between keys */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, kbWellFloorY + 0.0012, 0]}
              material={materials.keyboardUnderGlowMaterial}
            >
              <planeGeometry args={[keyboard.totalWidth + 0.02, keyboard.totalDepth + 0.02]} />
            </mesh>

            {/* 78 Individually Sculpted 3D Beveled, Tapered, Concave-Top Keycaps (merged single draw-call geometry) */}
            <mesh
              geometry={geometries.sculptedKeyboard}
              material={kbMaterialPair}
              position={[0, kbWellFloorY, 0]}
              castShadow
              receiveShadow
            />

            {/* Tactile physical metallic Touch ID sensor ring inlaid on top-right power key */}
            {powerKey && (
              <mesh
                position={[powerKey.x, kbWellFloorY + 0.0185, powerKey.z]}
                rotation={[-Math.PI / 2, 0, 0]}
                material={materials.chamferMaterial}
              >
                <torusGeometry args={[Math.min(powerKey.w, powerKey.d) * 0.28, 0.0022, 12, 32]} />
              </mesh>
            )}
          </group>

          {/* Dual Flanking Acoustic Micro-Perforated Speaker Grilles */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-1.375, 0.0008, kbCenterZ]}
            material={materials.speakerMaterial}
          >
            <planeGeometry args={[0.24, keyboard.totalDepth + 0.04]} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[1.375, 0.0008, kbCenterZ]}
            material={materials.speakerMaterial}
          >
            <planeGeometry args={[0.24, keyboard.totalDepth + 0.04]} />
          </mesh>

          {/* Large Precision Haptic Satin Glass Trackpad with fine recessed dark boundary & chamfer lip */}
          <mesh
            geometry={geometries.trackpadRimGeo}
            material={materials.darkAnodizedMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0004, trackpadCenterZ]}
          />
          <mesh
            geometry={geometries.trackpadGeo}
            material={materials.trackpadMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.001, trackpadCenterZ]}
            receiveShadow
          />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0014, trackpadCenterZ]}
            material={materials.trackpadAOMaterial}
          >
            <planeGeometry args={[1.28, 0.76]} />
          </mesh>

          {/* ============================================================
              SIDE PROFILES & PRECISION I/O PORTS
             ============================================================ */}
          {/* LEFT EDGE (x = -LAPTOP_W / 2) */}
          <group position={[-LAPTOP_W / 2 + 0.002, -0.036, 0]} rotation={[0, -Math.PI / 2, 0]}>
            {/* Magnetic AURA Power Connector with chamfer collar & gold contact micro-pins */}
            <group position={[-0.72, 0, 0]}>
              <mesh geometry={geometries.magOuter} material={materials.chamferMaterial} />
              <mesh
                position={[0, 0, 0.001]}
                geometry={geometries.magCapsule}
                material={materials.portCavityMaterial}
              />
              {[-0.04, -0.02, 0, 0.02, 0.04].map((px, i) => (
                <mesh key={i} position={[px, 0, 0.005]} material={materials.goldPinMaterial}>
                  <boxGeometry args={[0.008, 0.007, 0.008]} />
                </mesh>
              ))}
            </group>

            {/* Dual Thunderbolt 5 / USB-C Ports with anodized collar + interior contact tongue */}
            {[-0.44, -0.25].map((pz, i) => (
              <group key={i} position={[pz, 0, 0]}>
                <mesh geometry={geometries.usbOuter} material={materials.chamferMaterial} />
                <mesh
                  position={[0, 0, 0.001]}
                  geometry={geometries.usbCapsule}
                  material={materials.portCavityMaterial}
                />
                <mesh position={[0, 0, 0.004]} material={materials.darkAnodizedMaterial}>
                  <boxGeometry args={[0.056, 0.0045, 0.01]} />
                </mesh>
              </group>
            ))}

            {/* 3.5mm Precision Studio Headphone Jack */}
            <group position={[-0.04, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.chamferMaterial}>
                <cylinderGeometry args={[0.021, 0.021, 0.012, 24]} />
              </mesh>
              <mesh
                position={[0, 0, 0.0025]}
                rotation={[Math.PI / 2, 0, 0]}
                material={materials.portCavityMaterial}
              >
                <cylinderGeometry args={[0.0145, 0.0145, 0.015, 24]} />
              </mesh>
            </group>
          </group>

          {/* RIGHT EDGE (x = +LAPTOP_W / 2) */}
          <group position={[LAPTOP_W / 2 - 0.002, -0.036, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Thunderbolt 5 / USB-C Port */}
            <group position={[0.64, 0, 0]}>
              <mesh geometry={geometries.usbOuter} material={materials.chamferMaterial} />
              <mesh
                position={[0, 0, 0.001]}
                geometry={geometries.usbCapsule}
                material={materials.portCavityMaterial}
              />
              <mesh position={[0, 0, 0.004]} material={materials.darkAnodizedMaterial}>
                <boxGeometry args={[0.056, 0.0045, 0.01]} />
              </mesh>
            </group>

            {/* Flush SDXC Card Reader Slot */}
            <mesh
              position={[0.34, 0, 0]}
              geometry={geometries.sdSlot}
              material={materials.portCavityMaterial}
            />

            {/* Precision acoustic / micro-vent accent */}
            <mesh position={[0.06, -0.002, 0]} material={materials.portCavityMaterial}>
              <boxGeometry args={[0.15, 0.0075, 0.012]} />
            </mesh>
          </group>

          {/* ============================================================
              ARTICULATED REAR CLUTCH HINGE & THERMAL EXHAUST CHANNEL
             ============================================================ */}
          <group position={[0, -0.003, hingeZ]}>
            {/* Recessed rear hinge & thermal exhaust trough */}
            <mesh position={[0, -0.008, -0.006]} material={materials.portCavityMaterial}>
              <boxGeometry args={[2.22, 0.04, 0.064]} />
            </mesh>
            {/* Primary precision matte clutch cylinder barrel */}
            <mesh rotation={[0, 0, Math.PI / 2]} material={materials.darkAnodizedMaterial}>
              <cylinderGeometry args={[0.028, 0.028, 2.04, 24]} />
            </mesh>
            {/* Machined color-matched metallic hinge end-collars */}
            {[-1.048, 1.048].map((hx, idx) => (
              <mesh
                key={idx}
                position={[hx, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                material={materials.chamferMaterial}
              >
                <cylinderGeometry args={[0.031, 0.031, 0.046, 24]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ============================================================
            2. ARTICULATED DISPLAY LID ASSEMBLY (Exact hinge pivot at y = 0.0155)
               Clears all sculpted 3D keycaps (+0.0103) cleanly when fully closed!
               rotation.x = +Math.PI/2 -> Fully Closed (flush on deck)
               rotation.x = 0          -> 90° Upright
               rotation.x = -0.31      -> 108° Open (Workstation Stance)
           ============================================================ */}
        <group
          ref={lidPivotRef}
          name="lid-pivot"
          position={[0, 0.0155, -LAPTOP_D / 2]}
          rotation={[-0.31, 0, 0]}
        >
          {/* Seamless dark-anodized hinge clutch bridge anchoring lid cleanly into rear barrel */}
          <mesh
            position={[0, 0.011, -0.018]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.darkAnodizedMaterial}
          >
            <cylinderGeometry args={[0.024, 0.024, 2.02, 20]} />
          </mesh>

          {/* Shift lid center cleanly so localY = 0 sits precisely at the hinge edge */}
          <group position={[0, LAPTOP_D / 2, 0]}>
            {/* Outer CNC-machined anodized aluminum display shell (mapped 1:1 with user's lid.jpg!) */}
            <mesh
              geometry={geometries.lidShell}
              material={materials.lidMaterial}
              position={[0, 0, -0.036]}
              castShadow
              receiveShadow
            />

            {/* Sculpted 3D inlaid mirror-metallic AURA halo emblem on outer lid back (-Z) */}
            <group position={[0, 0.02, -0.0434]} rotation={[0, Math.PI, 0]}>
              {/* Outer 3D beveled metallic halo ring */}
              <mesh material={materials.logoMaterial}>
                <torusGeometry args={[0.178, 0.012, 16, 64]} />
              </mesh>
              {/* Inner 3D open crescent orbital ring */}
              <mesh material={materials.logoMaterial} rotation={[0, 0, Math.PI * 0.25]}>
                <torusGeometry args={[0.082, 0.0085, 14, 48, Math.PI * 1.48]} />
              </mesh>
              {/* Sculpted center medallion orb */}
              <mesh material={materials.logoMaterial} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.023, 0.025, 0.007, 28]} />
              </mesh>
            </group>

            {/* Inner perimeter matte black rubber display seal gasket */}
            <mesh
              geometry={geometries.gasketFrame}
              material={materials.rubberMaterial}
              position={[0, 0, 0.0005]}
            />

            {/* Edge-to-edge satin obsidian display bezel */}
            <mesh
              geometry={geometries.bezelPlate}
              material={materials.bezelMaterial}
              position={[0, 0, -0.0038]}
            />

            {/* Texture-Driven OLED Wallpaper Display (user's extracted Red/Blue/Green/Gold wallpapers!) */}
            <mesh position={[0, 0.038, -0.0018]} material={materials.wallpaperMaterial}>
              <planeGeometry args={[3.04, 1.91]} />
            </mesh>

            {/* Subtle lower chin matte AURA ONE wordmark */}
            <mesh position={[0, -0.995, -0.0012]} material={materials.bezelWordmarkMaterial}>
              <planeGeometry args={[0.62, 0.078]} />
            </mesh>

            {/* 1080p Studio Camera optical assembly in top bezel */}
            <group position={[0, 1.036, -0.001]}>
              <mesh material={materials.darkAnodizedMaterial}>
                <circleGeometry args={[0.022, 24]} />
              </mesh>
              <mesh position={[0, 0, 0.0005]}>
                <circleGeometry args={[0.011, 20]} />
                <meshPhysicalMaterial
                  color="#163159"
                  metalness={0.32}
                  roughness={0.05}
                  clearcoat={1}
                />
              </mesh>
              <mesh position={[0.048, 0, 0.0004]} material={materials.darkAnodizedMaterial}>
                <circleGeometry args={[0.007, 16]} />
              </mesh>
            </group>

            {/* Laminated optical cover glass catching restrained studio reflections */}
            <mesh
              geometry={geometries.bezelPlate}
              material={materials.glassOverlayMaterial}
              position={[0, 0, -0.0002]}
            />
          </group>
        </group>
      </group>
    )
  }
)
