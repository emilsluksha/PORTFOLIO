import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AURA_FINISHES } from '../data/finishes'
import type { AuraColorId } from '../types/aura'
import { getKeyboardLayout } from './keyboardLayout'
import { getProceduralTextures } from './proceduralTextures'
import { createAuraWallpaperMaterial, type WallpaperUniforms } from './wallpaperShader'

export interface AuraLaptopHandle {
  lidPivot: THREE.Group | null
  chassisMaterial: THREE.MeshPhysicalMaterial
  chamferMaterial: THREE.MeshPhysicalMaterial
  trackpadMaterial: THREE.MeshPhysicalMaterial
  logoMaterial: THREE.MeshPhysicalMaterial
  wallpaperUniforms: WallpaperUniforms
  keyboardLegendMaterial: THREE.MeshBasicMaterial
  keyboardUnderGlowMaterial: THREE.MeshBasicMaterial
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

/** Creates a pill/capsule shape for side ports and thumb notch */
function createCapsuleShape(width: number, height: number): THREE.Shape {
  return createRoundedRectShape(width, height, height / 2)
}

/** Builds a clean extruded rounded geometry centered nicely */
function createExtrudedSlab(
  width: number,
  height: number,
  radius: number,
  depth: number,
  bevelThickness: number,
  bevelSize: number,
  bevelSegments = 4
): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(width - bevelSize * 2, height - bevelSize * 2, Math.max(0.01, radius - bevelSize))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments: 20,
  })
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
    const keysInstancedRef = useRef<THREE.InstancedMesh | null>(null)

    const textures = useMemo(() => getProceduralTextures(), [])
    const keyboard = useMemo(() => getKeyboardLayout(), [])

    // Create reusable PBR materials ONCE (mutated smoothly by StudioScene)
    const materials = useMemo(() => {
      const theme = AURA_FINISHES[initialColor]

      const chassisMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.chassisColor),
        metalness: 0.91,
        roughness: 0.31,
        roughnessMap: textures.anodizedRoughness,
        bumpMap: textures.anodizedBump,
        bumpScale: 0.0012,
        clearcoat: 0.08,
        clearcoatRoughness: 0.36,
        envMapIntensity: 1.38,
      })

      const chamferMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.chassisAccent),
        metalness: 0.95,
        roughness: 0.16,
        clearcoat: 0.18,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.65,
      })

      const trackpadMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.trackpadTint),
        metalness: 0.56,
        roughness: 0.24,
        clearcoat: 0.24,
        clearcoatRoughness: 0.26,
        envMapIntensity: 1.05,
      })

      const logoMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(theme.logoTint),
        metalness: 0.98,
        roughness: 0.06,
        clearcoat: 0.6,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.1,
      })

      const darkAnodizedMaterial = new THREE.MeshStandardMaterial({
        color: '#111216',
        metalness: 0.62,
        roughness: 0.42,
        envMapIntensity: 0.9,
      })

      const portCavityMaterial = new THREE.MeshStandardMaterial({
        color: '#060608',
        metalness: 0.3,
        roughness: 0.72,
      })

      const goldPinMaterial = new THREE.MeshStandardMaterial({
        color: '#D8B362',
        metalness: 0.95,
        roughness: 0.18,
      })

      const keycapMaterial = new THREE.MeshPhysicalMaterial({
        color: '#18191D',
        metalness: 0.08,
        roughness: 0.54,
        clearcoat: 0.08,
        clearcoatRoughness: 0.45,
        envMapIntensity: 0.75,
      })

      const rubberMaterial = new THREE.MeshStandardMaterial({
        color: '#0A0B0D',
        metalness: 0.02,
        roughness: 0.9,
      })

      const bezelMaterial = new THREE.MeshPhysicalMaterial({
        color: '#030305',
        metalness: 0.06,
        roughness: 0.16,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.65,
      })

      const glassOverlayMaterial = new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.048,
        metalness: 0.12,
        roughness: 0.04,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.25,
        depthWrite: false,
      })

      const keyboardLegendMaterial = new THREE.MeshBasicMaterial({
        map: textures.keyboardLegends,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        toneMapped: false,
      })

      const keyboardUnderGlowMaterial = new THREE.MeshBasicMaterial({
        color: '#F4F1EA',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })

      const speakerMaterial = new THREE.MeshBasicMaterial({
        map: textures.speakerGrille,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      })

      const bezelWordmarkMaterial = new THREE.MeshBasicMaterial({
        map: textures.bezelWordmark,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })

      const undersideEngravingMaterial = new THREE.MeshBasicMaterial({
        map: textures.undersideEngraving,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      })

      const wallpaper = createAuraWallpaperMaterial(
        theme.wallpaperA,
        theme.wallpaperB,
        theme.wallpaperC
      )

      return {
        chassisMaterial,
        chamferMaterial,
        trackpadMaterial,
        logoMaterial,
        darkAnodizedMaterial,
        portCavityMaterial,
        goldPinMaterial,
        keycapMaterial,
        rubberMaterial,
        bezelMaterial,
        glassOverlayMaterial,
        keyboardLegendMaterial,
        keyboardUnderGlowMaterial,
        speakerMaterial,
        bezelWordmarkMaterial,
        undersideEngravingMaterial,
        wallpaperMaterial: wallpaper.material,
        wallpaperUniforms: wallpaper.uniforms,
      }
      // Intentionally created once per mount; StudioScene updates colors smoothly without rebuilding materials
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textures])

    // Reusable procedural geometries built once
    const geometries = useMemo(() => {
      // Lower unibody top deck (flat top rests at y = 0 when rotated -PI/2 around X and offset y = -0.068)
      const baseMain = createExtrudedSlab(LAPTOP_W, LAPTOP_D, CORNER_R, 0.044, 0.012, 0.012, 5)
      // Tapered lower aluminum bottom plate for genuine sculpted unibody contour
      const baseUnderbelly = createExtrudedSlab(
        LAPTOP_W - 0.065,
        LAPTOP_D - 0.065,
        CORNER_R - 0.02,
        0.014,
        0.008,
        0.012,
        4
      )
      // Ultra-thin display lid aluminum shell (extruded thickness ~0.036 total)
      const lidShell = createExtrudedSlab(LAPTOP_W, LAPTOP_D, CORNER_R, 0.022, 0.007, 0.007, 4)

      // Edge-to-edge inner display glass / bezel plate
      const bezelShape = createRoundedRectShape(LAPTOP_W - 0.06, LAPTOP_D - 0.06, CORNER_R - 0.022)
      const bezelPlate = new THREE.ShapeGeometry(bezelShape, 20)

      // Perimeter micro rubber gasket
      const gasketFrame = createRoundedFrameGeometry(
        LAPTOP_W - 0.046,
        LAPTOP_D - 0.046,
        CORNER_R - 0.018,
        0.015
      )

      // Recessed keyboard well tray
      const kbWellShape = createRoundedRectShape(
        keyboard.totalWidth + 0.085,
        keyboard.totalDepth + 0.075,
        0.038
      )
      const kbWell = new THREE.ShapeGeometry(kbWellShape, 12)

      // Trackpad glass & hairline chamfer perimeter
      const trackpadShape = createRoundedRectShape(1.26, 0.74, 0.042)
      const trackpadGeo = new THREE.ShapeGeometry(trackpadShape, 14)

      const trackpadRimShape = createRoundedRectShape(1.278, 0.758, 0.046)
      const trackpadRimGeo = new THREE.ShapeGeometry(trackpadRimShape, 14)

      // Thumb-lift ergonomic front cutout capsule
      const thumbNotch = new THREE.ExtrudeGeometry(createCapsuleShape(0.46, 0.024), {
        depth: 0.028,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 3,
      })
      thumbNotch.center()

      // Individual beveled keycap unit geometry (1×1 scaled per key via InstancedMesh!)
      const unitKeyGeo = new THREE.BoxGeometry(1, 1, 1)

      // USB-C port capsule geometry
      const usbCapsule = new THREE.ExtrudeGeometry(createCapsuleShape(0.086, 0.024), {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      usbCapsule.center()

      // Magnetic power port capsule geometry
      const magCapsule = new THREE.ExtrudeGeometry(createCapsuleShape(0.145, 0.026), {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      })
      magCapsule.center()

      // SDXC slot geometry
      const sdSlot = new THREE.ExtrudeGeometry(createCapsuleShape(0.21, 0.017), {
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.0015,
        bevelSize: 0.0015,
        bevelSegments: 2,
      })
      sdSlot.center()

      return {
        baseMain,
        baseUnderbelly,
        lidShell,
        bezelPlate,
        gasketFrame,
        kbWell,
        trackpadGeo,
        trackpadRimGeo,
        thumbNotch,
        unitKeyGeo,
        usbCapsule,
        magCapsule,
        sdSlot,
      }
    }, [keyboard.totalDepth, keyboard.totalWidth])

    // Populate InstancedMesh matrices for all 78 sculpted 3D keycaps
    useEffect(() => {
      const mesh = keysInstancedRef.current
      if (!mesh) return

      const dummy = new THREE.Object3D()
      const keyHeight = 0.0065

      keyboard.keys.forEach((k, index) => {
        dummy.position.set(k.x, keyHeight / 2 + 0.0008, k.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(k.w, keyHeight, k.d)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }, [keyboard.keys])

    // Clean up GPU geometries & materials on unmount
    useEffect(() => {
      return () => {
        Object.values(geometries).forEach((g) => g.dispose())
        Object.values(materials).forEach((m) => {
          if (m instanceof THREE.Material) m.dispose()
        })
      }
    }, [geometries, materials])

    // Expose imperative handle to StudioScene
    useImperativeHandle(
      ref,
      () => ({
        get lidPivot() {
          return lidPivotRef.current
        },
        chassisMaterial: materials.chassisMaterial,
        chamferMaterial: materials.chamferMaterial,
        trackpadMaterial: materials.trackpadMaterial,
        logoMaterial: materials.logoMaterial,
        wallpaperUniforms: materials.wallpaperUniforms,
        keyboardLegendMaterial: materials.keyboardLegendMaterial,
        keyboardUnderGlowMaterial: materials.keyboardUnderGlowMaterial,
      }),
      [materials]
    )

    // Animate living OLED wallpaper shader softly each frame
    useFrame((_, delta) => {
      if (!reducedMotion) {
        materials.wallpaperUniforms.uTime.value += Math.min(delta, 0.05)
      }
    })

    // Layout constants
    const kbCenterZ = -0.255
    const trackpadCenterZ = 0.655
    const hingeZ = -LAPTOP_D / 2 + 0.032

    return (
      <group name="aura-one-laptop">
        {/* ============================================================
            1. LOWER UNIBODY ALUMINUM CHASSIS (Top deck flush at y = 0)
           ============================================================ */}
        <group name="lower-chassis">
          {/* Primary CNC-milled anodized aluminum body */}
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
            position={[0, -0.081, 0]}
            castShadow
            receiveShadow
          />

          {/* Subtle underside laser engraving */}
          <mesh
            position={[0, -0.0895, 0.12]}
            rotation={[Math.PI / 2, 0, Math.PI]}
            material={materials.undersideEngravingMaterial}
          >
            <planeGeometry args={[1.55, 0.39]} />
          </mesh>

          {/* Four precision low-profile matte rubber feet with metallic bevel rings */}
          {[
            [-1.24, -0.82],
            [1.24, -0.82],
            [-1.24, 0.82],
            [1.24, 0.82],
          ].map(([fx, fz], idx) => (
            <group key={idx} position={[fx, -0.091, fz]}>
              <mesh material={materials.darkAnodizedMaterial}>
                <cylinderGeometry args={[0.092, 0.098, 0.008, 28]} />
              </mesh>
              <mesh position={[0, -0.0045, 0]} material={materials.rubberMaterial}>
                <cylinderGeometry args={[0.082, 0.086, 0.008, 28]} />
              </mesh>
            </group>
          ))}

          {/* Front ergonomic thumb-lift cutout notch */}
          <mesh
            geometry={geometries.thumbNotch}
            material={materials.darkAnodizedMaterial}
            position={[0, -0.011, LAPTOP_D / 2 - 0.006]}
          />

          {/* Recessed dark keyboard well */}
          <mesh
            geometry={geometries.kbWell}
            material={materials.darkAnodizedMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0006, kbCenterZ]}
            receiveShadow
          />

          {/* Subtle warm backlit keycap under-glow sheet */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0014, kbCenterZ]}
            material={materials.keyboardUnderGlowMaterial}
          >
            <planeGeometry args={[keyboard.totalWidth + 0.01, keyboard.totalDepth + 0.01]} />
          </mesh>

          {/* 78 Individually sculpted 3D instanced keycaps + high-res backlit legends */}
          <group position={[0, 0, kbCenterZ]}>
            <instancedMesh
              ref={keysInstancedRef}
              args={[geometries.unitKeyGeo, materials.keycapMaterial, keyboard.keys.length]}
              receiveShadow
            />

            {/* Crisp laser-etched backlit keycap legend atlas aligned 1:1 to every keycap top */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.0078, 0]}
              material={materials.keyboardLegendMaterial}
            >
              <planeGeometry args={[keyboard.totalWidth, keyboard.totalDepth]} />
            </mesh>
          </group>

          {/* Dual Flanking Acoustic Micro-Perforated Speaker Grilles */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-1.365, 0.0009, kbCenterZ]}
            material={materials.speakerMaterial}
          >
            <planeGeometry args={[0.25, keyboard.totalDepth + 0.04]} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[1.365, 0.0009, kbCenterZ]}
            material={materials.speakerMaterial}
          >
            <planeGeometry args={[0.25, keyboard.totalDepth + 0.04]} />
          </mesh>

          {/* Large Precision Haptic Glass Trackpad with diamond-cut chamfer perimeter */}
          <mesh
            geometry={geometries.trackpadRimGeo}
            material={materials.chamferMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0005, trackpadCenterZ]}
          />
          <mesh
            geometry={geometries.trackpadGeo}
            material={materials.trackpadMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.0012, trackpadCenterZ]}
            receiveShadow
          />

          {/* ============================================================
              SIDE PROFILES & PRECISION I/O PORTS
             ============================================================ */}
          {/* LEFT EDGE (x = -LAPTOP_W / 2) */}
          <group position={[-LAPTOP_W / 2 + 0.002, -0.036, 0]} rotation={[0, -Math.PI / 2, 0]}>
            {/* Magnetic AURA Power Connector with subtle gold micro-pins */}
            <group position={[-0.72, 0, 0]}>
              <mesh geometry={geometries.magCapsule} material={materials.portCavityMaterial} />
              {[-0.04, -0.02, 0, 0.02, 0.04].map((px, i) => (
                <mesh key={i} position={[px, 0, 0.004]} material={materials.goldPinMaterial}>
                  <boxGeometry args={[0.008, 0.007, 0.008]} />
                </mesh>
              ))}
            </group>

            {/* Dual Thunderbolt 5 / USB-C Ports with inner metallic tongue */}
            {[-0.44, -0.25].map((pz, i) => (
              <group key={i} position={[pz, 0, 0]}>
                <mesh geometry={geometries.usbCapsule} material={materials.portCavityMaterial} />
                <mesh position={[0, 0, 0.003]} material={materials.darkAnodizedMaterial}>
                  <boxGeometry args={[0.056, 0.0045, 0.01]} />
                </mesh>
              </group>
            ))}

            {/* 3.5mm Precision Studio Headphone Jack */}
            <group position={[-0.04, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.chamferMaterial}>
                <cylinderGeometry args={[0.02, 0.02, 0.012, 20]} />
              </mesh>
              <mesh
                position={[0, 0, 0.002]}
                rotation={[Math.PI / 2, 0, 0]}
                material={materials.portCavityMaterial}
              >
                <cylinderGeometry args={[0.0145, 0.0145, 0.014, 20]} />
              </mesh>
            </group>
          </group>

          {/* RIGHT EDGE (x = +LAPTOP_W / 2) */}
          <group position={[LAPTOP_W / 2 - 0.002, -0.036, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Thunderbolt 5 / USB-C Port */}
            <group position={[0.64, 0, 0]}>
              <mesh geometry={geometries.usbCapsule} material={materials.portCavityMaterial} />
              <mesh position={[0, 0, 0.003]} material={materials.darkAnodizedMaterial}>
                <boxGeometry args={[0.056, 0.0045, 0.01]} />
              </mesh>
            </group>

            {/* Flush SDXC Card Slot */}
            <mesh
              position={[0.34, 0, 0]}
              geometry={geometries.sdSlot}
              material={materials.portCavityMaterial}
            />

            {/* Precision acoustic / micro-vent accent */}
            <mesh position={[0.06, -0.003, 0]} material={materials.portCavityMaterial}>
              <boxGeometry args={[0.14, 0.007, 0.01]} />
            </mesh>
          </group>

          {/* ============================================================
              ARTICULATED REAR CLUTCH HINGE & THERMAL CHANNEL
             ============================================================ */}
          <group position={[0, -0.004, hingeZ]}>
            {/* Recessed rear hinge trough */}
            <mesh position={[0, -0.008, -0.006]} material={materials.portCavityMaterial}>
              <boxGeometry args={[2.16, 0.038, 0.058]} />
            </mesh>
            {/* Primary precision matte clutch cylinder barrel */}
            <mesh rotation={[0, 0, Math.PI / 2]} material={materials.darkAnodizedMaterial}>
              <cylinderGeometry args={[0.028, 0.028, 2.04, 24]} />
            </mesh>
            {/* Machined metallic hinge end-collars */}
            {[-1.045, 1.045].map((hx, idx) => (
              <mesh
                key={idx}
                position={[hx, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                material={materials.chamferMaterial}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.042, 24]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ============================================================
            2. ARTICULATED DISPLAY LID ASSEMBLY (Rotates on exact hinge axis)
               rotation.x = +Math.PI/2 -> Fully Closed (flush on deck)
               rotation.x = 0          -> 90° Upright
               rotation.x = -0.32      -> 108° Open (Signature Workstation)
           ============================================================ */}
        <group
          ref={lidPivotRef}
          name="lid-pivot"
          position={[0, 0.0125, -LAPTOP_D / 2]}
          rotation={[-0.31, 0, 0]}
        >
          {/* Seamless dark-anodized hinge clutch bridge anchoring lid smoothly into rear hinge barrel */}
          <mesh
            position={[0, 0.012, -0.018]}
            rotation={[0, 0, Math.PI / 2]}
            material={materials.darkAnodizedMaterial}
          >
            <cylinderGeometry args={[0.024, 0.024, 2.02, 20]} />
          </mesh>

          {/* Shift lid center cleanly so localY = 0 sits precisely at the hinge edge */}
          <group position={[0, LAPTOP_D / 2, 0]}>
            {/* Outer CNC-machined anodized aluminum display shell (faces -Z) */}
            <mesh
              geometry={geometries.lidShell}
              material={materials.chassisMaterial}
              position={[0, 0, -0.036]}
              castShadow
              receiveShadow
            />

            {/* Polished mirror-metallic inlaid AURA monogram on outer lid back (-Z) */}
            <group position={[0, 0.03, -0.0436]} rotation={[0, Math.PI, 0]}>
              {/* Outer sculptural AURA halo ring */}
              <mesh material={materials.logoMaterial}>
                <ringGeometry args={[0.165, 0.192, 64]} />
              </mesh>
              {/* Inner delicate precision orbital arc */}
              <mesh material={materials.logoMaterial} rotation={[0, 0, Math.PI * 0.25]}>
                <ringGeometry args={[0.072, 0.088, 48, 1, 0, Math.PI * 1.48]} />
              </mesh>
              {/* Subtle center point */}
              <mesh material={materials.logoMaterial}>
                <circleGeometry args={[0.022, 32]} />
              </mesh>
            </group>

            {/* Inner perimeter matte black rubber display seal gasket */}
            <mesh
              geometry={geometries.gasketFrame}
              material={materials.rubberMaterial}
              position={[0, 0, 0.0005]}
            />

            {/* Edge-to-edge obsidian display bezel */}
            <mesh
              geometry={geometries.bezelPlate}
              material={materials.bezelMaterial}
              position={[0, 0, -0.0038]}
            />

            {/* Live GLSL Volumetric OLED AURA Wallpaper Display (16:10 ultra-thin bezel) */}
            <mesh position={[0, 0.038, -0.0018]} material={materials.wallpaperMaterial}>
              <planeGeometry args={[3.04, 1.91]} />
            </mesh>

            {/* Subtle lower chin matte AURA ONE wordmark */}
            <mesh position={[0, -0.995, -0.0012]} material={materials.bezelWordmarkMaterial}>
              <planeGeometry args={[0.62, 0.078]} />
            </mesh>

            {/* 1080p Studio Camera optical assembly in top bezel */}
            <group position={[0, 1.036, -0.001]}>
              {/* Camera outer ring */}
              <mesh material={materials.darkAnodizedMaterial}>
                <circleGeometry args={[0.022, 24]} />
              </mesh>
              {/* Subtle optical sapphire reflection dot */}
              <mesh position={[0, 0, 0.0005]}>
                <circleGeometry args={[0.011, 20]} />
                <meshPhysicalMaterial
                  color="#14294A"
                  metalness={0.3}
                  roughness={0.05}
                  clearcoat={1}
                />
              </mesh>
              {/* Ambient light micro-sensor */}
              <mesh position={[0.048, 0, 0.0004]} material={materials.darkAnodizedMaterial}>
                <circleGeometry args={[0.007, 16]} />
              </mesh>
            </group>

            {/* Full laminated optical cover glass catching smooth studio specular highlights */}
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
