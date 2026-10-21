import { ell, tube } from './authoring';
import type { Part } from './types';
import { HAND_CENTER, SIDES, type Side } from './bodyData';

/**
 * Bone geometry, grouped by the organ id it represents. The viewer turns each group into a
 * single pickable mesh; the extra group (hands, feet, tibia/fibula, hyoid) is decorative and
 * not pickable.
 */
export interface BoneGroup {
  organId: string | null;
  color: string;
  parts: Part[];
}

const BONE = '#e9d9b8';
const BONE_2 = '#e6d5b2';
const BONE_3 = '#eadbbd';
const BONE_4 = '#e2d1ae';

/** 24 presacral vertebrae plus the sacrum, following a gentle S-curve. */
function spineParts(): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < 24; i += 1) {
    const t = i / 23;
    const y = 7.0 - t * 2.62;
    const belly = Math.sin(t * Math.PI);
    const z = -0.22 - 0.07 * belly;
    const size = 0.092 - t * 0.012;
    parts.push(ell([0, y, z], [size, 0.042, size * 0.92], [0, 0, 0], { detail: 10 }));
    // spinous process points back
    parts.push({
      kind: 'cone',
      at: [0, y + 0.01, z - 0.065],
      size: [0.018, 0.05, 0.018],
      rot: [-Math.PI / 2, 0, 0],
      detail: 6,
    });
    if (i > 4) {
      for (const s of SIDES) {
        parts.push(ell([size * 0.8 * s, y, z - 0.01], [0.035, 0.016, 0.02], [0, 0, 0], { detail: 6 }));
      }
    }
  }
  // sacrum and coccyx
  parts.push(ell([0, 4.2, -0.25], [0.16, 0.24, 0.1], [0.12, 0, 0], { wobble: 0.04 }));
  parts.push({
    kind: 'cone',
    at: [0, 3.95, -0.24],
    size: [0.05, 0.09, 0.05],
    rot: [Math.PI, 0, 0],
    detail: 8,
  });
  return parts;
}

function ribcageParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    for (let i = 0; i < 12; i += 1) {
      const y0 = 6.7 - i * 0.083;
      const rx = 0.5 + i * 0.031;
      const rz = 0.39 + i * 0.012;
      const floating = i >= 10;
      const endAngle = floating ? 0.6 + (i - 10) * 0.15 : 1.3;
      const drop = (floating ? 0.12 : 0.26) + i * 0.012;
      const pts: [number, number, number][] = [];
      const samples = 9;
      for (let k = 0; k <= samples; k += 1) {
        const t = k / samples;
        const angle = -Math.PI / 2 + t * (endAngle + Math.PI / 2);
        pts.push([rx * Math.cos(angle) * s, y0 - drop * t * t, rz * Math.sin(angle)]);
      }
      parts.push(tube(pts, 0.021, 0.016, { detail: 6 }));
    }
  }
  return parts;
}

function pelvisParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    // iliac wing, flaring up and out
    parts.push(ell([0.33 * s, 4.18, -0.04], [0.3, 0.26, 0.08], [0, 0.3 * s, 0.45 * s], { wobble: 0.04 }));
    // acetabulum / ischium / pubis
    parts.push(ell([0.3 * s, 3.95, 0.0], [0.11, 0.1, 0.09], [0, 0, 0], { wobble: 0.03 }));
    parts.push(
      tube(
        [
          [0.3 * s, 3.88, 0.0],
          [0.24 * s, 3.78, 0.08],
          [0.14 * s, 3.74, 0.16],
          [0.05 * s, 3.73, 0.2],
        ],
        0.045,
        0.035,
        { detail: 7 },
      ),
    );
    parts.push(
      tube(
        [
          [0.31 * s, 3.9, -0.02],
          [0.3 * s, 3.8, -0.1],
          [0.22 * s, 3.74, -0.14],
        ],
        0.04,
        0.032,
        { detail: 7 },
      ),
    );
    // sacroiliac joint bridge
    parts.push(
      tube(
        [
          [0.12 * s, 4.16, -0.2],
          [0.24 * s, 4.12, -0.14],
          [0.33 * s, 4.06, -0.06],
        ],
        0.06,
        0.045,
        { detail: 7 },
      ),
    );
  }
  return parts;
}

function humerusParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(ell([0.9 * s, 6.55, 0.0], [0.075, 0.075, 0.075], [0, 0, 0], { detail: 12 }));
    parts.push(
      tube(
        [
          [0.9 * s, 6.48, 0.0],
          [0.97 * s, 6.2, 0.005],
          [1.03 * s, 5.92, 0.005],
          [1.09 * s, 5.66, 0.005],
          [1.11 * s, 5.52, 0.005],
        ],
        0.062,
        0.048,
        { detail: 9 },
      ),
    );
    parts.push(ell([1.12 * s, 5.47, 0.01], [0.072, 0.05, 0.062], [0, 0, 0.1 * s], { detail: 10 }));
  }
  return parts;
}

function radiusUlnaParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(
      tube(
        [
          [1.09 * s, 5.42, 0.045],
          [1.15 * s, 5.12, 0.05],
          [1.21 * s, 4.75, 0.045],
          [1.25 * s, 4.4, 0.035],
          [1.27 * s, 4.16, 0.03],
        ],
        0.034,
        0.022,
        { detail: 8 },
      ),
    );
    parts.push(
      tube(
        [
          [1.13 * s, 5.4, -0.045],
          [1.17 * s, 5.05, -0.04],
          [1.22 * s, 4.65, -0.03],
          [1.26 * s, 4.3, -0.022],
          [1.28 * s, 4.15, -0.018],
        ],
        0.03,
        0.018,
        { detail: 8 },
      ),
    );
    parts.push(ell([1.13 * s, 5.43, -0.05], [0.055, 0.045, 0.045], [0, 0, 0], { detail: 10 }));
  }
  return parts;
}

function femurParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(ell([0.31 * s, 4.12, -0.02], [0.078, 0.078, 0.078], [0, 0, 0], { detail: 12 }));
    parts.push(
      tube(
        [
          [0.33 * s, 4.1, -0.015],
          [0.36 * s, 4.04, 0.0],
          [0.37 * s, 3.95, 0.005],
          [0.39 * s, 3.4, 0.01],
          [0.4 * s, 2.8, 0.02],
          [0.4 * s, 2.44, 0.02],
        ],
        0.055,
        0.055,
        { detail: 10 },
      ),
    );
    parts.push(ell([0.35 * s, 2.4, 0.015], [0.075, 0.06, 0.07], [0, 0, 0], { detail: 10 }));
    parts.push(ell([0.45 * s, 2.4, 0.015], [0.075, 0.06, 0.07], [0, 0, 0], { detail: 10 }));
  }
  return parts;
}

function clavicleParts(): Part[] {
  return SIDES.flatMap((s: Side) => [
    tube(
      [
        [0.03 * s, 6.76, 0.28],
        [0.24 * s, 6.79, 0.2],
        [0.5 * s, 6.77, 0.12],
        [0.75 * s, 6.72, 0.04],
        [0.88 * s, 6.68, 0.0],
      ],
      0.03,
      0.022,
      { detail: 8 },
    ),
  ]);
}

function scapulaParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(ell([0.56 * s, 6.4, -0.35], [0.2, 0.25, 0.035], [0.1, 0.28 * s, 0.16 * s], { wobble: 0.04 }));
    parts.push(
      tube(
        [
          [0.42 * s, 6.0, -0.34],
          [0.54 * s, 6.28, -0.37],
          [0.7 * s, 6.5, -0.37],
          [0.8 * s, 6.62, -0.33],
        ],
        0.024,
        0.018,
        { detail: 7 },
      ),
    );
    parts.push(ell([0.8 * s, 6.62, -0.3], [0.07, 0.035, 0.05], [0, 0, 0], { detail: 8 }));
  }
  return parts;
}

function patellaParts(): Part[] {
  return SIDES.flatMap((s) => [ell([0.4 * s, 2.34, 0.16], [0.082, 0.11, 0.03], [0.1, 0, 0], { wobble: 0.05 })]);
}

function skullParts(): Part[] {
  const parts: Part[] = [
    ell([0, 7.6, 0.0], [0.35, 0.43, 0.385], [0, 0, 0], { wobble: 0.02, detail: 22 }),
    ell([0, 7.34, 0.1], [0.265, 0.27, 0.3], [0, 0, 0], { wobble: 0.02, detail: 18 }),
    ell([0, 7.26, 0.24], [0.165, 0.085, 0.15], [0, 0, 0], { detail: 14 }),
    ell([0, 7.52, 0.32], [0.25, 0.045, 0.09], [0.2, 0, 0], { detail: 12 }),
  ];
  for (const s of SIDES) {
    parts.push(ell([0.24 * s, 7.36, 0.22], [0.085, 0.055, 0.1], [0, -0.2 * s, 0], { detail: 12 }));
    // temporal / jaw joint
    parts.push(ell([0.3 * s, 7.4, -0.04], [0.075, 0.06, 0.07], [0, 0, 0], { detail: 10 }));
  }
  // upper teeth
  for (let i = 0; i < 10; i += 1) {
    const x = -0.13 + (i / 9) * 0.26;
    parts.push({ kind: 'box', at: [x, 7.18, 0.29], size: [0.013, 0.02, 0.012], detail: 6 });
  }
  return parts;
}

function mandibleParts(): Part[] {
  const parts: Part[] = [
    tube(
      [
        [-0.24, 7.16, 0.06],
        [-0.18, 7.1, 0.2],
        [-0.08, 7.07, 0.28],
        [0.08, 7.07, 0.28],
        [0.18, 7.1, 0.2],
        [0.24, 7.16, 0.06],
      ],
      0.032,
      0.032,
      { detail: 8 },
    ),
    ell([0, 7.12, 0.27], [0.08, 0.045, 0.04], [0, 0, 0], { detail: 10 }),
  ];
  for (const s of SIDES) {
    parts.push(
      tube(
        [
          [0.24 * s, 7.16, 0.06],
          [0.27 * s, 7.24, 0.02],
          [0.27 * s, 7.32, 0.0],
        ],
        0.03,
        0.024,
        { detail: 7 },
      ),
    );
    for (let i = 0; i < 5; i += 1) {
      const x = 0.02 + i * 0.026;
      parts.push({ kind: 'box', at: [x * s, 7.13, 0.27], size: [0.012, 0.018, 0.011], detail: 6 });
    }
  }
  return parts;
}

function extraBoneParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    // tibia + fibula
    parts.push(
      tube(
        [
          [0.4 * s, 2.3, 0.02],
          [0.4 * s, 1.7, 0.02],
          [0.41 * s, 1.0, 0.01],
          [0.42 * s, 0.5, 0.0],
          [0.42 * s, 0.28, 0.0],
        ],
        0.062,
        0.04,
        { detail: 9 },
      ),
    );
    parts.push(
      tube(
        [
          [0.47 * s, 2.28, 0.0],
          [0.47 * s, 1.7, 0.01],
          [0.46 * s, 1.0, 0.02],
          [0.44 * s, 0.5, 0.02],
          [0.43 * s, 0.3, 0.02],
        ],
        0.024,
        0.016,
        { detail: 7 },
      ),
    );
    // hand: metacarpals + phalanges
    const wrist: [number, number, number] = [1.27 * s, 4.16, 0.02];
    const baseX = HAND_CENTER[s === 1 ? 'left' : 'right'][0];
    const fingerZ = [0.085, 0.03, -0.025, -0.075];
    for (let i = 0; i < 4; i += 1) {
      const z = fingerZ[i] + 0.02;
      parts.push(tube([wrist, [baseX, 3.88, z * 0.8], [baseX, 3.82, z]], 0.016, 0.011, { detail: 6 }));
      parts.push(tube([[baseX, 3.82, z], [baseX, 3.72, z + 0.01], [baseX, 3.64, z + 0.02]], 0.01, 0.008, { detail: 6 }));
    }
    parts.push(
      tube(
        [
          [1.24 * s, 4.12, 0.06],
          [1.22 * s, 4.0, 0.13],
          [1.2 * s, 3.9, 0.16],
        ],
        0.014,
        0.01,
        { detail: 6 },
      ),
    );
    // foot: tarsals + metatarsals
    parts.push(ell([0.42 * s, 0.11, 0.1], [0.1, 0.08, 0.16], [0, 0, 0], { wobble: 0.03, detail: 10 }));
    for (let i = 0; i < 5; i += 1) {
      const dx = (-0.055 + i * 0.035) * s;
      parts.push(tube([[0.42 * s, 0.11, 0.18], [0.42 * s + dx, 0.08, 0.3], [0.42 * s + dx, 0.07, 0.42]], 0.014, 0.01, { detail: 6 }));
    }
  }
  // hyoid
  parts.push({ kind: 'torus', at: [0, 7.08, 0.12], size: [0.05, 0.012, 0.012], rot: [Math.PI / 2, 0, 0], detail: 10 });
  // lower leg knee joint caps
  for (const s of SIDES) parts.push(ell([0.4 * s, 2.3, 0.03], [0.07, 0.05, 0.07], [0, 0, 0], { detail: 8 }));
  return parts;
}

export const SKELETON_GROUPS: BoneGroup[] = [
  { organId: 'skull', color: BONE, parts: skullParts() },
  { organId: 'mandible', color: BONE, parts: mandibleParts() },
  { organId: 'vertebral-column', color: BONE_2, parts: spineParts() },
  { organId: 'ribcage', color: BONE_3, parts: ribcageParts() },
  {
    organId: 'sternum',
    color: BONE_3,
    parts: [
      ell([0, 6.62, 0.3], [0.072, 0.1, 0.03], [0.15, 0, 0], { detail: 10 }),
      ell([0, 6.22, 0.34], [0.055, 0.24, 0.026], [0.1, 0, 0], { detail: 10 }),
      { kind: 'cone', at: [0, 5.96, 0.345], size: [0.035, 0.055, 0.02], rot: [Math.PI, 0, 0], detail: 8 },
    ],
  },
  { organId: 'pelvis', color: BONE_2, parts: pelvisParts() },
  { organId: 'femur', color: BONE, parts: femurParts() },
  { organId: 'humerus', color: BONE, parts: humerusParts() },
  { organId: 'radius-ulna', color: BONE, parts: radiusUlnaParts() },
  { organId: 'scapula', color: BONE_2, parts: scapulaParts() },
  { organId: 'clavicle', color: BONE_3, parts: clavicleParts() },
  { organId: 'patella', color: BONE_3, parts: patellaParts() },
  { organId: null, color: BONE_4, parts: extraBoneParts() },
];
