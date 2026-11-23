import * as THREE from 'three'
import type { KeyCapDef } from './keyboardLayout'

/**
 * Generates a rounded rectangle perimeter loop of (x, z) points in counter-clockwise order
 * when viewed from +Y looking down.
 */
function sampleRoundedPerimeter(
  w: number,
  d: number,
  radius: number,
  cornerSegs = 4
): Array<[number, number]> {
  const hw = w / 2
  const hd = d / 2
  const r = Math.min(radius, hw * 0.45, hd * 0.45)
  const pts: Array<[number, number]> = []

  // 4 corners in CCW order when viewed from +Y:
  // (+x, +z) front-right -> (+x, -z) back-right -> (-x, -z) back-left -> (-x, +z) front-left
  const corners: Array<{ cx: number; cz: number; a0: number; a1: number }> = [
    { cx: hw - r, cz: hd - r, a0: Math.PI * 0.5, a1: 0 },
    { cx: hw - r, cz: -hd + r, a0: 0, a1: -Math.PI * 0.5 },
    { cx: -hw + r, cz: -hd + r, a0: -Math.PI * 0.5, a1: -Math.PI },
    { cx: -hw + r, cz: hd - r, a0: -Math.PI, a1: -Math.PI * 1.5 },
  ]

  for (const c of corners) {
    for (let i = 0; i <= cornerSegs; i++) {
      const t = i / cornerSegs
      const ang = c.a0 + (c.a1 - c.a0) * t
      pts.push([c.cx + Math.cos(ang) * r, c.cz + Math.sin(ang) * r])
    }
  }
  return pts
}

/**
 * Builds ONE single high-craft merged BufferGeometry containing all 78 individually
 * sculpted 3D low-profile chiclet keycaps:
 * - True physical dimensions per key (Space, Shift, Return, Tab, Delete, Caps, Arrows — ZERO bevel stretching)
 * - Subtle tapered chiclet skirt walls
 * - Rounded perimeter corners + crisp 45° top bevel chamfer that catches studio edge sheen
 * - Gently dished ergonomic concave top surface on every keycap
 * - 2 material groups inside 1 single mesh (1 draw call per group):
 *     Group 0: Sculpted side skirts & chamfer bevels (dark matte-satin polymer with subtle edge reflection)
 *     Group 1: Concave top faces with 1:1 exact UV mapping onto the crisp 2048x1024 legend atlas
 */
export function buildMergedSculptedKeyboardGeometry(
  keys: KeyCapDef[],
  totalWidth: number,
  totalDepth: number
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const sideIndices: number[] = []
  const topIndices: number[] = []

  // Low-profile modern ultrabook keycap elevation from recessed pocket floor (y = -0.0095)
  // Top reaches y = 0.0195 above floor => +0.0100 proud above the aluminum palm rest!
  const H_BASE = 0.0
  const H_SHOULDER = 0.0145
  const H_BEVEL = 0.0186
  const H_TOP_RIM = 0.0198
  const DISH_DEPTH = 0.0021

  const cornerSegs = 3 // 16 perimeter segments per ring -> super smooth rounded corners & fast

  const mapTopUV = (worldX: number, worldZ: number): [number, number] => {
    const u = (worldX + totalWidth / 2) / totalWidth
    // Flip V so -Z (top row esc/F1..F12) maps to top of canvas (v = 1)
    const v = 1 - (worldZ + totalDepth / 2) / totalDepth
    return [u, v]
  }

  for (const k of keys) {
    const baseR = Math.min(0.0155, Math.min(k.w, k.d) * 0.24)
    const insetShoulder = 0.0045
    const insetBevel = 0.0105
    const insetRim = 0.0155

    const ring0 = sampleRoundedPerimeter(k.w, k.d, baseR, cornerSegs)
    const ring1 = sampleRoundedPerimeter(
      Math.max(0.02, k.w - insetShoulder * 2),
      Math.max(0.02, k.d - insetShoulder * 2),
      Math.max(0.004, baseR - 0.0015),
      cornerSegs
    )
    const ring2 = sampleRoundedPerimeter(
      Math.max(0.018, k.w - insetBevel * 2),
      Math.max(0.018, k.d - insetBevel * 2),
      Math.max(0.003, baseR - 0.0035),
      cornerSegs
    )
    const ring3 = sampleRoundedPerimeter(
      Math.max(0.016, k.w - insetRim * 2),
      Math.max(0.016, k.d - insetRim * 2),
      Math.max(0.0025, baseR - 0.005),
      cornerSegs
    )

    const n = ring0.length

    // Push 4 perimeter rings for side walls + bevel chamfer (Group 0)
    const addRing = (pts: Array<[number, number]>, y: number) => {
      const start = positions.length / 3
      for (let i = 0; i < pts.length; i++) {
        const px = k.x + pts[i][0]
        const pz = k.z + pts[i][1]
        positions.push(px, y, pz)
        const [u, v] = mapTopUV(px, pz)
        uvs.push(u, v)
      }
      return start
    }

    const r0Start = addRing(ring0, H_BASE)
    const r1Start = addRing(ring1, H_SHOULDER)
    const r2Start = addRing(ring2, H_BEVEL)
    const r3SideStart = addRing(ring3, H_TOP_RIM)

    // Helper to bridge two adjacent rings outward-facing
    const bridgeRings = (aStart: number, bStart: number) => {
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        const a0 = aStart + i
        const a1 = aStart + next
        const b0 = bStart + i
        const b1 = bStart + next
        sideIndices.push(a0, a1, b1)
        sideIndices.push(a0, b1, b0)
      }
    }

    bridgeRings(r0Start, r1Start)
    bridgeRings(r1Start, r2Start)
    bridgeRings(r2Start, r3SideStart)

    // --- CONCAVE ERGONOMIC TOP SURFACE (Group 1, separate vertices for crisp crease normal at bevel lip) ---
    const topOuterStart = addRing(ring3, H_TOP_RIM)

    // Inner mid-dish ring (62% of top rim) dipping gently downward
    const midDishPts: Array<[number, number]> = ring3.map(([lx, lz]) => [lx * 0.56, lz * 0.56])
    const topMidStart = addRing(midDishPts, H_TOP_RIM - DISH_DEPTH * 0.68)

    // Center vertex at deepest point of the subtle concave finger dish
    const centerIdx = positions.length / 3
    positions.push(k.x, H_TOP_RIM - DISH_DEPTH, k.z)
    const [cu, cv] = mapTopUV(k.x, k.z)
    uvs.push(cu, cv)

    // Outer top ring -> mid concave ring (facing +Y upward)
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n
      const o0 = topOuterStart + i
      const o1 = topOuterStart + next
      const m0 = topMidStart + i
      const m1 = topMidStart + next
      topIndices.push(o0, o1, m1)
      topIndices.push(o0, m1, m0)
    }

    // Mid concave ring -> center vertex (facing +Y upward)
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n
      const m0 = topMidStart + i
      const m1 = topMidStart + next
      topIndices.push(m0, m1, centerIdx)
    }
  }

  const allIndices = [...sideIndices, ...topIndices]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(allIndices)

  // Material groups: 0 = dark beveled keycap body, 1 = concave top face with crisp keycap legends
  geo.addGroup(0, sideIndices.length, 0)
  geo.addGroup(sideIndices.length, topIndices.length, 1)

  geo.computeVertexNormals()
  return geo
}
