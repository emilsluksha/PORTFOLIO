import * as THREE from 'three'
import type { AuraColorId } from '../types/aura'

export interface ColorTextureSet {
  screen: THREE.Texture
  lid: THREE.Texture
  metal: THREE.Texture
  bottom: THREE.Texture
}

const COLOR_IDS: AuraColorId[] = ['crimson', 'blue', 'emerald', 'solar']

let cachedPack: Record<AuraColorId, ColorTextureSet> | null = null

function loadConfiguredTexture(
  loader: THREE.TextureLoader,
  url: string,
  wrap = false
): THREE.Texture {
  const tex = loader.load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  if (wrap) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
  }
  return tex
}

/**
 * Preloads and caches all 4 per-color texture sets extracted from the user's
 * provided AURA ONE texture sheets. Never recreates GPU textures on color switches.
 */
export function getColorTexturePack(): Record<AuraColorId, ColorTextureSet> {
  if (cachedPack) return cachedPack

  const loader = new THREE.TextureLoader()
  const pack = {} as Record<AuraColorId, ColorTextureSet>

  for (const colorId of COLOR_IDS) {
    const base = `./textures/${colorId}`
    pack[colorId] = {
      screen: loadConfiguredTexture(loader, `${base}/screen.jpg`, false),
      lid: loadConfiguredTexture(loader, `${base}/lid.jpg`, false),
      metal: loadConfiguredTexture(loader, `${base}/metal.jpg`, false),
      bottom: loadConfiguredTexture(loader, `${base}/bottom.jpg`, false),
    }
  }

  cachedPack = pack
  return pack
}
