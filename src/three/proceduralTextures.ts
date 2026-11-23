import * as THREE from 'three'
import { getKeyboardLayout } from './keyboardLayout'

export interface ProceduralTextureBundle {
  anodizedRoughness: THREE.CanvasTexture
  anodizedBump: THREE.CanvasTexture
  keyboardTopAlbedo: THREE.CanvasTexture
  keyboardTopEmissive: THREE.CanvasTexture
  keyboardWellAO: THREE.CanvasTexture
  speakerGrille: THREE.CanvasTexture
  bezelWordmark: THREE.CanvasTexture
  trackpadAO: THREE.CanvasTexture
}

let cachedBundle: ProceduralTextureBundle | null = null

function createAnodizedMaps(): {
  roughness: THREE.CanvasTexture
  bump: THREE.CanvasTexture
} {
  const size = 256
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = size
  roughCanvas.height = size
  const rCtx = roughCanvas.getContext('2d')!

  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = size
  bumpCanvas.height = size
  const bCtx = bumpCanvas.getContext('2d')!

  const rImg = rCtx.createImageData(size, size)
  const bImg = bCtx.createImageData(size, size)

  // Deterministic fine micro-bead-blasted anodized aluminum grain
  let seed = 133742
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let y = 0; y < size; y++) {
    // Subtle directional fine brushing micro-streak combined with bead-blasted grain
    const rowStreak = (nextRand() - 0.5) * 8
    for (let x = 0; x < size; x++) {
      const grain = (nextRand() + nextRand()) * 0.5
      const rVal = Math.max(150, Math.min(230, Math.floor(178 + grain * 36 + rowStreak * 0.4)))
      const bVal = Math.max(96, Math.min(168, Math.floor(114 + grain * 34 + rowStreak * 0.5)))
      const idx = (y * size + x) * 4
      rImg.data[idx] = rVal
      rImg.data[idx + 1] = rVal
      rImg.data[idx + 2] = rVal
      rImg.data[idx + 3] = 255

      bImg.data[idx] = bVal
      bImg.data[idx + 1] = bVal
      bImg.data[idx + 2] = bVal
      bImg.data[idx + 3] = 255
    }
  }

  rCtx.putImageData(rImg, 0, 0)
  bCtx.putImageData(bImg, 0, 0)

  const roughness = new THREE.CanvasTexture(roughCanvas)
  roughness.wrapS = THREE.RepeatWrapping
  roughness.wrapT = THREE.RepeatWrapping
  roughness.repeat.set(6, 6)
  roughness.needsUpdate = true

  const bump = new THREE.CanvasTexture(bumpCanvas)
  bump.wrapS = THREE.RepeatWrapping
  bump.wrapT = THREE.RepeatWrapping
  bump.repeat.set(8, 8)
  bump.needsUpdate = true

  return { roughness, bump }
}

/**
 * Generates paired 2048x1024 crisp keycap top surface textures mapped directly onto
 * the sculpted 3D concave top faces of all 78 individual keys:
 * - albedo: matte dark charcoal polymer (#17181C) with subtle concave center shading & razor-sharp legends
 * - emissive: crisp white legend backlight map on pure black
 */
function createKeyboardTopTextures(): {
  albedo: THREE.CanvasTexture
  emissive: THREE.CanvasTexture
} {
  const { keys, totalWidth, totalDepth } = getKeyboardLayout()
  const canvasW = 2048
  const canvasH = Math.round(canvasW * (totalDepth / totalWidth))

  const albedoCanvas = document.createElement('canvas')
  albedoCanvas.width = canvasW
  albedoCanvas.height = canvasH
  const aCtx = albedoCanvas.getContext('2d')!

  const emissiveCanvas = document.createElement('canvas')
  emissiveCanvas.width = canvasW
  emissiveCanvas.height = canvasH
  const eCtx = emissiveCanvas.getContext('2d')!

  // Matte satin charcoal keycap base
  aCtx.fillStyle = '#18191E'
  aCtx.fillRect(0, 0, canvasW, canvasH)

  // Pure black background for emissive map (only legends softly glow)
  eCtx.fillStyle = '#000000'
  eCtx.fillRect(0, 0, canvasW, canvasH)

  const toPxX = (x: number) => ((x + totalWidth / 2) / totalWidth) * canvasW
  const toPxY = (z: number) => ((z + totalDepth / 2) / totalDepth) * canvasH
  const scaleX = canvasW / totalWidth
  const scaleY = canvasH / totalDepth

  for (const k of keys) {
    const cx = toPxX(k.x)
    const cy = toPxY(k.z)
    const kw = k.w * scaleX
    const kh = k.d * scaleY

    // Subtle matte radial concavity micro-shading inside each keycap top face
    const rad = Math.max(kw, kh) * 0.56
    const grad = aCtx.createRadialGradient(cx, cy, rad * 0.08, cx, cy, rad)
    grad.addColorStop(0, '#131419')
    grad.addColorStop(0.75, '#1B1C22')
    grad.addColorStop(1, '#262830')
    aCtx.fillStyle = grad
    aCtx.fillRect(cx - kw * 0.5, cy - kh * 0.5, kw, kh)

    // Delicate inner crisp edge rim definition on each keycap
    aCtx.strokeStyle = 'rgba(255, 255, 255, 0.065)'
    aCtx.lineWidth = 2
    aCtx.strokeRect(cx - kw * 0.42, cy - kh * 0.4, kw * 0.84, kh * 0.8)

    if (k.isPower) {
      const r = Math.min(kw, kh) * 0.31
      aCtx.strokeStyle = 'rgba(220, 224, 234, 0.42)'
      aCtx.lineWidth = 3.2
      aCtx.beginPath()
      aCtx.arc(cx, cy, r, 0, Math.PI * 2)
      aCtx.stroke()

      eCtx.strokeStyle = 'rgba(220, 226, 238, 0.35)'
      eCtx.lineWidth = 2.6
      eCtx.beginPath()
      eCtx.arc(cx, cy, r, 0, Math.PI * 2)
      eCtx.stroke()
      continue
    }

    if (!k.label) continue

    const isWord = k.label.length > 2
    const isArrow = k.label === '▲' || k.label === '▼' || k.label === '◄' || k.label === '►'

    const drawLegendOn = (ctx: CanvasRenderingContext2D, primaryFill: string, secondaryFill: string) => {
      ctx.textBaseline = 'middle'

      if (k.sub) {
        ctx.textAlign = 'center'
        ctx.font = `500 ${Math.round(kh * 0.24)}px Inter, -apple-system, sans-serif`
        ctx.fillStyle = secondaryFill
        ctx.fillText(k.sub, cx, cy - kh * 0.19)

        ctx.font = `500 ${Math.round(kh * 0.29)}px Inter, -apple-system, sans-serif`
        ctx.fillStyle = primaryFill
        ctx.fillText(k.label, cx, cy + kh * 0.17)
      } else if (isWord) {
        const fontSize = Math.round(kh * (k.isHalf ? 0.33 : 0.235))
        ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`
        ctx.fillStyle = secondaryFill
        if (k.align === 'left') {
          ctx.textAlign = 'left'
          ctx.fillText(k.label, cx - kw * 0.35, cy + kh * 0.13)
        } else if (k.align === 'right') {
          ctx.textAlign = 'right'
          ctx.fillText(k.label, cx + kw * 0.35, cy + kh * 0.13)
        } else {
          ctx.textAlign = 'center'
          ctx.fillText(k.label, cx, cy + kh * 0.12)
        }
      } else if (isArrow) {
        ctx.textAlign = 'center'
        ctx.font = `600 ${Math.round(kh * 0.4)}px Inter, -apple-system, sans-serif`
        ctx.fillStyle = primaryFill
        ctx.fillText(k.label, cx, cy + 1)
      } else {
        ctx.textAlign = 'center'
        const fontSize = Math.round(kh * (k.isHalf ? 0.36 : 0.33))
        ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`
        ctx.fillStyle = primaryFill
        ctx.fillText(k.label, cx, cy + 1)
      }
    }

    drawLegendOn(aCtx, 'rgba(245, 247, 252, 0.94)', 'rgba(222, 227, 236, 0.72)')
    drawLegendOn(eCtx, 'rgba(255, 255, 255, 0.85)', 'rgba(225, 230, 240, 0.65)')
  }

  const albedo = new THREE.CanvasTexture(albedoCanvas)
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.anisotropy = 8
  albedo.needsUpdate = true

  const emissive = new THREE.CanvasTexture(emissiveCanvas)
  emissive.colorSpace = THREE.SRGBColorSpace
  emissive.anisotropy = 8
  emissive.needsUpdate = true

  return { albedo, emissive }
}

/**
 * Generates high-craft contact shadows and ambient occlusion directly under every individual
 * 3D keycap on the recessed keyboard pocket sub-plate so physical gaps & key elevation pop cleanly.
 */
function createKeyboardWellAOTexture(): THREE.CanvasTexture {
  const { keys, totalWidth, totalDepth } = getKeyboardLayout()
  const padX = 0.044
  const padZ = 0.038
  const fullW = totalWidth + padX * 2
  const fullD = totalDepth + padZ * 2

  const canvasW = 1024
  const canvasH = Math.round(canvasW * (fullD / fullW))
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!

  // Recessed satin matte-dark aluminum sub-plate base
  ctx.fillStyle = '#121318'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Recessed perimeter ambient occlusion gradient along all 4 aluminum pocket walls
  const edgeGradT = ctx.createLinearGradient(0, 0, 0, 32)
  edgeGradT.addColorStop(0, 'rgba(0,0,0,0.88)')
  edgeGradT.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edgeGradT
  ctx.fillRect(0, 0, canvasW, 32)

  const edgeGradB = ctx.createLinearGradient(0, canvasH, 0, canvasH - 32)
  edgeGradB.addColorStop(0, 'rgba(0,0,0,0.85)')
  edgeGradB.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edgeGradB
  ctx.fillRect(0, canvasH - 32, canvasW, 32)

  const edgeGradL = ctx.createLinearGradient(0, 0, 32, 0)
  edgeGradL.addColorStop(0, 'rgba(0,0,0,0.85)')
  edgeGradL.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edgeGradL
  ctx.fillRect(0, 0, 32, canvasH)

  const edgeGradR = ctx.createLinearGradient(canvasW, 0, canvasW - 32, 0)
  edgeGradR.addColorStop(0, 'rgba(0,0,0,0.85)')
  edgeGradR.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edgeGradR
  ctx.fillRect(canvasW - 32, 0, 32, canvasH)

  const scaleX = canvasW / fullW
  const scaleY = canvasH / fullD
  const toPxX = (x: number) => ((x + fullW / 2) / fullW) * canvasW
  const toPxY = (z: number) => ((z + fullD / 2) / fullD) * canvasH

  // Crisp contact shadow beneath every single sculpted keycap
  for (const k of keys) {
    const cx = toPxX(k.x)
    const cy = toPxY(k.z)
    const kw = k.w * scaleX
    const kh = k.d * scaleY

    // Soft outer contact shadow skirt visible in the gaps around every key
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.96)'
    ctx.shadowBlur = 11
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2.5
    ctx.fillStyle = '#030305'
    const rx = cx - kw * 0.51
    const ry = cy - kh * 0.51
    ctx.beginPath()
    ctx.roundRect(rx, ry, kw * 1.02, kh * 1.02, 7)
    ctx.fill()
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function createSpeakerGrilleTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, w, h)

  const cols = 12
  const rows = 54
  const padX = 24
  const padY = 28
  const stepX = (w - padX * 2) / (cols - 1)
  const stepY = (h - padY * 2) / (rows - 1)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const stagger = r % 2 === 0 ? 0 : stepX * 0.35
      const x = padX + c * stepX + stagger
      const y = padY + r * stepY
      if (x > w - padX + 4) continue

      const edgeFade = Math.sin(((r + 1) / (rows + 1)) * Math.PI)
      const alpha = 0.62 + edgeFade * 0.32

      ctx.fillStyle = `rgba(6, 6, 8, ${alpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(x, y, 4.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function createBezelWordmarkTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(218, 224, 236, 0.56)'
  ctx.font = '500 32px Manrope, Inter, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A U R A   O N E', w / 2, h / 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function createTrackpadAOTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 320
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.roundRect(5, 5, w - 10, h - 10, 18)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.roundRect(7, 7, w - 14, h - 14, 16)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

export function getProceduralTextures(): ProceduralTextureBundle {
  if (cachedBundle) return cachedBundle

  const { roughness, bump } = createAnodizedMaps()
  const kbTop = createKeyboardTopTextures()

  cachedBundle = {
    anodizedRoughness: roughness,
    anodizedBump: bump,
    keyboardTopAlbedo: kbTop.albedo,
    keyboardTopEmissive: kbTop.emissive,
    keyboardWellAO: createKeyboardWellAOTexture(),
    speakerGrille: createSpeakerGrilleTexture(),
    bezelWordmark: createBezelWordmarkTexture(),
    trackpadAO: createTrackpadAOTexture(),
  }
  return cachedBundle
}
