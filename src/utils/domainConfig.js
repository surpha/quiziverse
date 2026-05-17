/**
 * Domain taxonomy configuration — colors, labels, and display order.
 * Each domain gets a distinct color for the constellation visualization.
 */

const DOMAINS = {
  technology:  { label: 'Technology & Innovation', color: '#aaffff', emissive: '#0044ff' },
  history:     { label: 'History & Civilization',  color: '#cc8800', emissive: '#ffcc44' },
  geography:   { label: 'Geography & Places',     color: '#22cc44', emissive: '#88ff44' },
  science:     { label: 'Science & Nature',       color: '#00e5ff', emissive: '#0055ff' },
  literature:  { label: 'Literature & Language',   color: '#cc44aa', emissive: '#ffaadd' },
  arts:        { label: 'Arts & Architecture',     color: '#ff4db8', emissive: '#ff9ed8' },
  music:       { label: 'Music & Performing Arts', color: '#ff3355', emissive: '#ff88aa' },
  society:     { label: 'Society & Politics',      color: '#ff7744', emissive: '#ffcc99' },
  religion:    { label: 'Religion & Mythology',    color: '#9944ff', emissive: '#ddaaff' },
  popCulture:  { label: 'Pop Culture & Entertainment', color: '#ffdd33', emissive: '#ff9955' },
  sports:      { label: 'Sports & Games',          color: '#33dd66', emissive: '#99ff88' },
  lifestyle:   { label: 'Lifestyle & Practical',   color: '#ff9955', emissive: '#ffd08a' },
  business:    { label: 'Business & Economics',    color: '#ddcc00', emissive: '#44cc88' },
};

export const DOMAIN_KEYS = Object.keys(DOMAINS);

/**
 * Parse a hex color to [r, g, b] (0-255).
 */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Convert [r, g, b] (0-255) to hex.
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

/**
 * Blend all domain colors proportionally by weight.
 * Returns { color, emissive } as hex strings.
 */
export function getBlendedColor(weights) {
  let totalWeight = 0;
  let r = 0, g = 0, b = 0;
  let er = 0, eg = 0, eb = 0;

  for (const [domain, weight] of Object.entries(weights)) {
    if (weight <= 0 || !DOMAINS[domain]) continue;
    const w = weight * weight; // Square weights to emphasize dominant domains
    totalWeight += w;
    const [cr, cg, cb] = hexToRgb(DOMAINS[domain].color);
    const [ecr, ecg, ecb] = hexToRgb(DOMAINS[domain].emissive);
    r += cr * w; g += cg * w; b += cb * w;
    er += ecr * w; eg += ecg * w; eb += ecb * w;
  }

  if (totalWeight === 0) return { color: '#a78bfa', emissive: '#7c3aed' };

  return {
    color: rgbToHex(r / totalWeight, g / totalWeight, b / totalWeight),
    emissive: rgbToHex(er / totalWeight, eg / totalWeight, eb / totalWeight),
  };
}

/**
 * Get the dominant domain for a question (highest weight).
 */
export function getDominantDomain(weights) {
  let max = 0;
  let dominant = 'technology';
  for (const [key, val] of Object.entries(weights)) {
    if (val > max) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

/**
 * Get color and emissive for a question based on its dominant domain.
 */
export function getDomainColor(weights) {
  const dominant = getDominantDomain(weights);
  return DOMAINS[dominant] || DOMAINS.technology;
}

export default DOMAINS;
