import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Shared material factory. Every function returns a fresh material so
 * hover/selection states can be animated per organ.
 * ------------------------------------------------------------------ */

export interface OrganMaterialOptions {
  roughness?: number;
  /** 0–1: render with transparency (pleura, meninges, eyes, fat). */
  translucent?: number;
  glow?: number;
}

const ORGAN_GLOW = 0.1;

export function createOrganMaterial(color: string, options: OrganMaterialOptions = {}): THREE.MeshStandardMaterial {
  const baseColor = new THREE.Color(color);
  const translucent = options.translucent ?? 0;
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: options.roughness ?? 0.48,
    metalness: 0.015,
    emissive: baseColor,
    emissiveIntensity: options.glow ?? ORGAN_GLOW,
    transparent: translucent > 0,
    opacity: translucent > 0 ? translucent : 1,
    depthWrite: translucent <= 0,
    side: translucent > 0 ? THREE.DoubleSide : THREE.FrontSide,
    envMapIntensity: 0.8,
  });
  material.userData.baseColor = baseColor.clone();
  material.userData.baseEmissive = material.emissiveIntensity;
  material.userData.baseOpacity = material.opacity;
  return material;
}

export type OrganHighlightState = 'idle' | 'hover' | 'selected';

/** Applies a highlight without allocating new colours. */
export function setOrganHighlight(material: THREE.MeshStandardMaterial, state: OrganHighlightState) {
  const base = material.userData.baseColor as THREE.Color | undefined;
  const baseGlow = (material.userData.baseEmissive as number | undefined) ?? ORGAN_GLOW;
  const baseOpacity = (material.userData.baseOpacity as number | undefined) ?? 1;
  if (!base) return;
  if (state === 'selected') {
    material.emissiveIntensity = baseGlow + 0.55;
    material.color.copy(base).offsetHSL(0, 0.04, 0.12);
    material.opacity = Math.min(1, baseOpacity + 0.25);
  } else if (state === 'hover') {
    material.emissiveIntensity = baseGlow + 0.3;
    material.color.copy(base).offsetHSL(0, 0.02, 0.07);
    material.opacity = baseOpacity;
  } else {
    material.emissiveIntensity = baseGlow;
    material.color.copy(base);
    material.opacity = baseOpacity;
  }
}

export function createBoneMaterial(color: string): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(color);
  const material = new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.62,
    emissive: base,
    emissiveIntensity: 0.025,
    envMapIntensity: 0.75,
  });
  material.userData.baseColor = base.clone();
  material.userData.baseEmissive = material.emissiveIntensity;
  material.userData.baseOpacity = 1;
  return material;
}

/** Bone highlight warms toward gold rather than washing out. */
export function setBoneHighlight(material: THREE.MeshPhysicalMaterial, state: OrganHighlightState) {
  const base = material.userData.baseColor as THREE.Color | undefined;
  if (!base) return;
  if (state === 'selected') {
    material.emissive.set('#d8a457');
    material.emissiveIntensity = 0.55;
    material.color.copy(base).offsetHSL(0.02, 0.1, 0.06);
  } else if (state === 'hover') {
    material.emissive.set('#c99a5a');
    material.emissiveIntensity = 0.3;
    material.color.copy(base).offsetHSL(0.01, 0.05, 0.04);
  } else {
    material.emissive.set(base);
    material.emissiveIntensity = 0.025;
    material.color.copy(base);
  }
}

/** Warm ivory translucent skin with a soft sheen. */
export function createSkinMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f0dcc4'),
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.45,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffd9b5'),
    sheenRoughness: 0.8,
    transparent: true,
    opacity: 0.21,
    depthWrite: false,
    side: THREE.FrontSide,
    envMapIntensity: 0.9,
  });
}

/** Thin fresnel shell that draws a warm edge around the silhouette. */
export function createRimMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color('#f7d9ac') },
      uOpacity: { value: 0.58 },
      uPower: { value: 2.2 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDirW = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPower;
      varying vec3 vNormalW;
      varying vec3 vViewDirW;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDirW))), uPower);
        gl_FragColor = vec4(uColor, fresnel * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createFatMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e7c68f'),
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.FrontSide,
    emissive: new THREE.Color('#c99a5a'),
    emissiveIntensity: 0.05,
    envMapIntensity: 0.5,
  });
}

export function createFloorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#17130f'),
    roughness: 0.62,
    metalness: 0.35,
    envMapIntensity: 0.5,
  });
}

export function createPoolMaterial(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffd9a3'),
    map,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createShadowMaterial(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color('#000000'),
    map,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
}

export function createRingMaterial(color: string, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createGlowSpriteMaterial(color: string, map: THREE.Texture | null, opacity = 0.65): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    color: new THREE.Color(color),
    map,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
