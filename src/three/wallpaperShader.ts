import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrevMap;
  uniform sampler2D uNextMap;
  uniform float uMix;
  uniform float uTime;
  uniform float uBrightness;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Sample user's extracted per-color OLED wallpapers & smoothly cross-fade during color transitions
    vec3 prevCol = texture2D(uPrevMap, uv).rgb;
    vec3 nextCol = texture2D(uNextMap, uv).rgb;
    float blend = smoothstep(0.0, 1.0, clamp(uMix, 0.0, 1.0));
    vec3 col = mix(prevCol, nextCol, blend);

    // Ultra-subtle breathing luminance ripple so the OLED feels alive without distorting the artwork
    float breathe = 0.985 + 0.025 * sin(uTime * 0.75 + uv.x * 2.4 - uv.y * 1.4);
    col *= breathe;

    // Delicate laminated glass diagonal sheen (restrained so wallpaper stays crisp & legible)
    float glossLine = smoothstep(0.58, 0.0, abs((uv.x * 0.78 + uv.y * 0.56) - 0.74)) * 0.032;
    col += vec3(1.0) * glossLine;

    // Subtle OLED corner depth framing
    float vig = smoothstep(1.24, 0.32, length((uv - 0.5) * vec2(1.28, 1.18)));
    col *= (0.72 + 0.28 * vig);

    // Smooth brightness control (fades gracefully to true OLED black when lid closes)
    col *= clamp(uBrightness, 0.0, 1.15);

    gl_FragColor = vec4(col, 1.0);
  }
`

export interface WallpaperUniforms {
  [uniform: string]: THREE.IUniform<unknown>
  uPrevMap: THREE.IUniform<THREE.Texture>
  uNextMap: THREE.IUniform<THREE.Texture>
  uMix: THREE.IUniform<number>
  uTime: THREE.IUniform<number>
  uBrightness: THREE.IUniform<number>
}

export function createAuraWallpaperMaterial(
  initialScreenTexture: THREE.Texture
): { material: THREE.ShaderMaterial; uniforms: WallpaperUniforms } {
  const uniforms: WallpaperUniforms = {
    uPrevMap: { value: initialScreenTexture },
    uNextMap: { value: initialScreenTexture },
    uMix: { value: 1.0 },
    uTime: { value: 0 },
    uBrightness: { value: 1.0 },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    toneMapped: false,
  })

  return { material, uniforms }
}
