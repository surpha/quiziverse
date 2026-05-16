/**
 * Domain taxonomy configuration — colors, labels, and display order.
 * Each domain gets a distinct color for the constellation visualization.
 */

const DOMAINS = {
  technology:  { label: 'Technology & Innovation', color: '#06b6d4', emissive: '#0891b2' },
  history:     { label: 'History & Civilization',  color: '#f59e0b', emissive: '#d97706' },
  geography:   { label: 'Geography & Places',     color: '#10b981', emissive: '#059669' },
  science:     { label: 'Science & Nature',       color: '#3b82f6', emissive: '#2563eb' },
  literature:  { label: 'Literature & Language',   color: '#8b5cf6', emissive: '#7c3aed' },
  arts:        { label: 'Arts & Architecture',     color: '#ec4899', emissive: '#db2777' },
  music:       { label: 'Music & Performing Arts', color: '#f43f5e', emissive: '#e11d48' },
  society:     { label: 'Society & Politics',      color: '#64748b', emissive: '#475569' },
  religion:    { label: 'Religion & Mythology',    color: '#a855f7', emissive: '#9333ea' },
  popCulture:  { label: 'Pop Culture & Entertainment', color: '#facc15', emissive: '#eab308' },
  sports:      { label: 'Sports & Games',          color: '#22c55e', emissive: '#16a34a' },
  lifestyle:   { label: 'Lifestyle & Practical',   color: '#fb923c', emissive: '#ea580c' },
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
