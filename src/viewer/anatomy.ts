import { SYSTEM_META } from './systems';
import { ell, organ, tube } from './authoring';
import { FOOT_TOE_TIPS, HAND_FINGER_TIPS, SIDES, type Side } from './bodyData';
import type { OrganPlacement, Part, Vec3 } from './types';

/* ------------------------------------------------------------------ *
 * The anatomical placement table.
 *
 * Every organ id from docs/CONTENT_SPEC.md has one representation here.
 * Positions are chosen to look right at the scale of the stylised figure
 * (8 units tall, shoulders at ~6.6, hips at ~4.1, head at ~7.5), so they are
 * anatomical *impressions* rather than millimetre coordinates. The optional
 * `at` anchor is what labels and the camera focus use.
 * ------------------------------------------------------------------ */

/** Deterministic point cloud inside an ellipsoid (golden-angle spiral). */
function cluster(center: Vec3, radii: Vec3, count: number, radius: number, detail = 6): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.399963;
    out.push(
      ell(
        [
          center[0] + Math.cos(a) * ring * radii[0],
          center[1] + y * radii[1],
          center[2] + Math.sin(a) * ring * radii[2],
        ],
        [radius, radius, radius],
        undefined,
        { detail },
      ),
    );
  }
  return out;
}

const both = (fn: (side: Side) => Part[]): Part[] => SIDES.flatMap(fn);

/* ------------------------------- networks ------------------------------- */

function arteryParts(): Part[] {
  return both((s) => [
    tube(
      [
        [0.02, 6.52, 0.1],
        [0.32 * s, 6.5, 0.07],
        [0.7 * s, 6.44, 0.03],
        [0.94 * s, 6.2, 0.01],
        [1.06 * s, 5.78, 0.02],
      ],
      0.042,
      0.028,
    ),
    tube(
      [
        [1.05 * s, 5.72, 0.02],
        [1.13 * s, 5.38, 0.02],
        [1.2 * s, 4.9, 0.02],
        [1.26 * s, 4.4, 0.02],
      ],
      0.026,
      0.014,
    ),
    tube(
      [
        [0.06 * s, 6.45, 0.1],
        [0.1 * s, 6.7, 0.08],
        [0.13 * s, 7.0, 0.07],
      ],
      0.026,
      0.013,
    ),
    tube(
      [
        [0.02, 6.4, -0.1],
        [0.0, 5.8, -0.13],
        [0.0, 5.1, -0.12],
        [0.0, 4.45, -0.08],
      ],
      0.048,
      0.038,
    ),
    tube(
      [
        [0.02 * s, 4.35, -0.06],
        [0.16 * s, 4.15, 0.0],
        [0.3 * s, 3.7, 0.05],
        [0.37 * s, 3.0, 0.04],
        [0.4 * s, 2.4, 0.03],
        [0.42 * s, 1.6, 0.03],
        [0.44 * s, 0.9, 0.02],
        [0.44 * s, 0.45, 0.02],
      ],
      0.03,
      0.013,
    ),
    tube(
      [
        [0.05 * s, 4.92, -0.1],
        [0.2 * s, 4.94, -0.14],
        [0.35 * s, 4.96, -0.18],
      ],
      0.017,
      0.011,
    ),
    tube(
      [
        [0.03 * s, 4.8, -0.08],
        [0.12 * s, 4.65, 0.05],
        [0.22 * s, 4.5, 0.12],
      ],
      0.014,
      0.008,
    ),
  ]);
}

function veinParts(): Part[] {
  return both((s) => [
    tube(
      [
        [0.0, 6.55, 0.04],
        [0.12 * s, 6.45, 0.02],
        [0.45 * s, 6.4, 0.0],
        [0.8 * s, 6.3, 0.01],
        [0.98 * s, 6.05, 0.03],
      ],
      0.04,
      0.024,
    ),
    tube(
      [
        [1.02 * s, 5.95, 0.04],
        [1.13 * s, 5.5, 0.05],
        [1.22 * s, 4.9, 0.05],
        [1.27 * s, 4.35, 0.05],
      ],
      0.03,
      0.016,
    ),
    tube(
      [
        [0.05 * s, 6.5, 0.03],
        [0.08 * s, 6.8, 0.04],
        [0.1 * s, 7.08, 0.04],
      ],
      0.024,
      0.012,
    ),
    tube(
      [
        [0.0, 4.22, -0.06],
        [0.02, 4.9, -0.08],
        [0.04, 5.5, -0.06],
        [0.05, 5.95, 0.02],
      ],
      0.058,
      0.042,
    ),
    tube(
      [
        [0.02 * s, 4.3, -0.04],
        [0.14 * s, 4.05, 0.02],
        [0.28 * s, 3.6, 0.07],
        [0.36 * s, 2.9, 0.06],
        [0.4 * s, 2.3, 0.05],
        [0.41 * s, 1.5, 0.05],
        [0.43 * s, 0.8, 0.04],
        [0.43 * s, 0.4, 0.03],
      ],
      0.027,
      0.013,
    ),
    tube(
      [
        [0.04 * s, 5.0, -0.06],
        [0.2 * s, 5.0, -0.12],
        [0.35 * s, 5.0, -0.16],
      ],
      0.015,
      0.01,
    ),
  ]);
}

function capillaryParts(): Part[] {
  const parts: Part[] = [];
  for (const tip of HAND_FINGER_TIPS) {
    const s = tip[0] > 0 ? 1 : -1;
    parts.push(
      tube(
        [
          [tip[0] - 0.01 * s, tip[1] + 0.02, tip[2]],
          [tip[0] - 0.03 * s, tip[1] + 0.09, tip[2] + 0.02],
          [tip[0] - 0.05 * s, tip[1] + 0.17, tip[2] + 0.01],
        ],
        0.008,
        0.005,
        { detail: 5 },
      ),
    );
  }
  for (const tip of FOOT_TOE_TIPS) {
    parts.push(
      tube(
        [
          [tip[0], tip[1] + 0.01, tip[2]],
          [tip[0], tip[1] + 0.07, tip[2] + 0.02],
          [tip[0], tip[1] + 0.14, tip[2] + 0.03],
        ],
        0.008,
        0.005,
        { detail: 5 },
      ),
    );
  }
  for (const s of SIDES) {
    parts.push(
      tube(
        [
          [0.16 * s, 7.42, 0.42],
          [0.22 * s, 7.38, 0.41],
          [0.26 * s, 7.32, 0.38],
        ],
        0.007,
        0.005,
        { detail: 5 },
      ),
    );
    parts.push(
      tube(
        [
          [0.2 * s, 6.35, 0.48],
          [0.3 * s, 6.2, 0.5],
          [0.36 * s, 6.0, 0.48],
        ],
        0.007,
        0.005,
        { detail: 5 },
      ),
    );
  }
  return parts;
}

function peripheralNerveParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(
      tube(
        [
          [0.02 * s, 6.72, -0.16],
          [0.4 * s, 6.58, -0.1],
          [0.8 * s, 6.4, -0.04],
          [1.02 * s, 6.0, 0.0],
          [1.1 * s, 5.55, 0.02],
          [1.18 * s, 4.95, 0.03],
          [1.25 * s, 4.3, 0.04],
        ],
        0.022,
        0.01,
      ),
    );
    for (let i = 0; i < 4; i += 1) {
      const z = [0.085, 0.03, -0.025, -0.075][i] + 0.02;
      parts.push(
        tube(
          [
            [1.3 * s, 3.98, z],
            [1.31 * s, 3.82, z],
            [1.31 * s, 3.66, z + 0.02],
          ],
          0.009,
          0.005,
          { detail: 5 },
        ),
      );
    }
    parts.push(
      tube(
        [
          [0.0, 5.1, -0.22],
          [0.08 * s, 4.8, -0.2],
          [0.2 * s, 4.4, -0.14],
          [0.3 * s, 3.9, -0.08],
          [0.36 * s, 3.2, -0.04],
          [0.38 * s, 2.6, 0.0],
          [0.4 * s, 2.2, 0.05],
          [0.41 * s, 1.6, 0.0],
          [0.42 * s, 1.0, 0.03],
          [0.42 * s, 0.5, 0.05],
        ],
        0.026,
        0.01,
      ),
    );
    for (let i = 0; i < 5; i += 1) {
      parts.push(
        tube(
          [
            [0.42 * s, 0.44, 0.05],
            [0.42 * s + (i - 2) * 0.02 * s, 0.3, 0.2],
            [0.42 * s + (i - 2) * 0.035 * s, 0.12, 0.38],
          ],
          0.008,
          0.004,
          { detail: 5 },
        ),
      );
    }
    // intercostal nerves follow the ribs
    for (let i = 0; i < 10; i += 1) {
      const y = 6.62 - i * 0.095;
      const r = 0.5 + i * 0.035;
      parts.push(
        tube(
          [
            [0.03 * s, y, -0.24],
            [0.45 * r * s, y - 0.03, 0.0],
            [0.34 * r * s, y - 0.1, 0.3],
          ],
          0.008,
          0.006,
          { detail: 5 },
        ),
      );
    }
    // facial branches
    parts.push(
      tube(
        [
          [0.02 * s, 7.16, -0.06],
          [0.12 * s, 7.3, 0.12],
          [0.18 * s, 7.42, 0.3],
          [0.2 * s, 7.48, 0.38],
        ],
        0.014,
        0.006,
        { detail: 5 },
      ),
    );
  }
  return parts;
}

function sciaticParts(): Part[] {
  return both((s) => [
    tube(
      [
        [0.2 * s, 4.16, -0.15],
        [0.28 * s, 3.8, -0.12],
        [0.33 * s, 3.3, -0.1],
        [0.36 * s, 2.75, -0.08],
        [0.38 * s, 2.3, -0.04],
      ],
      0.036,
      0.026,
    ),
    tube(
      [
        [0.38 * s, 2.3, -0.04],
        [0.4 * s, 1.9, -0.08],
        [0.41 * s, 1.3, -0.05],
        [0.42 * s, 0.7, -0.01],
        [0.42 * s, 0.32, 0.02],
      ],
      0.02,
      0.009,
    ),
    tube(
      [
        [0.38 * s, 2.3, 0.0],
        [0.43 * s, 2.1, 0.06],
        [0.45 * s, 1.6, 0.08],
        [0.45 * s, 1.1, 0.04],
      ],
      0.012,
      0.007,
    ),
  ]);
}

function lymphaticVesselParts(): Part[] {
  return both((s) => [
    tube(
      [
        [0.1 * s, 6.9, 0.05],
        [0.2 * s, 6.6, 0.02],
        [0.45 * s, 6.25, 0.0],
        [0.7 * s, 6.1, 0.02],
        [0.85 * s, 5.95, 0.04],
      ],
      0.012,
      0.008,
    ),
    tube(
      [
        [0.8 * s, 5.95, 0.05],
        [0.95 * s, 5.6, 0.05],
        [1.08 * s, 5.1, 0.05],
        [1.2 * s, 4.5, 0.04],
      ],
      0.008,
      0.006,
    ),
    tube(
      [
        [0.1 * s, 5.2, 0.05],
        [0.2 * s, 4.8, 0.08],
        [0.28 * s, 4.2, 0.1],
        [0.3 * s, 3.9, 0.1],
        [0.32 * s, 3.4, 0.08],
        [0.38 * s, 2.6, 0.06],
        [0.41 * s, 1.8, 0.05],
        [0.42 * s, 1.0, 0.04],
      ],
      0.008,
      0.006,
    ),
    tube(
      [
        [0.05 * s, 4.6, -0.18],
        [0.18 * s, 4.6, -0.14],
        [0.3 * s, 4.5, -0.08],
        [0.36 * s, 4.2, 0.02],
      ],
      0.008,
      0.006,
    ),
    tube(
      [
        [0.06 * s, 6.2, 0.3],
        [0.15 * s, 6.0, 0.35],
        [0.2 * s, 5.7, 0.34],
      ],
      0.008,
      0.006,
    ),
  ]);
}

function coronaryParts(): Part[] {
  return [
    tube(
      [
        [0.02, 6.32, 0.3],
        [0.12, 6.22, 0.32],
        [0.2, 6.06, 0.28],
        [0.22, 5.96, 0.2],
      ],
      0.016,
      0.008,
    ),
    tube(
      [
        [0.04, 6.33, 0.14],
        [0.16, 6.24, 0.06],
        [0.22, 6.02, 0.05],
        [0.2, 5.93, 0.12],
      ],
      0.014,
      0.007,
    ),
    tube(
      [
        [0.12, 6.22, 0.32],
        [0.16, 6.1, 0.33],
        [0.14, 6.0, 0.3],
      ],
      0.009,
      0.005,
      { detail: 6 },
    ),
    tube(
      [
        [0.02, 6.32, 0.3],
        [0.0, 6.38, 0.22],
        [0.0, 6.3, 0.12],
      ],
      0.009,
      0.005,
      { detail: 6 },
    ),
  ];
}

function tracheaParts(): Part[] {
  const parts: Part[] = [
    tube(
      [
        [0, 7.04, 0.06],
        [0, 6.92, 0.04],
        [0, 6.8, 0.02],
        [0, 6.68, 0.01],
      ],
      0.088,
      0.078,
    ),
  ];
  for (let i = 0; i < 7; i += 1) {
    const y = 7.02 - i * 0.05;
    const r = 0.088 - i * 0.0015;
    parts.push({
      kind: 'torus',
      at: [0, y, 0.05 - i * 0.004],
      size: [r + 0.004, 0.008, 0.008],
      rot: [Math.PI / 2, 0, 0],
      detail: 8,
    });
  }
  return parts;
}

function bronchiParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    parts.push(
      tube(
        [
          [0, 6.68, 0.01],
          [0.1 * s, 6.6, 0.0],
          [0.24 * s, 6.5, 0.0],
          [0.4 * s, 6.45, 0.0],
        ],
        0.052,
        0.036,
      ),
    );
    parts.push(
      tube(
        [
          [0.2 * s, 6.53, 0.0],
          [0.3 * s, 6.66, 0.04],
          [0.36 * s, 6.76, 0.02],
        ],
        0.024,
        0.016,
      ),
    );
    parts.push(
      tube(
        [
          [0.24 * s, 6.5, 0.0],
          [0.34 * s, 6.3, -0.04],
          [0.42 * s, 6.15, -0.02],
        ],
        0.022,
        0.014,
      ),
    );
  }
  return parts;
}

function bronchioleParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    for (let i = 0; i < 8; i += 1) {
      const t = i / 8;
      const y = 6.55 - t * 0.5;
      parts.push(
        tube(
          [
            [0.42 * s, y, 0.0],
            [0.48 * s, y - 0.06, -0.05 + t * 0.04],
            [0.52 * s, y - 0.12, -0.08 + t * 0.06],
          ],
          0.012,
          0.007,
          { detail: 5 },
        ),
      );
    }
  }
  return parts;
}

function smallIntestineParts(): Part[] {
  const parts: Part[] = [
    tube(
      [
        [0.24, 5.18, 0.12],
        [0.08, 5.02, 0.16],
        [0.02, 4.9, 0.14],
      ],
      0.055,
      0.05,
    ),
  ];
  const points: Vec3[] = [];
  const turns = 5;
  const n = turns * 9;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = i * 0.72;
    const radius = 0.28 * (1 - t * 0.25);
    points.push([
      0.02 + Math.cos(a) * radius,
      4.86 - t * 0.74 + Math.sin(a * 0.6) * 0.04,
      0.12 + Math.sin(a) * 0.14,
    ]);
  }
  parts.push(tube(points, 0.052, 0.045, { detail: 7 }));
  return parts;
}

function largeIntestineParts(): Part[] {
  const path: Vec3[] = [
    [-0.34, 4.18, 0.16],
    [-0.4, 4.5, 0.14],
    [-0.42, 4.9, 0.1],
    [-0.38, 5.24, 0.08],
    [-0.2, 5.4, 0.1],
    [0.02, 5.44, 0.12],
    [0.24, 5.4, 0.1],
    [0.4, 5.18, 0.08],
    [0.44, 4.85, 0.08],
    [0.4, 4.5, 0.12],
    [0.3, 4.2, 0.12],
    [0.16, 4.08, 0.08],
    [0.06, 4.0, 0.02],
  ];
  const parts: Part[] = [tube(path, 0.07, 0.06, { detail: 8 })];
  // haustral folds
  for (let i = 0; i < 10; i += 1) {
    const p = path[1 + Math.floor((i / 10) * (path.length - 2))];
    parts.push(ell([p[0], p[1], p[2]], [0.082, 0.03, 0.082], undefined, { detail: 8 }));
  }
  return parts;
}

function smallBrainParts(): Part[] {
  return [
    ell([0.15, 7.64, -0.02], [0.185, 0.215, 0.235], [0, 0, 0.08], { wobble: 0.16, detail: 20 }),
    ell([-0.15, 7.64, -0.02], [0.185, 0.215, 0.235], [0, 0, -0.08], { wobble: 0.16, detail: 20 }),
    ell([0, 7.6, 0.14], [0.27, 0.16, 0.17], [0.1, 0, 0], { wobble: 0.14, detail: 18 }),
    ell([0, 7.7, -0.16], [0.24, 0.15, 0.16], [-0.1, 0, 0], { wobble: 0.14, detail: 18 }),
  ];
}

function lymphNodeParts(): Part[] {
  const spots: Vec3[] = [];
  for (const s of SIDES) {
    spots.push(
      [0.13 * s, 7.0, 0.03],
      [0.17 * s, 6.92, 0.0],
      [0.1 * s, 7.06, 0.1],
      [0.82 * s, 6.12, 0.04],
      [0.86 * s, 6.02, 0.0],
      [0.9 * s, 5.92, 0.04],
      [0.2 * s, 6.2, 0.18],
      [0.18 * s, 5.0, 0.08],
      [0.28 * s, 4.72, 0.06],
      [0.28 * s, 4.02, 0.1],
      [0.3 * s, 3.92, 0.08],
      [0.24 * s, 3.86, 0.12],
    );
  }
  spots.push([0.0, 6.5, -0.02], [0.0, 4.7, 0.0]);
  return spots.map((p, i) =>
    ell(p, [0.022 + (i % 3) * 0.006, 0.02 + (i % 2) * 0.006, 0.022], undefined, { detail: 8 }),
  );
}

function nephronParts(): Part[] {
  const parts: Part[] = [];
  for (const s of SIDES) {
    for (let i = 0; i < 7; i += 1) {
      const a = i * 1.9;
      const cx = 0.44 * s;
      const cy = 4.85 + (i - 3) * 0.035;
      const cz = -0.2;
      parts.push(
        tube(
          [
            [cx + Math.cos(a) * 0.06, cy, cz + Math.sin(a) * 0.04],
            [cx + Math.cos(a + 1) * 0.03, cy + 0.03, cz + Math.sin(a + 1) * 0.02],
            [cx + Math.cos(a + 2) * 0.05, cy + 0.01, cz + Math.sin(a + 2) * 0.03],
          ],
          0.007,
          0.005,
          { detail: 5 },
        ),
      );
    }
  }
  return parts;
}

function sweatGlandParts(): Part[] {
  const spots: Vec3[] = [
    [0.3, 6.3, 0.46],
    [-0.3, 6.3, 0.46],
    [0.18, 5.8, 0.45],
    [-0.18, 5.8, 0.45],
    [0.25, 5.3, 0.44],
    [-0.25, 5.3, 0.44],
    [0.15, 4.9, 0.43],
    [-0.15, 4.9, 0.43],
    [0.5, 6.05, 0.3],
    [-0.5, 6.05, 0.3],
    [0.3, 6.4, -0.4],
    [-0.3, 6.4, -0.4],
    [0.2, 5.6, -0.44],
    [-0.2, 5.6, -0.44],
    [0.95, 6.2, 0.16],
    [-0.95, 6.2, 0.16],
    [1.1, 5.4, 0.1],
    [-1.1, 5.4, 0.1],
    [1.19, 4.6, 0.1],
    [-1.19, 4.6, 0.1],
    [0.37, 3.2, 0.27],
    [-0.37, 3.2, 0.27],
    [0.41, 1.9, -0.16],
    [-0.41, 1.9, -0.16],
    [0.42, 1.0, 0.08],
    [-0.42, 1.0, 0.08],
    [0.16, 7.42, 0.4],
    [-0.16, 7.42, 0.4],
  ];
  return spots.map((p) => ell(p, [0.013, 0.013, 0.013], undefined, { detail: 6 }));
}

function sebaceousParts(): Part[] {
  const spots: Vec3[] = [
    [0.12, 7.48, 0.42],
    [-0.12, 7.48, 0.42],
    [0.2, 7.3, 0.4],
    [-0.2, 7.3, 0.4],
    [0.24, 7.52, 0.34],
    [-0.24, 7.52, 0.34],
    [0.06, 7.78, 0.16],
    [0.32, 6.35, 0.42],
    [-0.32, 6.35, 0.42],
    [0.18, 6.1, 0.44],
    [-0.18, 6.1, 0.44],
    [0.07, 5.2, 0.44],
    [0.36, 4.2, 0.3],
    [-0.36, 4.2, 0.3],
    [0.4, 2.7, 0.24],
    [-0.4, 2.7, 0.24],
    [0.42, 1.8, -0.18],
    [-0.42, 1.8, -0.18],
  ];
  return spots.map((p) => ell(p, [0.011, 0.011, 0.011], undefined, { detail: 6 }));
}

/* ------------------------------ the table ------------------------------ */

export const ORGAN_PLACEMENTS: OrganPlacement[] = [
  /* ============================== skeletal ============================== */
  organ('skull', 'skeletal', 'Skull', 'head-neck', '#e9d9b8', [0, 7.58, 0], [], {
    layer: 'skeleton',
    focusDist: 2.6,
  }),
  organ('mandible', 'skeletal', 'Mandible', 'head-neck', '#e9d9b8', [0, 7.14, 0.2], [], {
    layer: 'skeleton',
    focusDist: 1.7,
  }),
  organ('vertebral-column', 'skeletal', 'Vertebral Column', 'whole-body', '#e6d5b2', [0, 5.65, -0.25], [], {
    layer: 'skeleton',
    focus: [0, 5.7, -0.26],
    focusDist: 3.6,
  }),
  organ('ribcage', 'skeletal', 'Ribcage', 'thorax', '#eadbbd', [0, 6.2, 0.02], [], {
    layer: 'skeleton',
    focusDist: 3.4,
  }),
  organ('sternum', 'skeletal', 'Sternum', 'thorax', '#eadbbd', [0, 6.22, 0.37], [], {
    layer: 'skeleton',
    focusDist: 2.2,
  }),
  organ('pelvis', 'skeletal', 'Pelvis', 'pelvis', '#e6d5b2', [0, 4.08, 0.0], [], {
    layer: 'skeleton',
    focusDist: 3.0,
  }),
  organ('femur', 'skeletal', 'Femur', 'lower-limb', '#e9d9b8', [0.38, 3.2, 0.02], [], {
    layer: 'skeleton',
    focus: [0.39, 3.2, 0.02],
    focusDist: 3.2,
  }),
  organ('humerus', 'skeletal', 'Humerus', 'upper-limb', '#e9d9b8', [1.0, 6.0, 0.0], [], {
    layer: 'skeleton',
    focus: [1.0, 6.0, 0.0],
    focusDist: 3.0,
  }),
  organ('radius-ulna', 'skeletal', 'Radius and Ulna', 'upper-limb', '#e9d9b8', [1.2, 4.78, 0.02], [], {
    layer: 'skeleton',
    focus: [1.2, 4.78, 0.02],
    focusDist: 2.8,
  }),
  organ('scapula', 'skeletal', 'Scapula', 'upper-limb', '#e6d5b2', [0.55, 6.35, -0.34], [], {
    layer: 'skeleton',
    focus: [0.55, 6.35, -0.34],
    focusDist: 2.6,
  }),
  organ('clavicle', 'skeletal', 'Clavicle', 'thorax', '#eadbbd', [0.42, 6.72, 0.18], [], {
    layer: 'skeleton',
    focus: [0.42, 6.72, 0.18],
    focusDist: 2.2,
  }),
  organ('patella', 'skeletal', 'Patella', 'lower-limb', '#eadbbd', [0.4, 2.34, 0.18], [], {
    layer: 'skeleton',
    focus: [0.4, 2.34, 0.18],
    focusDist: 1.7,
  }),

  /* ============================== muscular ============================== */
  organ(
    'deltoid',
    'muscular',
    'Deltoid',
    'upper-limb',
    '#b45a41',
    [0, 6.52, 0.0],
    both((s) => [ell([0.94 * s, 6.53, 0.0], [0.2, 0.25, 0.19], [0, 0, -0.22 * s], { wobble: 0.08 })]),
    { focusDist: 3.4 },
  ),
  organ(
    'pectoralis-major',
    'muscular',
    'Pectoralis Major',
    'thorax',
    '#bd5e45',
    [0, 6.3, 0.38],
    both((s) => [
      ell([0.3 * s, 6.34, 0.38], [0.27, 0.18, 0.1], [0.12, 0.28 * s, 0.1 * s], { wobble: 0.07 }),
      ell([0.38 * s, 6.18, 0.36], [0.18, 0.12, 0.07], [0.2, 0.2 * s, 0.2 * s], { wobble: 0.07 }),
    ]),
    { focusDist: 3.0 },
  ),
  organ(
    'rectus-abdominis',
    'muscular',
    'Rectus Abdominis',
    'abdomen',
    '#b4553e',
    [0, 5.3, 0.44],
    (() => {
      const parts: Part[] = [];
      for (let row = 0; row < 4; row += 1) {
        for (const s of SIDES) {
          parts.push(
            ell(
              [0.115 * s, 5.56 - row * 0.2, 0.42 - row * 0.005],
              [0.105, 0.085 - row * 0.008, 0.045],
              [0, 0, 0],
              { wobble: 0.06 },
            ),
          );
        }
      }
      return parts;
    })(),
    { focusDist: 3.0 },
  ),
  organ(
    'trapezius',
    'muscular',
    'Trapezius',
    'thorax',
    '#a84f39',
    [0, 6.42, -0.4],
    [
      ell([0, 6.55, -0.4], [0.5, 0.24, 0.055], [0.18, 0, 0], { wobble: 0.05 }),
      ...both((s) => [
        ell([0.3 * s, 6.25, -0.38], [0.24, 0.3, 0.05], [0.1, 0, 0.25 * s], { wobble: 0.05 }),
        ell([0.13 * s, 6.76, -0.2], [0.13, 0.18, 0.05], [0.2, 0, 0.3 * s], { wobble: 0.05 }),
      ]),
    ],
    { focusDist: 3.6 },
  ),
  organ(
    'biceps-brachii',
    'muscular',
    'Biceps Brachii',
    'upper-limb',
    '#c06046',
    [0, 5.95, 0.04],
    both((s) => [
      ell([1.04 * s, 5.98, 0.08], [0.085, 0.2, 0.075], [0, 0, -0.1 * s], { wobble: 0.08 }),
      ell([1.08 * s, 5.78, 0.06], [0.07, 0.13, 0.06], [0, 0, -0.1 * s], { wobble: 0.08 }),
    ]),
    { focusDist: 3.0 },
  ),
  organ(
    'gluteus-maximus',
    'muscular',
    'Gluteus Maximus',
    'pelvis',
    '#b25a44',
    [0, 4.1, -0.36],
    both((s) => [ell([0.28 * s, 4.12, -0.33], [0.25, 0.24, 0.13], [0.1, 0.1 * s, 0.15 * s], { wobble: 0.08 })]),
    { focusDist: 3.4 },
  ),
  organ(
    'quadriceps',
    'muscular',
    'Quadriceps',
    'lower-limb',
    '#bc5c3f',
    [0, 3.35, 0.1],
    both((s) => [
      ell([0.37 * s, 3.42, 0.16], [0.19, 0.36, 0.12], [0.05, 0, 0], { wobble: 0.07 }),
      ell([0.31 * s, 3.1, 0.19], [0.12, 0.24, 0.09], [0.05, 0, 0.12 * s], { wobble: 0.07 }),
      ell([0.45 * s, 3.2, 0.12], [0.1, 0.26, 0.09], [0.05, 0, -0.1 * s], { wobble: 0.07 }),
    ]),
    { focusDist: 3.4 },
  ),
  organ(
    'hamstrings',
    'muscular',
    'Hamstrings',
    'lower-limb',
    '#ab5038',
    [0, 3.3, -0.16],
    both((s) => [
      ell([0.36 * s, 3.35, -0.16], [0.16, 0.34, 0.1], [0, 0, 0.05 * s], { wobble: 0.07 }),
      ell([0.32 * s, 3.05, -0.2], [0.1, 0.22, 0.08], [0, 0, 0.12 * s], { wobble: 0.07 }),
    ]),
    { focusDist: 3.4 },
  ),
  organ(
    'gastrocnemius',
    'muscular',
    'Gastrocnemius',
    'lower-limb',
    '#b25942',
    [0, 1.75, -0.12],
    both((s) => [
      ell([0.38 * s, 1.78, -0.12], [0.115, 0.24, 0.1], [0, 0, 0.05 * s], { wobble: 0.08 }),
      ell([0.45 * s, 1.7, -0.1], [0.075, 0.18, 0.07], [0, 0, -0.1 * s], { wobble: 0.08 }),
    ]),
    { focusDist: 3.0 },
  ),
  organ(
    'diaphragm',
    'muscular',
    'Diaphragm',
    'thorax',
    '#a84a35',
    [0, 5.82, 0.02],
    [
      ell([0, 5.82, 0.02], [0.58, 0.14, 0.4], [0, 0, 0], { wobble: 0.05 }),
      ell([0, 5.76, 0.2], [0.3, 0.1, 0.16], [0.15, 0, 0], { wobble: 0.05 }),
      ell([0, 5.88, -0.2], [0.3, 0.1, 0.14], [-0.15, 0, 0], { wobble: 0.05 }),
    ],
    { focusDist: 3.6 },
  ),

  /* ============================== nervous ============================== */
  organ('brain', 'nervous', 'Brain', 'head-neck', '#d3a06f', [0, 7.62, -0.02], smallBrainParts(), {
    focusDist: 3.0,
  }),
  organ(
    'cerebellum',
    'nervous',
    'Cerebellum',
    'head-neck',
    '#cb9364',
    [0, 7.4, -0.27],
    [
      ell([0, 7.4, -0.26], [0.19, 0.11, 0.12], [0, 0, 0], { wobble: 0.2 }),
      ...both((s) => [ell([0.14 * s, 7.4, -0.24], [0.09, 0.08, 0.09], [0, 0, 0], { wobble: 0.2 })]),
    ],
    { focusDist: 2.2 },
  ),
  organ(
    'brainstem',
    'nervous',
    'Brainstem',
    'head-neck',
    '#d8ac7a',
    [0, 7.24, -0.12],
    [
      tube(
        [
          [0, 7.48, -0.1],
          [0, 7.3, -0.12],
          [0, 7.1, -0.16],
          [0, 6.98, -0.2],
        ],
        0.055,
        0.045,
      ),
    ],
    { focusDist: 2.2 },
  ),
  organ(
    'hypothalamus',
    'nervous',
    'Hypothalamus',
    'head-neck',
    '#e0b483',
    [0, 7.47, -0.02],
    [ell([0, 7.47, -0.02], [0.07, 0.045, 0.06], [0, 0, 0], { wobble: 0.04 })],
    { focusDist: 1.6 },
  ),
  organ(
    'hippocampus',
    'nervous',
    'Hippocampus',
    'head-neck',
    '#d6a272',
    [0, 7.4, -0.08],
    both((s) => [
      tube(
        [
          [0.06 * s, 7.42, 0.0],
          [0.15 * s, 7.44, -0.06],
          [0.13 * s, 7.38, -0.13],
          [0.08 * s, 7.36, -0.14],
        ],
        0.026,
        0.02,
        { detail: 6 },
      ),
    ]),
    { focusDist: 1.9 },
  ),
  organ(
    'amygdala',
    'nervous',
    'Amygdala',
    'head-neck',
    '#dfae76',
    [0, 7.38, 0.0],
    both((s) => [ell([0.17 * s, 7.38, 0.02], [0.04, 0.035, 0.045], [0, 0, 0], { wobble: 0.05 })]),
    { focusDist: 1.7 },
  ),
  organ(
    'spinal-cord',
    'nervous',
    'Spinal Cord',
    'whole-body',
    '#d2a45f',
    [0, 5.6, -0.24],
    [
      tube(
        [
          [0, 7.0, -0.2],
          [0, 6.5, -0.27],
          [0, 5.9, -0.29],
          [0, 5.3, -0.26],
          [0, 4.8, -0.23],
          [0, 4.4, -0.24],
        ],
        0.055,
        0.035,
      ),
      ...both((s) =>
        [0, 1, 2, 3].map((i) =>
          tube(
            [
              [0.02 * s, 4.5, -0.24],
              [0.06 * s + i * 0.02 * s, 4.36 - i * 0.03, -0.22],
              [0.12 * s + i * 0.03 * s, 4.24 - i * 0.04, -0.2],
            ],
            0.012,
            0.006,
            { detail: 5 },
          ),
        ),
      ),
    ],
    { focusDist: 4.2 },
  ),
  organ('peripheral-nerves', 'nervous', 'Peripheral Nerves', 'whole-body', '#caa05c', [0, 4.6, 0], peripheralNerveParts(), {
    focusDist: 12,
  }),
  organ(
    'sciatic-nerve',
    'nervous',
    'Sciatic Nerve',
    'lower-limb',
    '#c79855',
    [0.33, 3.2, -0.1],
    sciaticParts(),
    { focus: [0.33, 3.2, -0.1], focusDist: 5.0 },
  ),
  organ(
    'meninges',
    'nervous',
    'Meninges',
    'head-neck',
    '#e5d7ad',
    [0, 7.6, -0.02],
    [ell([0, 7.6, -0.02], [0.4, 0.42, 0.45], [0, 0, 0], { detail: 18 })],
    { focusDist: 3.6, translucent: 0.16, glow: 0 },
  ),

  /* =========================== cardiovascular =========================== */
  organ(
    'heart',
    'cardiovascular',
    'Heart',
    'thorax',
    '#c2414c',
    [0.12, 6.16, 0.18],
    [
      ell([0.13, 6.14, 0.16], [0.17, 0.21, 0.15], [0, 0, -0.32], { wobble: 0.05 }),
      ell([0.2, 6.0, 0.16], [0.085, 0.1, 0.08], [0, 0, -0.5]),
      ell([0.02, 6.32, 0.12], [0.12, 0.1, 0.1], [0, 0, 0], { wobble: 0.05 }),
      ell([0.17, 6.33, 0.09], [0.1, 0.09, 0.09], [0, 0, 0], { wobble: 0.05 }),
    ],
    { focusDist: 2.6 },
  ),
  organ(
    'aorta',
    'cardiovascular',
    'Aorta',
    'thorax',
    '#c94a50',
    [0.0, 6.2, -0.02],
    [
      tube(
        [
          [0.1, 6.3, 0.2],
          [0.08, 6.5, 0.16],
          [0.02, 6.62, 0.05],
          [-0.05, 6.56, -0.06],
          [-0.02, 6.34, -0.12],
          [0.0, 5.9, -0.14],
          [0.0, 5.2, -0.13],
          [0.0, 4.55, -0.09],
        ],
        0.082,
        0.052,
      ),
      ...both((s) => [
        tube(
          [
            [0.02, 6.55, 0.04],
            [0.09 * s, 6.68, 0.03],
            [0.13 * s, 6.9, 0.02],
            [0.14 * s, 7.1, 0.02],
          ],
          0.03,
          0.016,
        ),
        tube(
          [
            [0.02, 6.52, 0.02],
            [0.35 * s, 6.54, 0.0],
            [0.6 * s, 6.5, 0.0],
            [0.82 * s, 6.34, 0.02],
          ],
          0.038,
          0.022,
        ),
      ]),
    ],
    { focusDist: 4.2 },
  ),
  organ('coronary-arteries', 'cardiovascular', 'Coronary Arteries', 'thorax', '#dd6b62', [0.12, 6.14, 0.22], coronaryParts(), {
    focusDist: 2.4,
  }),
  organ('arteries', 'cardiovascular', 'Arteries', 'whole-body', '#c64a50', [0, 5.0, 0], arteryParts(), {
    focusDist: 12,
  }),
  organ('veins', 'cardiovascular', 'Veins', 'whole-body', '#6f82ab', [0, 5.0, 0], veinParts(), {
    focusDist: 12,
  }),
  organ('capillaries', 'cardiovascular', 'Capillaries', 'whole-body', '#d68d8a', [0, 4.2, 0], capillaryParts(), {
    focusDist: 9,
  }),
  organ(
    'vena-cava',
    'cardiovascular',
    'Vena Cava',
    'thorax',
    '#6b7ea6',
    [0.02, 5.6, -0.04],
    [
      tube(
        [
          [0.02, 6.62, 0.06],
          [0.04, 6.42, 0.12],
          [0.06, 6.26, 0.14],
        ],
        0.055,
        0.05,
      ),
      tube(
        [
          [0.0, 4.2, -0.08],
          [0.02, 4.9, -0.1],
          [0.04, 5.5, -0.06],
          [0.06, 5.95, 0.06],
          [0.06, 6.22, 0.12],
        ],
        0.065,
        0.05,
      ),
    ],
    { focusDist: 4.0 },
  ),
  organ(
    'pulmonary-arteries',
    'cardiovascular',
    'Pulmonary Arteries',
    'thorax',
    '#7d90b8',
    [0, 6.28, 0.1],
    [
      tube(
        [
          [0.12, 6.3, 0.18],
          [0.25, 6.36, 0.1],
          [0.4, 6.32, 0.02],
        ],
        0.045,
        0.03,
      ),
      tube(
        [
          [0.1, 6.24, 0.16],
          [-0.12, 6.3, 0.06],
          [-0.38, 6.3, 0.0],
        ],
        0.045,
        0.03,
      ),
    ],
    { focusDist: 3.2 },
  ),

  /* ============================ respiratory ============================ */
  organ(
    'lungs',
    'respiratory',
    'Lungs',
    'thorax',
    '#b98f8e',
    [0, 6.15, 0.02],
    [
      // right lung (subject's right, -x)
      ell([-0.38, 6.34, 0.0], [0.29, 0.33, 0.27], [0, 0, 0.06], { wobble: 0.1 }),
      ell([-0.38, 5.95, 0.02], [0.3, 0.28, 0.28], [0, 0, -0.04], { wobble: 0.1 }),
      ell([-0.42, 6.12, -0.06], [0.16, 0.14, 0.14], [0, 0, 0], { wobble: 0.1 }),
      // left lung (with a notch for the heart)
      ell([0.4, 6.34, 0.0], [0.26, 0.33, 0.26], [0, 0, -0.06], { wobble: 0.1 }),
      ell([0.42, 5.95, 0.02], [0.28, 0.27, 0.27], [0, 0, 0.04], { wobble: 0.1 }),
      ell([0.45, 6.12, -0.06], [0.15, 0.13, 0.13], [0, 0, 0], { wobble: 0.1 }),
    ],
    { focusDist: 4.0 },
  ),
  organ('trachea', 'respiratory', 'Trachea', 'thorax', '#a9beb8', [0, 6.85, 0.03], tracheaParts(), {
    focusDist: 2.6,
  }),
  organ('bronchi', 'respiratory', 'Bronchi', 'thorax', '#9db3ad', [0, 6.55, 0.0], bronchiParts(), {
    focusDist: 2.8,
  }),
  organ('bronchioles', 'respiratory', 'Bronchioles', 'thorax', '#b6b0a3', [0, 6.3, 0.0], bronchioleParts(), {
    focusDist: 3.8,
  }),
  organ(
    'alveoli',
    'respiratory',
    'Alveoli',
    'thorax',
    '#dfb3aa',
    [0, 6.3, 0.0],
    [
      ...cluster([-0.38, 6.3, 0.02], [0.27, 0.36, 0.25], 26, 0.026),
      ...cluster([0.42, 6.3, 0.02], [0.25, 0.34, 0.24], 22, 0.024),
    ],
    { focusDist: 2.6 },
  ),
  organ(
    'larynx',
    'respiratory',
    'Larynx',
    'head-neck',
    '#b4c6c0',
    [0, 7.02, 0.09],
    [
      ell([0, 7.02, 0.09], [0.075, 0.085, 0.07], [0, 0, 0], { wobble: 0.04 }),
      { kind: 'torus', at: [0, 7.05, 0.09], size: [0.075, 0.012, 0.012], rot: [Math.PI / 2, 0, 0], detail: 10 },
    ],
    { focusDist: 1.8 },
  ),
  organ(
    'pleura',
    'respiratory',
    'Pleura',
    'thorax',
    '#cfe0da',
    [0, 6.15, 0.0],
    [
      ell([-0.38, 6.13, 0.0], [0.34, 0.42, 0.32], [0, 0, 0.05], { detail: 16 }),
      ell([0.41, 6.13, 0.0], [0.32, 0.41, 0.31], [0, 0, -0.05], { detail: 16 }),
    ],
    { focusDist: 4.2, translucent: 0.14, glow: 0 },
  ),

  /* ============================= digestive ============================= */
  organ('mouth', 'digestive', 'Mouth', 'head-neck', '#b96a62', [0, 7.2, 0.24], [
    ell([0, 7.2, 0.24], [0.13, 0.07, 0.13], [0, 0, 0], { wobble: 0.04 }),
  ], { focusDist: 1.8 }),
  organ(
    'salivary-glands',
    'digestive',
    'Salivary Glands',
    'head-neck',
    '#d9a07e',
    [0, 7.14, 0.1],
    both((s) => [
      ell([0.27 * s, 7.16, 0.02], [0.07, 0.09, 0.06], [0, 0, 0], { wobble: 0.05 }),
      ell([0.16 * s, 7.08, 0.16], [0.05, 0.055, 0.05], [0, 0, 0], { wobble: 0.05 }),
      ell([0.07 * s, 7.08, 0.26], [0.03, 0.025, 0.04], undefined, { wobble: 0.05 }),
    ]),
    { focusDist: 2.0 },
  ),
  organ(
    'esophagus',
    'digestive',
    'Esophagus',
    'thorax',
    '#b98270',
    [0, 6.4, 0.03],
    [
      tube(
        [
          [0, 7.0, 0.04],
          [0, 6.6, 0.0],
          [0, 6.2, 0.03],
          [0.03, 5.94, 0.08],
          [0.12, 5.78, 0.1],
        ],
        0.05,
        0.045,
      ),
    ],
    { focusDist: 3.0 },
  ),
  organ(
    'stomach',
    'digestive',
    'Stomach',
    'abdomen',
    '#b07a6a',
    [0.28, 5.24, 0.13],
    [
      ell([0.28, 5.26, 0.12], [0.2, 0.18, 0.14], [0, 0, -0.45], { wobble: 0.08 }),
      ell([0.17, 5.12, 0.16], [0.1, 0.1, 0.09], [0, 0, -0.3], { wobble: 0.08 }),
      tube(
        [
          [0.36, 5.38, 0.1],
          [0.4, 5.3, 0.08],
          [0.36, 5.16, 0.1],
        ],
        0.06,
        0.05,
      ),
    ],
    { focusDist: 2.6 },
  ),
  organ(
    'liver',
    'digestive',
    'Liver',
    'abdomen',
    '#8d5140',
    [-0.16, 5.44, 0.12],
    [
      ell([-0.28, 5.44, 0.12], [0.36, 0.23, 0.26], [0, 0, 0.12], { wobble: 0.07 }),
      ell([0.04, 5.42, 0.14], [0.2, 0.16, 0.2], [0, 0, -0.1], { wobble: 0.07 }),
      ell([-0.34, 5.34, 0.05], [0.2, 0.16, 0.18], [0, 0, 0.2], { wobble: 0.07 }),
    ],
    { focusDist: 3.6 },
  ),
  organ(
    'gallbladder',
    'digestive',
    'Gallbladder',
    'abdomen',
    '#7f9a6d',
    [-0.24, 5.24, 0.3],
    [ell([-0.24, 5.24, 0.3], [0.045, 0.1, 0.045], [0.2, 0, 0.2], { wobble: 0.04 })],
    { focusDist: 1.8 },
  ),
  organ(
    'pancreas',
    'digestive',
    'Pancreas',
    'abdomen',
    '#c9a27a',
    [0, 5.08, 0.02],
    [
      tube(
        [
          [-0.36, 5.06, -0.04],
          [-0.15, 5.06, 0.02],
          [0.1, 5.08, 0.05],
          [0.3, 5.02, 0.0],
        ],
        0.062,
        0.035,
        { wobble: 0.05 },
      ),
    ],
    { focusDist: 2.8 },
  ),
  organ('small-intestine', 'digestive', 'Small Intestine', 'abdomen', '#c08a6a', [0, 4.5, 0.1], smallIntestineParts(), {
    focusDist: 3.6,
  }),
  organ('large-intestine', 'digestive', 'Large Intestine', 'abdomen', '#b98a6e', [0, 4.7, 0.1], largeIntestineParts(), {
    focusDist: 3.8,
  }),
  organ('rectum', 'digestive', 'Rectum', 'pelvis', '#a97d63', [0, 3.72, -0.14], [
    tube(
      [
        [0.06, 4.0, 0.02],
        [0.02, 3.86, -0.08],
        [0, 3.72, -0.14],
        [0, 3.58, -0.16],
      ],
      0.062,
      0.04,
    ),
  ], { focusDist: 2.2 }),

  /* ============================= endocrine ============================= */
  organ(
    'pituitary-gland',
    'endocrine',
    'Pituitary Gland',
    'head-neck',
    '#c9a0c4',
    [0, 7.44, -0.02],
    [ell([0, 7.44, -0.02], [0.034, 0.03, 0.034], [0, 0, 0], { wobble: 0.04 })],
    { focusDist: 1.5 },
  ),
  organ(
    'thyroid',
    'endocrine',
    'Thyroid',
    'head-neck',
    '#b07a9c',
    [0, 6.94, 0.08],
    [
      ...both((s) => [ell([0.075 * s, 6.94, 0.08], [0.045, 0.07, 0.04], [0, 0, 0.15 * s], { wobble: 0.05 })]),
      ell([0, 6.92, 0.075], [0.045, 0.022, 0.025], [0, 0, 0], { wobble: 0.04 }),
    ],
    { focusDist: 1.7 },
  ),
  organ(
    'parathyroid',
    'endocrine',
    'Parathyroid Glands',
    'head-neck',
    '#d9b36a',
    [0, 6.9, 0.09],
    [
      ell([0.1, 6.92, 0.09], [0.017, 0.017, 0.017], undefined, { detail: 8 }),
      ell([-0.1, 6.92, 0.09], [0.017, 0.017, 0.017], undefined, { detail: 8 }),
      ell([0.12, 6.86, 0.06], [0.014, 0.014, 0.014], undefined, { detail: 8 }),
      ell([-0.12, 6.86, 0.06], [0.014, 0.014, 0.014], undefined, { detail: 8 }),
    ],
    { focusDist: 1.6 },
  ),
  organ(
    'adrenal-glands',
    'endocrine',
    'Adrenal Glands',
    'abdomen',
    '#bf8a62',
    [0, 5.08, -0.2],
    both((s) => [ell([0.44 * s, 5.07, -0.2], [0.08, 0.032, 0.06], [0, 0, 0.1 * s], { wobble: 0.06 })]),
    { focusDist: 2.6 },
  ),
  organ(
    'pineal-gland',
    'endocrine',
    'Pineal Gland',
    'head-neck',
    '#d6b3cd',
    [0, 7.5, -0.16],
    [ell([0, 7.5, -0.16], [0.028, 0.024, 0.028], [0, 0, 0], { wobble: 0.04 })],
    { focusDist: 1.5 },
  ),
  organ(
    'pancreatic-islets',
    'endocrine',
    'Pancreatic Islets',
    'abdomen',
    '#e0bfa0',
    [0, 5.06, 0.03],
    (() => {
      const parts: Part[] = [];
      for (let i = 0; i < 12; i += 1) {
        const t = i / 11;
        parts.push(
          ell(
            [-0.32 + t * 0.6, 5.06 + Math.sin(i * 1.7) * 0.02, 0.0 + Math.sin(i * 2.3) * 0.03],
            [0.014, 0.014, 0.014],
            undefined,
            { detail: 6 },
          ),
        );
      }
      return parts;
    })(),
    { focusDist: 2.2 },
  ),

  /* =============================== immune =============================== */
  organ(
    'thymus',
    'immune',
    'Thymus',
    'thorax',
    '#93a86a',
    [0, 6.55, 0.24],
    both((s) => [ell([0.06 * s, 6.56, 0.24], [0.09, 0.12, 0.055], [0, 0, 0.1 * s], { wobble: 0.1 })]),
    { focusDist: 2.2 },
  ),
  organ(
    'spleen',
    'immune',
    'Spleen',
    'abdomen',
    '#8b6a72',
    [0.5, 5.36, -0.12],
    [ell([0.5, 5.36, -0.12], [0.12, 0.08, 0.09], [0.2, 0, -0.3], { wobble: 0.07 })],
    { focusDist: 2.6 },
  ),
  organ('lymph-nodes', 'immune', 'Lymph Nodes', 'whole-body', '#8fa862', [0, 5.4, 0.02], lymphNodeParts(), {
    focusDist: 8,
  }),
  organ(
    'tonsils',
    'immune',
    'Tonsils',
    'head-neck',
    '#a9bd82',
    [0, 7.14, 0.16],
    both((s) => [ell([0.07 * s, 7.14, 0.16], [0.03, 0.04, 0.03], [0, 0, 0], { wobble: 0.06 })]),
    { focusDist: 1.6 },
  ),
  organ(
    'bone-marrow',
    'immune',
    'Bone Marrow',
    'whole-body',
    '#c9a45f',
    [0, 4.6, 0],
    both((s) => [
      tube([[0.37 * s, 4.0, 0.01], [0.39 * s, 3.3, 0.02], [0.4 * s, 2.6, 0.02]], 0.028, 0.02, { detail: 8 }),
      tube([[0.93 * s, 6.5, 0.0], [1.05 * s, 5.9, 0.01], [1.12 * s, 5.5, 0.01]], 0.022, 0.015, { detail: 8 }),
      tube([[0.4 * s, 2.2, 0.02], [0.41 * s, 1.6, 0.0], [0.42 * s, 1.0, 0.0]], 0.02, 0.014, { detail: 8 }),
    ]),
    { focusDist: 7 },
  ),
  organ(
    'lymphatic-vessels',
    'immune',
    'Lymphatic Vessels',
    'whole-body',
    '#8fa862',
    [0, 5.0, 0],
    lymphaticVesselParts(),
    { focusDist: 11 },
  ),

  /* ============================== urinary ============================== */
  organ(
    'kidneys',
    'urinary',
    'Kidneys',
    'abdomen',
    '#9c6a6d',
    [0, 4.95, -0.2],
    both((s) => [
      ell([0.44 * s, 4.96, -0.2], [0.115, 0.2, 0.095], [0, 0, 0.05 * s], { wobble: 0.06 }),
      ell([0.47 * s, 5.08, -0.22], [0.085, 0.08, 0.075], [0, 0, 0], { wobble: 0.06 }),
    ]),
    { focusDist: 3.0 },
  ),
  organ(
    'ureters',
    'urinary',
    'Ureters',
    'abdomen',
    '#b98f86',
    [0, 4.4, -0.06],
    both((s) => [
      tube(
        [
          [0.4 * s, 4.84, -0.16],
          [0.32 * s, 4.55, -0.1],
          [0.22 * s, 4.25, -0.02],
          [0.12 * s, 4.0, 0.06],
          [0.06 * s, 3.86, 0.1],
        ],
        0.02,
        0.014,
      ),
    ]),
    { focusDist: 3.0 },
  ),
  organ(
    'bladder',
    'urinary',
    'Bladder',
    'pelvis',
    '#c9a86b',
    [0, 3.78, 0.13],
    [ell([0, 3.78, 0.13], [0.14, 0.13, 0.12], [0, 0, 0], { wobble: 0.05 })],
    { focusDist: 2.0 },
  ),
  organ(
    'urethra',
    'urinary',
    'Urethra',
    'pelvis',
    '#c9a86b',
    [0, 3.62, 0.2],
    [
      tube(
        [
          [0, 3.67, 0.16],
          [0, 3.56, 0.22],
          [0, 3.5, 0.27],
        ],
        0.03,
        0.018,
      ),
    ],
    { focusDist: 1.7 },
  ),
  organ('nephrons', 'urinary', 'Nephrons', 'abdomen', '#d3a48a', [0, 4.95, -0.2], nephronParts(), {
    focusDist: 2.4,
  }),

  /* ============================ reproductive ============================ */
  organ(
    'ovaries',
    'reproductive',
    'Ovaries',
    'pelvis',
    '#c08a90',
    [0, 3.76, 0.02],
    both((s) => [ell([0.2 * s, 3.76, 0.02], [0.04, 0.055, 0.04], [0, 0, 0], { wobble: 0.06 })]),
    { focusDist: 2.2 },
  ),
  organ(
    'fallopian-tubes',
    'reproductive',
    'Fallopian Tubes',
    'pelvis',
    '#c09096',
    [0, 3.8, 0.04],
    both((s) => [
      tube(
        [
          [0.2 * s, 3.76, 0.02],
          [0.24 * s, 3.84, 0.06],
          [0.17 * s, 3.88, 0.09],
          [0.09 * s, 3.84, 0.08],
        ],
        0.018,
        0.014,
        { detail: 6 },
      ),
    ]),
    { focusDist: 2.2 },
  ),
  organ(
    'uterus',
    'reproductive',
    'Uterus',
    'pelvis',
    '#b97a86',
    [0, 3.8, 0.05],
    [
      ell([0, 3.82, 0.05], [0.1, 0.13, 0.07], [0, 0, 0], { wobble: 0.05 }),
      ell([0, 3.7, 0.02], [0.05, 0.05, 0.045], [0, 0, 0], { wobble: 0.05 }),
    ],
    { focusDist: 2.0 },
  ),
  organ(
    'vagina',
    'reproductive',
    'Vagina',
    'pelvis',
    '#b97a86',
    [0, 3.56, -0.04],
    [
      tube(
        [
          [0, 3.66, 0.0],
          [0, 3.56, -0.05],
          [0, 3.46, -0.1],
        ],
        0.035,
        0.025,
      ),
    ],
    { focusDist: 1.9 },
  ),
  organ(
    'testes',
    'reproductive',
    'Testes',
    'pelvis',
    '#b58f96',
    [0, 3.5, 0.16],
    [
      ell([0.055, 3.5, 0.17], [0.05, 0.065, 0.05], [0, 0, 0], { wobble: 0.06 }),
      ell([-0.055, 3.5, 0.17], [0.05, 0.065, 0.05], [0, 0, 0], { wobble: 0.06 }),
      ell([0, 3.43, 0.15], [0.06, 0.04, 0.06], [0, 0, 0], { wobble: 0.06 }),
    ],
    { focusDist: 2.0 },
  ),
  organ(
    'prostate',
    'reproductive',
    'Prostate',
    'pelvis',
    '#b58a96',
    [0, 3.62, 0.06],
    [ell([0, 3.62, 0.06], [0.07, 0.055, 0.06], [0, 0, 0], { wobble: 0.05 })],
    { focusDist: 1.8 },
  ),
  organ(
    'penis',
    'reproductive',
    'Penis',
    'pelvis',
    '#c08a7a',
    [0, 3.48, 0.3],
    [
      tube(
        [
          [0, 3.52, 0.18],
          [0, 3.5, 0.28],
          [0, 3.48, 0.37],
          [0, 3.47, 0.42],
        ],
        0.038,
        0.03,
      ),
      ell([0, 3.47, 0.43], [0.035, 0.035, 0.03], [0, 0, 0], { wobble: 0.04 }),
    ],
    { focusDist: 1.9 },
  ),
  organ(
    'mammary-glands',
    'reproductive',
    'Mammary Glands',
    'thorax',
    '#c9928e',
    [0, 6.18, 0.4],
    both((s) => [ell([0.32 * s, 6.18, 0.38], [0.18, 0.15, 0.07], [0.1, 0.15 * s, 0], { wobble: 0.05 })]),
    { focusDist: 2.8 },
  ),

  /* =========================== integumentary =========================== */
  organ('skin', 'integumentary', 'Skin', 'whole-body', '#e7cdb4', [0, 4.2, 0], [], {
    layer: 'body',
    focusDist: 13,
  }),
  organ(
    'hair',
    'integumentary',
    'Hair',
    'head-neck',
    '#44362a',
    [0, 7.7, -0.02],
    [
      {
        kind: 'shell',
        at: [0, 7.58, -0.01],
        size: [0.442, 0.5, 0.47],
        thetaStart: 0,
        thetaLength: 1.15,
        detail: 24,
      },
      {
        kind: 'shell',
        at: [0, 7.58, -0.01],
        size: [0.442, 0.5, 0.47],
        thetaStart: 0,
        thetaLength: 2.05,
        phiStart: Math.PI,
        phiLength: Math.PI,
        detail: 24,
      },
      ell([0, 7.83, 0.24], [0.33, 0.07, 0.15], [0.35, 0, 0], { wobble: 0.03 }),
    ],
    { focusDist: 2.6, roughness: 0.85 },
  ),
  organ(
    'nails',
    'integumentary',
    'Nails',
    'whole-body',
    '#e8d6c2',
    [0, 3.7, 0.02],
    [
      ...HAND_FINGER_TIPS.map((p) => ell(p, [0.019, 0.028, 0.012], [0, 0, 0], { detail: 8 })),
      ...FOOT_TOE_TIPS.map((p) => ell([p[0], p[1] + 0.012, p[2] + 0.02], [0.02, 0.013, 0.024], undefined, { detail: 8 })),
    ],
    { focusDist: 2.4 },
  ),
  organ('sweat-glands', 'integumentary', 'Sweat Glands', 'whole-body', '#d9a98a', [0, 4.8, 0.1], sweatGlandParts(), {
    focusDist: 10,
  }),
  organ('sebaceous-glands', 'integumentary', 'Sebaceous Glands', 'whole-body', '#e0b58f', [0, 6.2, 0.2], sebaceousParts(), {
    focusDist: 8,
  }),
  organ('subcutaneous-fat', 'integumentary', 'Subcutaneous Fat', 'whole-body', '#d9b98a', [0, 4.2, 0], [], {
    layer: 'shell',
    focusDist: 13,
    translucent: 0.1,
  }),

  /* =============================== sensory =============================== */
  organ(
    'eyes',
    'sensory',
    'Eyes',
    'head-neck',
    '#e6dfd2',
    [0, 7.5, 0.36],
    both((s) => [
      ell([0.155 * s, 7.5, 0.35], [0.075, 0.075, 0.075], [0, 0, 0], { detail: 16 }),
      ell([0.155 * s, 7.5, 0.395], [0.032, 0.032, 0.02], [0, 0, 0], { detail: 12 }),
    ]),
    { focusDist: 2.0, translucent: 0.55 },
  ),
  organ(
    'ears',
    'sensory',
    'Ears',
    'head-neck',
    '#c99a76',
    [0, 7.46, 0.02],
    both((s) => [
      ell([0.425 * s, 7.46, 0.01], [0.035, 0.115, 0.075], [0, 0.35 * s, 0], { wobble: 0.06 }),
      ell([0.43 * s, 7.36, 0.0], [0.03, 0.045, 0.05], [0, 0.3 * s, 0], { wobble: 0.06 }),
    ]),
    { focusDist: 1.9 },
  ),
  organ(
    'nose',
    'sensory',
    'Nose',
    'head-neck',
    '#c99a76',
    [0, 7.42, 0.42],
    [
      ell([0, 7.43, 0.4], [0.062, 0.115, 0.085], [-0.2, 0, 0], { wobble: 0.04 }),
      ell([0, 7.39, 0.455], [0.068, 0.045, 0.055], [0, 0, 0], { wobble: 0.04 }),
      ...both((s) => [ell([0.055 * s, 7.37, 0.44], [0.022, 0.018, 0.022], undefined, { detail: 8 })]),
    ],
    { focusDist: 1.7 },
  ),
  organ(
    'tongue',
    'sensory',
    'Tongue',
    'head-neck',
    '#c97a6e',
    [0, 7.18, 0.27],
    [ell([0, 7.18, 0.27], [0.095, 0.028, 0.115], [0.12, 0, 0], { wobble: 0.06 })],
    { focusDist: 1.7 },
  ),
  organ(
    'retina',
    'sensory',
    'Retina',
    'head-neck',
    '#d98a6a',
    [0, 7.5, 0.3],
    both((s) => [
      ell([0.155 * s, 7.5, 0.295], [0.058, 0.058, 0.012], [0, 0, 0], { detail: 14 }),
      ell([0.155 * s, 7.5, 0.36], [0.02, 0.02, 0.012], [0, 0, 0], { detail: 10 }),
    ]),
    { focusDist: 1.7 },
  ),
  organ(
    'cochlea',
    'sensory',
    'Cochlea',
    'head-neck',
    '#d9b07a',
    [0, 7.35, -0.12],
    both((s) => [
      {
        kind: 'torus',
        at: [0.35 * s, 7.35, -0.12],
        size: [0.035, 0.008, 0.008],
        rot: [0.4, 0, 0],
        detail: 10,
      },
      {
        kind: 'torus',
        at: [0.35 * s, 7.35, -0.12],
        size: [0.024, 0.007, 0.007],
        rot: [0.8, 0, 0.3],
        detail: 10,
      },
      ell([0.35 * s, 7.35, -0.09], [0.014, 0.014, 0.014], undefined, { detail: 8 }),
    ]),
    { focusDist: 1.8 },
  ),
  organ(
    'vestibular-system',
    'sensory',
    'Vestibular System',
    'head-neck',
    '#c9a36a',
    [0, 7.4, -0.12],
    both((s) => [
      {
        kind: 'torus',
        at: [0.36 * s, 7.4, -0.12],
        size: [0.04, 0.006, 0.006],
        rot: [Math.PI / 2, 0, 0],
        detail: 10,
      },
      {
        kind: 'torus',
        at: [0.36 * s, 7.4, -0.12],
        size: [0.04, 0.006, 0.006],
        rot: [0, 0, Math.PI / 2],
        detail: 10,
      },
      {
        kind: 'torus',
        at: [0.36 * s, 7.4, -0.12],
        size: [0.04, 0.006, 0.006],
        rot: [0, Math.PI / 2, 0],
        detail: 10,
      },
      ell([0.36 * s, 7.38, -0.1], [0.016, 0.016, 0.016], undefined, { detail: 8 }),
    ]),
    { focusDist: 1.8 },
  ),
];

export const ORGAN_BY_ID: Record<string, OrganPlacement> = Object.fromEntries(
  ORGAN_PLACEMENTS.map((p) => [p.id, p]),
);

export function getPlacement(id: string | null | undefined): OrganPlacement | undefined {
  if (!id) return undefined;
  return ORGAN_BY_ID[id];
}

/** Organ ids that are rendered as part of the bone rig rather than as organ meshes. */
export const SKELETAL_ORGAN_IDS = new Set(
  ORGAN_PLACEMENTS.filter((p) => p.systemId === 'skeletal').map((p) => p.id),
);

/** Everything the organ layer draws (excludes bones, skin and the fat shell). */
export const ORGAN_MESHES = ORGAN_PLACEMENTS.filter(
  (p) => (p.layer ?? 'organs') === 'organs',
);

export const SKELETAL_PLACEMENTS = ORGAN_PLACEMENTS.filter((p) => p.systemId === 'skeletal');

/** Canonical name used when no authored content exists for an organ. */
export const PLACEMENT_NAMES: Record<string, string> = Object.fromEntries(
  ORGAN_PLACEMENTS.map((p) => [p.id, p.name]),
);

/** Accent colour used by the viewer for each system (kept consistent with content spec). */
export const SYSTEM_ACCENTS = Object.fromEntries(
  Object.values(SYSTEM_META).map((s) => [s.id, s.color]),
) as Record<string, string>;
