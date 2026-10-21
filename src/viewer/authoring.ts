import type { BodyRegion, SystemId } from '@/lib/types';

import type { OrganPlacement, Part, Vec3 } from './types';

/* ------------------------------------------------------------------ *
 * Authoring helpers. All coordinates are in body space:
 *   x: + is the subject's left (viewer's right in the default view)
 *   y: height above the floor (feet at 0, crown at ~8)
 *   z: + is anterior (front)
 * Distances are body units; the whole figure is 8 units tall.
 * ------------------------------------------------------------------ */

export function ell(at: Vec3, size: Vec3, rot?: Vec3, extra: Partial<Part> = {}): Part {
  return { kind: 'ellipsoid', at, size, rot, ...extra };
}

export function box(at: Vec3, size: Vec3, rot?: Vec3, extra: Partial<Part> = {}): Part {
  return { kind: 'box', at, size, rot, ...extra };
}

export function capsule(at: Vec3, radius: number, halfLength: number, rot?: Vec3, extra: Partial<Part> = {}): Part {
  return { kind: 'capsule', at, size: [radius, halfLength, radius], rot, ...extra };
}

export function tube(path: Vec3[], r0: number, r1 = r0, extra: Partial<Part> = {}): Part {
  return { kind: 'tube', path, size: [r0, r1, r0], ...extra };
}

export function cone(at: Vec3, radius: number, halfHeight: number, rot?: Vec3, extra: Partial<Part> = {}): Part {
  return { kind: 'cone', at, size: [radius, halfHeight, radius], rot, ...extra };
}

export function torus(at: Vec3, radius: number, tubeRadius: number, rot?: Vec3, extra: Partial<Part> = {}): Part {
  return { kind: 'torus', at, size: [radius, tubeRadius, tubeRadius], rot, ...extra };
}

export function shell(
  at: Vec3,
  size: Vec3,
  thetaStart = 0,
  thetaLength = Math.PI,
  rot?: Vec3,
  extra: Partial<Part> = {},
): Part {
  return { kind: 'shell', at, size, rot, thetaStart, thetaLength, ...extra };
}

export function organ(
  id: string,
  systemId: SystemId,
  name: string,
  region: BodyRegion,
  color: string,
  at: Vec3,
  parts: Part[],
  extra: Partial<OrganPlacement> = {},
): OrganPlacement {
  return { id, systemId, name, region, color, at, parts, ...extra };
}
