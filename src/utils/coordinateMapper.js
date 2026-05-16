/**
 * Maps 12-dimensional topic weights into 3D Cartesian coordinates.
 *
 * Two-pass approach for smooth, logical placement:
 * 1. Project 12D weights → 3D using a fixed semantic axis matrix
 * 2. Apply force-directed relaxation so nodes repel each other
 *    (prevents overlap) while preserving relative topology
 *
 * The axes encode meaning:
 *   X: STEM ←→ Humanities
 *   Y: Abstract/Intellectual ←→ Physical/Practical
 *   Z: Historical/Classical ←→ Modern/Pop
 */

const PROJECTION = {
  x: {
    technology: 1.0, science: 0.8, history: -0.3, geography: -0.2,
    literature: -0.7, arts: -0.9, music: -0.5, society: 0.2,
    religion: -0.4, popCulture: 0.5, sports: 0.3, lifestyle: 0.1,
  },
  y: {
    technology: 0.3, science: 0.6, history: 0.4, geography: -0.5,
    literature: 0.5, arts: 0.3, music: 0.7, society: 0.9,
    religion: 1.0, popCulture: -0.6, sports: -1.0, lifestyle: -0.8,
  },
  z: {
    technology: -0.5, science: -0.2, history: 1.0, geography: 0.9,
    literature: 0.5, arts: 0.6, music: 0.3, society: 0.2,
    religion: 0.7, popCulture: -0.9, sports: -0.7, lifestyle: -0.4,
  },
};

const DOMAIN_KEYS = [
  'technology', 'history', 'geography', 'science', 'literature',
  'arts', 'music', 'society', 'religion', 'popCulture', 'sports', 'lifestyle',
];

function project(weights, axis) {
  return DOMAIN_KEYS.reduce((sum, d) => sum + (weights[d] || 0) * (axis[d] || 0), 0);
}

function weightsToRawPosition(weights) {
  return [
    project(weights, PROJECTION.x),
    project(weights, PROJECTION.y),
    project(weights, PROJECTION.z),
  ];
}

/**
 * Cosine similarity between two weight vectors (0 to 1).
 */
function similarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const d of DOMAIN_KEYS) {
    const va = a[d] || 0, vb = b[d] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Force-directed relaxation: repel overlapping nodes while preserving
 * the topology from the projection.
 */
function relax(positions, iterations = 50, minDist = 0.8) {
  const pts = positions.map(p => [...p]);
  const n = pts.length;

  for (let iter = 0; iter < iterations; iter++) {
    const strength = 0.05 * (1 - iter / iterations); // decay force over time

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
  }
  return pts;
}

/**
 * Pre-compute positions for all questions.
 * `spread` controls the spatial distribution radius.
 */
export function computePositions(questions, spread = 4.0) {
  // Step 1: Project to raw 3D
  const scale = spread / 30;
  const rawPositions = questions.map(q =>
    weightsToRawPosition(q.weights).map(v => v * scale)
  );

  // Step 2: Relax to prevent overlap
  const relaxed = relax(rawPositions);

  return questions.map((q, i) => ({
    ...q,
    position: relaxed[i],
  }));
}

export { similarity };
