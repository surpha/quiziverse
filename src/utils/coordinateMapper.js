/**
 * Spherical Knowledge Globe Layout
 *
 * Maps questions onto a sphere where:
 * - ANGLE (θ, φ) = determined by topic weights (domain clusters)
 * - RADIUS = determined by difficulty (easy=close to center, hard=outer orbits)
 *
 * This creates an intuitive navigation:
 * - Zoom in → easy questions near the core
 * - Zoom out → harder questions in outer shell
 * - Rotate → different topic galaxies
 *
 * Topic projection reduces 12D weights → 2D angular position (θ, φ)
 * Then converts to Cartesian [x, y, z] with radius from difficulty.
 */

const DOMAIN_KEYS = [
  'technology', 'history', 'geography', 'science', 'literature',
  'arts', 'music', 'society', 'religion', 'popCulture', 'sports', 'lifestyle',
];

// Each domain maps to a direction on the sphere (θ, φ in radians)
// Distributed evenly with semantic grouping
const DOMAIN_ANGLES = {
  technology:  { theta: 0.0,   phi: 0.4  },  // front-top
  science:     { theta: 0.5,   phi: 0.3  },  // near tech
  society:     { theta: 1.0,   phi: 0.6  },  // upper mid
  history:     { theta: 1.5,   phi: 0.5  },  // upper back
  geography:   { theta: 2.0,   phi: 0.2  },  // back top
  religion:    { theta: 2.5,   phi: 0.7  },  // back lower
  literature:  { theta: 3.0,   phi: 0.4  },  // left
  arts:        { theta: 3.5,   phi: 0.6  },  // left lower
  music:       { theta: 4.0,   phi: 0.5  },  // lower left
  lifestyle:   { theta: 4.5,   phi: 0.8  },  // bottom
  sports:      { theta: 5.2,   phi: 0.75 },  // bottom right
  popCulture:  { theta: 5.7,   phi: 0.55 },  // right
};

/**
 * Compute weighted average angle from domain weights.
 * Uses circular mean to avoid wrapping issues around 2π.
 */
function weightedAngles(weights) {
  let sinTheta = 0, cosTheta = 0;
  let sinPhi = 0, cosPhi = 0;
  let totalWeight = 0;

  for (const domain of DOMAIN_KEYS) {
    const w = (weights[domain] || 0);
    if (w <= 0) continue;
    const wSq = w * w; // Square to emphasize dominant domains
    totalWeight += wSq;

    const a = DOMAIN_ANGLES[domain];
    sinTheta += Math.sin(a.theta) * wSq;
    cosTheta += Math.cos(a.theta) * wSq;
    sinPhi += Math.sin(a.phi * Math.PI) * wSq;
    cosPhi += Math.cos(a.phi * Math.PI) * wSq;
  }

  if (totalWeight === 0) return { theta: 0, phi: Math.PI / 2 };

  const theta = Math.atan2(sinTheta / totalWeight, cosTheta / totalWeight);
  const phi = Math.atan2(sinPhi / totalWeight, cosPhi / totalWeight);

  return { theta, phi };
}

/**
 * Convert spherical (r, θ, φ) to Cartesian [x, y, z].
 */
function sphericalToCartesian(r, theta, phi) {
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

/**
 * Map difficulty (1-5) to radius.
 * Easy (1) → close to center, Hard (5) → outer orbit.
 */
function difficultyToRadius(difficulty, innerRadius = 2.0, outerRadius = 6.0) {
  const d = Math.max(1, Math.min(5, difficulty || 3));
  return innerRadius + ((d - 1) / 4) * (outerRadius - innerRadius);
}

/**
 * Force-directed relaxation on a sphere surface:
 * Pushes overlapping nodes apart while keeping them at their radius.
 */
function relax(positions, iterations = 40, minDist = 0.6) {
  const pts = positions.map(p => [...p]);
  const n = pts.length;

  for (let iter = 0; iter < iterations; iter++) {
    const strength = 0.04 * (1 - iter / iterations);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        const dz = pts[i][2] - pts[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

        if (dist < minDist) {
          const force = strength * (minDist - dist) / dist;
          pts[i][0] += dx * force;
          pts[i][1] += dy * force;
          pts[i][2] += dz * force;
          pts[j][0] -= dx * force;
          pts[j][1] -= dy * force;
          pts[j][2] -= dz * force;
        }
      }
    }

    // Re-project to original radius (keep spherical constraint)
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(pts[i][0] ** 2 + pts[i][1] ** 2 + pts[i][2] ** 2) || 1;
      const targetR = positions[i].targetR;
      const scale = targetR / r;
      pts[i][0] *= scale;
      pts[i][1] *= scale;
      pts[i][2] *= scale;
    }
  }

  return pts;
}

/**
 * Pre-compute positions for all questions.
 * Auto-adjusts as questions are added.
 */
export function computePositions(questions) {
  // Step 1: Map each question to spherical coordinates
  const spherical = questions.map(q => {
    const { theta, phi } = weightedAngles(q.weights);
    const r = difficultyToRadius(q.difficulty);
    const pos = sphericalToCartesian(r, theta, phi);
    pos.targetR = r; // store for relaxation constraint
    return pos;
  });

  // Step 2: Relax to prevent overlap (preserving radii)
  const relaxed = relax(spherical);

  return questions.map((q, i) => ({
    ...q,
    position: [relaxed[i][0], relaxed[i][1], relaxed[i][2]],
  }));
}
