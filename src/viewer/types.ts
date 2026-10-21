import type { BodyRegion, SystemId } from '@/lib/types';

/** A point or vector in body space. One unit ≈ 0.225 m; the body is 8 units tall. */
export type Vec3 = [number, number, number];

/**
 * The primitive shapes used to assemble the procedural model.
 *
 * Every part is authored in **body space** (origin at the floor between the feet, +y up,
 * +z toward the viewer, +x toward the subject's left). Organs are merged into a single
 * geometry per organ, so all parts of an organ share one material and one pick target.
 */
export type PartKind = 'ellipsoid' | 'capsule' | 'tube' | 'box' | 'cone' | 'torus' | 'shell';

export interface Part {
  kind: PartKind;
  /** Centre of the part in body space (ellipsoid, capsule, box, cone, torus, shell). */
  at?: Vec3;
  /**
   * Size of the part. For ellipsoid/box/capsule/cone: radii / half-extents.
   * For tube: [radiusStart, radiusEnd]; for torus: [radius, tubeRadius]; for shell: radii.
   */
  size?: Vec3;
  /** Euler rotation in radians. */
  rot?: Vec3;
  /** Control points of a tube in body space. Smoothed with a Catmull-Rom spline. */
  path?: Vec3[];
  /** Radial resolution override (defaults are tuned for speed). */
  detail?: number;
  /** Smooth organic surface distortion, 0–1. Used for brain, liver, lungs, muscle bellies. */
  wobble?: number;
  /** Polar start of a shell (radians). */
  thetaStart?: number;
  /** Polar length of a shell (radians). */
  thetaLength?: number;
  /** Azimuthal start of a shell (radians). */
  phiStart?: number;
  /** Azimuthal length of a shell (radians). */
  phiLength?: number;
}

export type OrganLayer = 'organs' | 'skeleton' | 'body' | 'shell';

export interface OrganPlacement {
  id: string;
  systemId: SystemId;
  name: string;
  region: BodyRegion;
  color: string;
  /** Anatomical anchor used for labels and camera focus (body space). */
  at: Vec3;
  /** Optional separate camera focus point (defaults to `at`). */
  focus?: Vec3;
  /** Optional camera distance override when focusing this organ. */
  focusDist?: number;
  /** Parts for the procedural representation. Empty for skeleton/body-layered organs. */
  parts: Part[];
  /** Which layer draws it. Defaults to `organs`. */
  layer?: OrganLayer;
  /** Emissive strength tweak (0–1). Organs glow faintly inside the body. */
  glow?: number;
  /** Slight material roughness override. */
  roughness?: number;
  /** Render the organ material with transparency. */
  translucent?: number;
}

export interface SystemMeta {
  id: SystemId;
  name: string;
  shortName: string;
  tagline: string;
  /** Ambient accent used by the UI and by label dots. */
  color: string;
}
