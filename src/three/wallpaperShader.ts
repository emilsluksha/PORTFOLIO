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

  uniform float uTime;
  uniform float uBrightness;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  varying vec2 vUv;

  // Sculptural silk glass wave with crisp specular ridge + soft velvet falloff
  float silkWave(vec2 p, float freq, float amp, float phase, float sharpness) {
    float curve = sin(p.x * freq + phase + cos(p.y * 1.9 - phase * 0.5) * 0.45) * amp;
    float d = abs(p.y - curve);
    float core = exp(-pow(d * sharpness, 1.65));
    float rim = exp(-pow(d * (sharpness * 3.8), 2.0)) * 0.65;
    return core + rim;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(1.56, 1.0);
    float t = uTime * 0.28;

    // Sweeping architectural diagonal coordinates
    vec2 q = vec2(
      p.x * 0.88 - p.y * 0.46,
      p.x * 0.46 + p.y * 0.88
    );

    // Layered crystalline fluid folds (sharp luminous edges + silky obsidian shadows)
    float w1 = silkWave(q + vec2(0.0, 0.16), 2.35, 0.22, t * 1.0, 4.4);
    float w2 = silkWave(q * vec2(1.12, 0.96) - vec2(0.14, 0.09), 3.1, 0.19, -t * 0.72 + 1.5, 5.6);
    float w3 = silkWave(q * vec2(0.92, 1.18) + vec2(0.18, -0.15), 3.85, 0.15, t * 0.58 + 3.1, 7.2);

    // Subtle geometric AURA fine luminous ring centered cleanly
    float rad = length(p * vec2(1.0, 1.0));
    float fineRing = exp(-pow((rad - 0.275) / 0.014, 2.0)) * 0.55;
    float softAura = exp(-pow((rad - 0.275) / 0.09, 2.0)) * 0.22;

    // Deep OLED obsidian foundation
    vec3 col = uColorA * (0.28 + 0.55 * smoothstep(1.05, 0.12, rad));

    // Primary volumetric body color
    col = mix(col, uColorB * 1.08, clamp(w1 * 0.78 + softAura, 0.0, 1.0));

    // Secondary sculpted silk highlight
    col = mix(col, mix(uColorB, uColorC, 0.62), clamp(w2 * 0.68, 0.0, 1.0));

    // Fine luminous specular silk crest + subtle AURA halo
    col += uColorC * clamp(w3 * 0.42 + fineRing * 0.75, 0.0, 1.0);

    // Diagonal optical glass horizon reflection
    float gloss = smoothstep(0.55, 0.0, abs((uv.x * 0.8 + uv.y * 0.55) - 0.72)) * 0.045;
    col += vec3(1.0) * gloss;

    // Clean OLED vignette framing so corners melt into obsidian bezel
    float vig = smoothstep(1.18, 0.28, length((uv - 0.5) * vec2(1.32, 1.18)));
    col *= (0.36 + 0.64 * vig);

    // Smooth brightness control for lid close/open illumination
    col *= clamp(uBrightness, 0.0, 1.18);

    gl_FragColor = vec4(col, 1.0);
  }
`

export interface WallpaperUniforms {
  [uniform: string]: THREE.IUniform<unknown>
  uTime: THREE.IUniform<number>
  uBrightness: THREE.IUniform<number>
  uColorA: THREE.IUniform<THREE.Color>
  uColorB: THREE.IUniform<THREE.Color>
  uColorC: THREE.IUniform<THREE.Color>
}

export function createAuraWallpaperMaterial(
  colorA: string,
  colorB: string,
  colorC: string
): { material: THREE.ShaderMaterial; uniforms: WallpaperUniforms } {
  const uniforms: WallpaperUniforms = {
    uTime: { value: 0 },
    uBrightness: { value: 1.0 },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uColorC: { value: new THREE.Color(colorC) },
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    toneMapped: false,
  })

  return { material, uniforms }
}
