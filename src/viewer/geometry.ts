import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { ORGAN_BY_ID, ORGAN_MESHES } from './anatomy';
import { SKIN_PARTS, TORSO_PROFILE, TORSO_SEGMENTS } from './bodyData';
import { SKELETON_GROUPS } from './skeletonData';
import type { Part } from './types';

/* ------------------------------------------------------------------ *
 * Procedural geometry engine. Everything is authored once, merged per
 * organ, cached, and reused. There are no per-frame allocations here.
 * ------------------------------------------------------------------ */

const _euler = new THREE.Euler();
const _matrix = new THREE.Matrix4();

function transform(geo: THREE.BufferGeometry, part: Part): THREE.BufferGeometry {
  if (part.rot) {
    _euler.set(part.rot[0], part.rot[1], part.rot[2]);
    _matrix.makeRotationFromEuler(_euler);
  } else {
    _matrix.identity();
  }
  if (part.at) _matrix.setPosition(part.at[0], part.at[1], part.at[2]);
  geo.applyMatrix4(_matrix);
  return geo;
}

function wobble(geo: THREE.BufferGeometry, amount: number): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      1 +
      amount *
        (Math.sin(x * 5.1 + 1.7) * Math.sin(y * 4.3 + 0.4) * Math.cos(z * 4.7 + 2.1) * 0.6 +
          Math.sin((x + y + z) * 3.1 + 0.8) * 0.4);
    pos.setXYZ(i, x * n, y * n, z * n);
  }
  pos.needsUpdate = true;
  return geo;
}

/** Tapered tube through a Catmull-Rom spline. Returns the tube plus rounded end caps. */
function tubeGeometries(path: Part['path'], r0: number, r1: number, detail = 8): THREE.BufferGeometry[] {
  if (!path || path.length < 2) return [];
  const points = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.35);
  const tubular = Math.min(64, Math.max(10, Math.round(points.length * 8)));
  const radial = Math.max(5, Math.round(detail));
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const center = new THREE.Vector3();

  for (let i = 0; i <= tubular; i += 1) {
    const t = i / tubular;
    curve.getPointAt(t, center);
    const r = r0 + (r1 - r0) * t;
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const c = -Math.cos(a);
      const s = Math.sin(a);
      positions.push(center.x + r * (c * n.x + s * b.x), center.y + r * (c * n.y + s * b.y), center.z + r * (c * n.z + s * b.z));
      uvs.push(t, j / radial);
    }
  }
  for (let i = 0; i < tubular; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const result = [geo];
  // Rounded caps for anything thick enough to show an opening.
  const ends: [number, number, number][] = [
    [path[0][0], path[0][1], path[0][2]],
    [path[path.length - 1][0], path[path.length - 1][1], path[path.length - 1][2]],
  ];
  const radii = [r0, r1];
  for (let k = 0; k < 2; k += 1) {
    if (radii[k] < 0.011) continue;
    const cap = new THREE.SphereGeometry(radii[k], 10, 7);
    cap.translate(ends[k][0], ends[k][1], ends[k][2]);
    result.push(cap);
  }
  return result;
}

const SPHERE_CACHE = new Map<string, THREE.SphereGeometry>();
function sphere(detail: number): THREE.SphereGeometry {
  const w = Math.max(8, Math.round(detail));
  const h = Math.max(6, Math.round(detail * 0.68));
  const key = `${w}x${h}`;
  let geo = SPHERE_CACHE.get(key);
  if (!geo) {
    geo = new THREE.SphereGeometry(1, w, h);
    SPHERE_CACHE.set(key, geo);
  }
  return geo;
}

function partGeometries(part: Part): THREE.BufferGeometry[] {
  const detail = part.detail ?? 14;
  switch (part.kind) {
    case 'ellipsoid': {
      const size = part.size ?? [1, 1, 1];
      const geo = sphere(detail).clone();
      if (part.wobble) wobble(geo, part.wobble);
      geo.scale(size[0], size[1], size[2]);
      return [transform(geo, part)];
    }
    case 'capsule': {
      const size = part.size ?? [0.1, 0.2, 0.1];
      const geo = new THREE.CapsuleGeometry(Math.max(0.02, size[0]), Math.max(0.02, size[1] * 2), 4, Math.max(6, Math.round(detail * 0.7)));
      return [transform(geo, part)];
    }
    case 'box': {
      const size = part.size ?? [0.1, 0.1, 0.1];
      const geo = new THREE.BoxGeometry(size[0] * 2, size[1] * 2, size[2] * 2);
      return [transform(geo, part)];
    }
    case 'cone': {
      const size = part.size ?? [0.1, 0.1, 0.1];
      const geo = new THREE.ConeGeometry(size[0], size[1] * 2, Math.max(6, Math.round(detail * 0.7)));
      return [transform(geo, part)];
    }
    case 'torus': {
      const size = part.size ?? [0.1, 0.02, 0.02];
      const geo = new THREE.TorusGeometry(size[0], size[1], 8, Math.max(8, Math.round(detail * 1.2)));
      return [transform(geo, part)];
    }
    case 'shell': {
      const size = part.size ?? [1, 1, 1];
      const geo = new THREE.SphereGeometry(
        1,
        Math.max(10, Math.round(detail)),
        Math.max(8, Math.round(detail * 0.75)),
        part.phiStart ?? 0,
        part.phiLength ?? Math.PI * 2,
        part.thetaStart ?? 0,
        part.thetaLength ?? Math.PI,
      );
      if (part.wobble) wobble(geo, part.wobble);
      geo.scale(size[0], size[1], size[2]);
      return [transform(geo, part)];
    }
    case 'tube': {
      const size = part.size ?? [0.03, 0.02, 0.03];
      return tubeGeometries(part.path, size[0], size[1], part.detail ?? 8).map((geo) => transform(geo, part));
    }
    default:
      return [];
  }
}

function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  for (const part of parts) list.push(...partGeometries(part));
  if (list.length === 0) return new THREE.BufferGeometry();
  // All primitives share position/normal/uv and are indexed, so the merge is safe.
  const merged = mergeGeometries(list, false);
  const geo = merged ?? list[0];
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/* ----------------------------- organ cache ----------------------------- */

const organGeometryCache = new Map<string, THREE.BufferGeometry>();
const skeletonRadiusCache = new Map<string, number>();

export function getOrganGeometry(id: string): THREE.BufferGeometry {
  const cached = organGeometryCache.get(id);
  if (cached) return cached;
  const placement = ORGAN_BY_ID[id];
  const geo = mergeParts(placement?.parts ?? []);
  organGeometryCache.set(id, geo);
  return geo;
}

/** Radius used to frame a focused organ. */
export function getOrganRadius(id: string): number {
  const geo = getOrganGeometry(id);
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const radius = geo.boundingSphere?.radius ?? 0.5;
  return Math.max(0.25, radius);
}

/** Radius of the bone group that represents a skeletal organ (for camera framing). */
export function getSkeletonRadius(organId: string): number {
  const cached = skeletonRadiusCache.get(organId);
  if (cached !== undefined) return cached;
  const spec = getSkeletonMeshes().find((mesh) => mesh.organId === organId);
  if (!spec || !spec.geometry.boundingSphere) {
    skeletonRadiusCache.set(organId, 0.5);
    return 0.5;
  }
  const radius = Math.max(0.25, spec.geometry.boundingSphere.radius);
  skeletonRadiusCache.set(organId, radius);
  return radius;
}

/**
 * The radius the camera should frame for an organ. Bones come from the skeleton rig, the body
 * layers use the whole figure, and everything else uses its merged geometry.
 */
export function getOrganFramingRadius(id: string): number {
  const placement = ORGAN_BY_ID[id];
  if (!placement) return 0.5;
  if (placement.layer === 'skeleton') return getSkeletonRadius(id);
  if (placement.layer === 'body' || placement.layer === 'shell') return 2.4;
  return getOrganRadius(id);
}

export function getOrganFocusDistance(id: string): number {
  const placement = ORGAN_BY_ID[id];
  if (placement?.focusDist) return placement.focusDist;
  return THREE.MathUtils.clamp(getOrganRadius(id) * 4.2, 1.6, 14);
}

export function getOrganFocus(id: string): [number, number, number] | null {
  const placement = ORGAN_BY_ID[id];
  if (!placement) return null;
  const p = placement.focus ?? placement.at;
  return [p[0], p[1], p[2]];
}

/* ----------------------------- skeleton cache ----------------------------- */

export interface SkeletonMeshSpec {
  organId: string | null;
  color: string;
  geometry: THREE.BufferGeometry;
}

let skeletonCache: SkeletonMeshSpec[] | null = null;

export function getSkeletonMeshes(): SkeletonMeshSpec[] {
  if (skeletonCache) return skeletonCache;
  skeletonCache = SKELETON_GROUPS.map((group) => ({
    organId: group.organId,
    color: group.color,
    geometry: mergeParts(group.parts),
  }));
  return skeletonCache;
}

/* ------------------------------- body cache ------------------------------- */

function sweepGeometries(): THREE.BufferGeometry {
  const radial = TORSO_SEGMENTS;
  const rings = TORSO_PROFILE.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < rings; r += 1) {
    const ring = TORSO_PROFILE[r];
    const zOff = ring.z ?? 0;
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      positions.push(ring.rx * Math.cos(a), ring.y, zOff + ring.rz * Math.sin(a));
      uvs.push(j / radial, r / (rings - 1));
    }
  }
  for (let r = 0; r < rings - 1; r += 1) {
    for (let j = 0; j < radial; j += 1) {
      const next = (j + 1) % radial;
      const a = r * radial + j;
      const b = r * radial + next;
      const c = (r + 1) * radial + j;
      const d = (r + 1) * radial + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  // End caps (hidden inside the neck and the pelvis, but they close the volume).
  const bottom = positions.length / 3;
  const first = TORSO_PROFILE[0];
  positions.push(0, first.y - 0.02, first.z ?? 0);
  uvs.push(0.5, 0);
  for (let j = 0; j < radial; j += 1) {
    indices.push(bottom, (j + 1) % radial, j);
  }
  const top = positions.length / 3;
  const last = TORSO_PROFILE[ringSelector(rings)];
  positions.push(0, last.y + 0.02, last.z ?? 0);
  uvs.push(0.5, 1);
  const topStart = (rings - 1) * radial;
  for (let j = 0; j < radial; j += 1) {
    indices.push(top, topStart + j, topStart + ((j + 1) % radial));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function ringSelector(rings: number): number {
  return rings - 1;
}

let bodyCache: THREE.BufferGeometry | null = null;
let fatCache: THREE.BufferGeometry | null = null;

/** One merged skin mesh for the whole figure. */
export function getBodyGeometry(): THREE.BufferGeometry {
  if (bodyCache) return bodyCache;
  const parts: THREE.BufferGeometry[] = [sweepGeometries()];
  for (const part of SKIN_PARTS) parts.push(...partGeometries(part));
  const merged = mergeGeometries(parts, false) ?? parts[0];
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  bodyCache = merged;
  return merged;
}

/** Slightly smaller copy of the body used for the subcutaneous fat layer. */
export function getFatGeometry(): THREE.BufferGeometry {
  if (fatCache) return fatCache;
  const geo = getBodyGeometry().clone();
  geo.scale(0.965, 0.988, 0.965);
  geo.translate(0, 0.008, 0);
  fatCache = geo;
  return geo;
}

/** Every organ mesh spec, ready for the organ layer. */
export const ORGAN_GEOMETRY_SPECS = ORGAN_MESHES.map((placement) => ({
  id: placement.id,
  placement,
  geometry: getOrganGeometry(placement.id),
}));

/* -------------------------------- textures -------------------------------- */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Soft white-to-transparent falloff used for sprites and the floor pool. */
export function createFalloffTexture(size = 256): THREE.CanvasTexture | null {
  return canvasTexture(size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

/** Dark radial falloff used for the grounding shadow under the figure. */
export function createShadowTexture(size = 256): THREE.CanvasTexture | null {
  return canvasTexture(size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

/** Warm pool of light for the stage floor. */
export function createPoolTexture(size = 512): THREE.CanvasTexture | null {
  return canvasTexture(size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,226,184,0.5)');
    g.addColorStop(0.22, 'rgba(214,176,128,0.22)');
    g.addColorStop(0.55, 'rgba(120,96,70,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}
