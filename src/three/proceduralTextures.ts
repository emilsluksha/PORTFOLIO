import * as THREE from 'three'
import { getKeyboardLayout } from './keyboardLayout'

export interface ProceduralTextureBundle {
  anodizedRoughness: THREE.CanvasTexture
  anodizedBump: THREE.CanvasTexture
  keyboardLegends: THREE.CanvasTexture
  speakerGrille: THREE.CanvasTexture
  bezelWordmark: THREE.CanvasTexture
  undersideEngraving: THREE.CanvasTexture
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

  // Deterministic pseudo-random bead-blasted micro-anodized grain
  let seed = 133742
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let i = 0; i < size * size; i++) {
    const n1 = nextRand()
    const n2 = nextRand()
    const grain = (n1 + n2) * 0.5
    // Keep roughness in a tight luxurious anodized satin band (centered ~0.27)
    const rVal = Math.floor(175 + grain * 44)
    const bVal = Math.floor(110 + grain * 36)
    const idx = i * 4
    rImg.data[idx] = rVal
    rImg.data[idx + 1] = rVal
    rImg.data[idx + 2] = rVal
    rImg.data[idx + 3] = 255

    bImg.data[idx] = bVal
    bImg.data[idx + 1] = bVal
    bImg.data[idx + 2] = bVal
    bImg.data[idx + 3] = 255
  }

  rCtx.putImageData(rImg, 0, 0)
  bCtx.putImageData(bImg, 0, 0)

  const roughness = new THREE.CanvasTexture(roughCanvas)
  roughness.wrapS = THREE.RepeatWrapping
  roughness.wrapT = THREE.RepeatWrapping
  roughness.repeat.set(8, 8)
  roughness.needsUpdate = true

  const bump = new THREE.CanvasTexture(bumpCanvas)
  bump.wrapS = THREE.RepeatWrapping
  bump.wrapT = THREE.RepeatWrapping
  bump.repeat.set(10, 10)
  bump.needsUpdate = true

  return { roughness, bump }
}

function createKeyboardLegendsTexture(): THREE.CanvasTexture {
  const { keys, totalWidth, totalDepth } = getKeyboardLayout()
  const canvasW = 2048
  const canvasH = Math.round(canvasW * (totalDepth / totalWidth))
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvasW, canvasH)

  const toPxX = (x: number) => ((x + totalWidth / 2) / totalWidth) * canvasW
  const toPxY = (z: number) => ((z + totalDepth / 2) / totalDepth) * canvasH
  const scaleX = canvasW / totalWidth
  const scaleY = canvasH / totalDepth

  for (const k of keys) {
    const cx = toPxX(k.x)
    const cy = toPxY(k.z)
    const kw = k.w * scaleX
    const kh = k.d * scaleY

    if (k.isPower) {
      // Recessed subtle Touch ID sensor halo ring
      const rad = Math.min(kw, kh) * 0.34
      ctx.strokeStyle = 'rgba(235, 238, 245, 0.42)'
      ctx.lineWidth = 3.2
      ctx.beginPath()
      ctx.arc(cx, cy, rad, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(235, 238, 245, 0.16)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(cx, cy, rad * 0.6, 0, Math.PI * 2)
      ctx.stroke()
      continue
    }

    if (!k.label) continue

    ctx.fillStyle = 'rgba(244, 246, 250, 0.88)'
    ctx.textBaseline = 'middle'

    const isWord = k.label.length > 2
    const isArrow = k.label === '▲' || k.label === '▼' || k.label === '◄' || k.label === '►'

    if (k.sub) {
      // Secondary shift symbol at top, primary symbol lower center
      ctx.textAlign = 'center'
      ctx.font = `500 ${Math.round(kh * 0.24)}px Inter, -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(225, 229, 238, 0.62)'
      ctx.fillText(k.sub, cx, cy - kh * 0.2)

      ctx.font = `500 ${Math.round(kh * 0.29)}px Inter, -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(246, 248, 252, 0.9)'
      ctx.fillText(k.label, cx, cy + kh * 0.17)
    } else if (isWord) {
      const fontSize = Math.round(kh * (k.isHalf ? 0.33 : 0.24))
      ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(234, 238, 245, 0.78)'
      if (k.align === 'left') {
        ctx.textAlign = 'left'
        ctx.fillText(k.label, cx - kw * 0.38, cy + kh * 0.14)
      } else if (k.align === 'right') {
        ctx.textAlign = 'right'
        ctx.fillText(k.label, cx + kw * 0.38, cy + kh * 0.14)
      } else {
        ctx.textAlign = 'center'
        ctx.fillText(k.label, cx, cy + kh * 0.12)
      }
    } else if (isArrow) {
      ctx.textAlign = 'center'
      ctx.font = `600 ${Math.round(kh * 0.42)}px Inter, -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(238, 242, 248, 0.78)'
      ctx.fillText(k.label, cx, cy + 1)
    } else {
      ctx.textAlign = 'center'
      const fontSize = Math.round(kh * (k.isHalf ? 0.36 : 0.34))
      ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`
      ctx.fillText(k.label, cx, cy + 1)
    }
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

      // Soft micro-hole fade near outer edges for machined perfection
      const edgeFade = Math.sin(((r + 1) / (rows + 1)) * Math.PI)
      const alpha = 0.55 + edgeFade * 0.35

      ctx.fillStyle = `rgba(10, 10, 12, ${alpha.toFixed(2)})`
      ctx.beginPath()
      ctx.arc(x, y, 4.1, 0, Math.PI * 2)
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
  ctx.fillStyle = 'rgba(218, 222, 232, 0.52)'
  ctx.font = '500 32px Manrope, Inter, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const text = 'A U R A   O N E'
  ctx.fillText(text, w / 2, h / 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function createUndersideEngravingTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.font = '500 28px Manrope, Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A U R A   O N E', w / 2, h * 0.42)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.font = '400 16px Inter, sans-serif'
  ctx.fillText('CONCEPT SERIES  ·  PRECISION ALUMINUM  ·  DESIGNED IN STUDIO', w / 2, h * 0.68)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

export function getProceduralTextures(): ProceduralTextureBundle {
  if (cachedBundle) return cachedBundle

  const { roughness, bump } = createAnodizedMaps()
  cachedBundle = {
    anodizedRoughness: roughness,
    anodizedBump: bump,
    keyboardLegends: createKeyboardLegendsTexture(),
    speakerGrille: createSpeakerGrilleTexture(),
    bezelWordmark: createBezelWordmarkTexture(),
    undersideEngraving: createUndersideEngravingTexture(),
  }
  return cachedBundle
}
