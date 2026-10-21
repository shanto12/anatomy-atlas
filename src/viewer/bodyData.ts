import { ell, tube } from './authoring';
import type { Part, Vec3 } from './types';

/**
 * Procedural human figure, authored in body space.
 * Height: 8 units (feet at y=0, crown at y≈8). Roughly 8 head-heights — the classical
 * proportion that reads as "human" at a glance. All shapes are authored once and merged
 * into a single skin mesh, so the whole body costs one draw call.
 */

export const BODY_HEIGHT = 8;

export type Side = 1 | -1;
export const SIDES: Side[] = [1, -1];

/** Elliptical cross-sections of the torso, swept along y. */
export const TORSO_PROFILE: { y: number; rx: number; rz: number; z?: number }[] = [
  { y: 3.78, rx: 0.6, rz: 0.42, z: 0.03 },
  { y: 3.92, rx: 0.69, rz: 0.46, z: 0.03 },
  { y: 4.08, rx: 0.72, rz: 0.47, z: 0.03 },
  { y: 4.3, rx: 0.68, rz: 0.45, z: 0.03 },
  { y: 4.55, rx: 0.64, rz: 0.43, z: 0.03 },
  { y: 4.8, rx: 0.61, rz: 0.42, z: 0.03 },
  { y: 5.05, rx: 0.61, rz: 0.42, z: 0.035 },
  { y: 5.3, rx: 0.65, rz: 0.43, z: 0.04 },
  { y: 5.55, rx: 0.7, rz: 0.45, z: 0.04 },
  { y: 5.8, rx: 0.75, rz: 0.47, z: 0.04 },
  { y: 6.05, rx: 0.81, rz: 0.49, z: 0.04 },
  { y: 6.28, rx: 0.87, rz: 0.51, z: 0.035 },
  { y: 6.48, rx: 0.94, rz: 0.52, z: 0.03 },
  { y: 6.62, rx: 0.99, rz: 0.5, z: 0.02 },
  { y: 6.74, rx: 0.94, rz: 0.46, z: 0.015 },
  { y: 6.84, rx: 0.78, rz: 0.4, z: 0.01 },
  { y: 6.92, rx: 0.55, rz: 0.34, z: 0.01 },
  { y: 6.98, rx: 0.36, rz: 0.29, z: 0.01 },
  { y: 7.02, rx: 0.27, rz: 0.26, z: 0.01 },
];

/** Arm centre lines, shoulder → wrist. */
export const ARM_POINTS: Record<'left' | 'right', Vec3[]> = {
  left: [
    [0.9, 6.62, 0.0],
    [1.01, 6.22, 0.0],
    [1.08, 5.82, 0.005],
    [1.13, 5.42, 0.0],
    [1.19, 5.0, 0.005],
    [1.24, 4.55, 0.015],
    [1.27, 4.12, 0.02],
  ],
  right: [
    [-0.9, 6.62, 0.0],
    [-1.01, 6.22, 0.0],
    [-1.08, 5.82, 0.005],
    [-1.13, 5.42, 0.0],
    [-1.19, 5.0, 0.005],
    [-1.24, 4.55, 0.015],
    [-1.27, 4.12, 0.02],
  ],
};

export const ARM_RADII = [0.215, 0.195, 0.17, 0.155, 0.145, 0.125, 0.098];

/** Leg centre lines, hip → ankle. */
export const LEG_POINTS: Record<'left' | 'right', Vec3[]> = {
  left: [
    [0.34, 4.18, 0.0],
    [0.37, 3.78, 0.01],
    [0.39, 3.3, 0.02],
    [0.4, 2.8, 0.025],
    [0.4, 2.36, 0.03],
    [0.41, 1.9, 0.0],
    [0.42, 1.42, -0.02],
    [0.42, 0.9, -0.01],
    [0.42, 0.34, 0.0],
  ],
  right: [
    [-0.34, 4.18, 0.0],
    [-0.37, 3.78, 0.01],
    [-0.39, 3.3, 0.02],
    [-0.4, 2.8, 0.025],
    [-0.4, 2.36, 0.03],
    [-0.41, 1.9, 0.0],
    [-0.42, 1.42, -0.02],
    [-0.42, 0.9, -0.01],
    [-0.42, 0.34, 0.0],
  ],
};

export const LEG_RADII = [0.36, 0.335, 0.3, 0.26, 0.2, 0.235, 0.235, 0.16, 0.095];

export const HAND_CENTER: Record<'left' | 'right', Vec3> = {
  left: [1.31, 3.94, 0.02],
  right: [-1.31, 3.94, 0.02],
};

/** Fingertip positions (left hand then right hand) — used for nails and nerve endings. */
export const HAND_FINGER_TIPS: Vec3[] = (() => {
  const tips: Vec3[] = [];
  for (const side of SIDES) {
    const x = 1.31 * side;
    const zs = [0.085, 0.03, -0.025, -0.075];
    for (const z of zs) tips.push([x, 3.62, z + 0.02]);
    tips.push([x - 0.1 * side, 3.78, 0.15]);
  }
  return tips;
})();

export const FOOT_TOE_TIPS: Vec3[] = (() => {
  const tips: Vec3[] = [];
  for (const side of SIDES) {
    const x = 0.42 * side;
    const xs = [-0.055, -0.02, 0.015, 0.05, 0.085];
    for (const dx of xs) tips.push([x + dx * side, 0.075, 0.44]);
  }
  return tips;
})();

function finger(side: Side, z: number, length: number, curl: number): Part {
  const x = 1.31 * side;
  return tube(
    [
      [x, 3.86, z],
      [x + 0.004 * side, 3.86 - length * 0.45, z + curl * 0.35],
      [x + 0.006 * side, 3.86 - length * 0.8, z + curl],
      [x + 0.006 * side, 3.86 - length, z + curl * 1.25],
    ],
    0.034,
    0.023,
    { detail: 8 },
  );
}

function handParts(side: Side): Part[] {
  const [x, y, z] = HAND_CENTER[side === 1 ? 'left' : 'right'];
  const parts: Part[] = [
    ell([x, y, z], [0.086, 0.16, 0.126], [0, 0, -0.06 * side], { wobble: 0.05 }),
    // thenar pad
    ell([x - 0.045 * side, y - 0.03, z + 0.085], [0.04, 0.07, 0.038], [0, 0, 0.3 * side]),
  ];
  const fingerZ = [0.085, 0.03, -0.025, -0.075];
  const lengths = [0.19, 0.215, 0.2, 0.155];
  for (let i = 0; i < 4; i += 1) {
    parts.push(finger(side, fingerZ[i] + z, lengths[i], -0.012));
  }
  // thumb
  parts.push(
    tube(
      [
        [x - 0.07 * side, y + 0.03, z + 0.1],
        [x - 0.1 * side, y - 0.02, z + 0.13],
        [x - 0.115 * side, y - 0.075, z + 0.155],
      ],
      0.033,
      0.023,
      { detail: 8 },
    ),
  );
  return parts;
}

function footParts(side: Side): Part[] {
  const x = 0.42 * side;
  return [
    ell([x, 0.12, 0.12], [0.135, 0.115, 0.283], [-0.05, 0, 0], { wobble: 0.05 }),
    ell([x, 0.16, -0.1], [0.122, 0.125, 0.126], [0, 0, 0]),
    ell([x, 0.075, 0.40], [0.128, 0.064, 0.108], [0, 0, 0]),
    // toes
    ...[
      [-0.055, 0.0],
      [-0.02, 0.01],
      [0.015, 0.005],
      [0.05, -0.005],
      [0.085, -0.015],
    ].map(([dx, dy]) =>
      ell([x + dx * side * 1.1, 0.07 + dy, 0.46], [0.028, 0.032, 0.045], [0, 0, 0], { detail: 8 }),
    ),
  ];
}

/** Every skin part except the swept torso. */
export const SKIN_PARTS: Part[] = (() => {
  const parts: Part[] = [];

  // Neck
  parts.push(tube([[0, 6.9, 0.02], [0, 7.04, 0.02], [0, 7.2, 0.02], [0, 7.28, 0.01]], 0.29, 0.245));

  // Head mass
  parts.push(ell([0, 7.6, 0.0], [0.415, 0.48, 0.45], [0, 0, 0], { wobble: 0.02 }));
  parts.push(ell([0, 7.35, 0.07], [0.338, 0.34, 0.36], [0, 0, 0], { wobble: 0.02 }));
  parts.push(ell([0, 7.19, 0.19], [0.185, 0.115, 0.205], [0.18, 0, 0]));
  // Brow, nose, lips, ears — enough facial structure to read as a face without being uncanny
  parts.push(ell([0, 7.53, 0.36], [0.245, 0.05, 0.08], [0.25, 0, 0]));
  parts.push(ell([0, 7.43, 0.4], [0.062, 0.115, 0.085], [-0.2, 0, 0]));
  parts.push(ell([0, 7.395, 0.455], [0.068, 0.045, 0.055], [0, 0, 0]));
  parts.push(ell([0, 7.265, 0.4], [0.095, 0.028, 0.045], [0.1, 0, 0]));
  parts.push(ell([0, 7.24, 0.395], [0.08, 0.024, 0.04], [-0.1, 0, 0]));
  parts.push(ell([0.405, 7.47, 0.02], [0.032, 0.1, 0.06], [0, -0.2, 0]));
  parts.push(ell([-0.405, 7.47, 0.02], [0.032, 0.1, 0.06], [0, 0.2, 0]));

  // Arms
  for (const side of SIDES) {
    const key = side === 1 ? 'left' : 'right';
    parts.push(tube(ARM_POINTS[key], ARM_RADII[0], ARM_RADII[ARM_RADII.length - 1], {
      detail: 14,
    }));
    // Deltoid blend into the torso
    parts.push(ell([0.93 * side, 6.58, 0.0], [0.235, 0.25, 0.225], [0, 0, -0.18 * side], { wobble: 0.04 }));
    parts.push(...handParts(side));
  }

  // Legs
  for (const side of SIDES) {
    const key = side === 1 ? 'left' : 'right';
    parts.push(tube(LEG_POINTS[key], LEG_RADII[0], LEG_RADII[LEG_RADII.length - 1], {
      detail: 16,
    }));
    parts.push(ell([0.31 * side, 4.02, 0.02], [0.26, 0.24, 0.26], [0, 0, 0], { wobble: 0.04 }));
    parts.push(...footParts(side));
  }

  return parts;
})();

/** Radius profile used by the swept torso; mirrored in geometry.ts. */
export const TORSO_SEGMENTS = 32;
