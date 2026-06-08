# 3D Rendering System

## Overview

Quiziverse renders questions as stars on a **Spherical Knowledge Globe** using Three.js via React Three Fiber (`@react-three/fiber`) and Drei helpers (`@react-three/drei`).

## Architecture

```
Canvas (R3F)
└── Scene.jsx
    ├── ambientLight + pointLight
    ├── OrbitControls (rotate/zoom/pan)
    ├── Particle field (background stars)
    ├── StarNode[] (one per question)
    └── Camera animation logic (zoom/spin)
```

## Coordinate Mapping Algorithm

File: `src/utils/coordinateMapper.js`

### Step 1: Domain → Angle Mapping

Each of the 13 domains has a fixed angular position on the sphere:

```javascript
const DOMAIN_ANGLES = {
  technology:  { theta: 0.0,   phi: 0.4  },
  science:     { theta: 0.5,   phi: 0.3  },
  society:     { theta: 1.0,   phi: 0.6  },
  history:     { theta: 1.5,   phi: 0.5  },
  geography:   { theta: 2.0,   phi: 0.2  },
  religion:    { theta: 2.5,   phi: 0.7  },
  literature:  { theta: 3.0,   phi: 0.4  },
  arts:        { theta: 3.5,   phi: 0.6  },
  music:       { theta: 4.0,   phi: 0.5  },
  lifestyle:   { theta: 4.5,   phi: 0.8  },
  sports:      { theta: 5.2,   phi: 0.75 },
  popCulture:  { theta: 5.7,   phi: 0.55 },
}
```

Semantically similar domains are placed near each other (technology ↔ science, arts ↔ music).

### Step 2: Weighted Circular Mean

For each question, compute its angle as the **weighted circular mean** of its domain angles:

```javascript
// Weights are squared to emphasize dominant domains
sinTheta += Math.sin(domainAngle.theta) * weight²
cosTheta += Math.cos(domainAngle.theta) * weight²
// ... same for phi

theta = atan2(sinTheta / total, cosTheta / total)
phi = atan2(sinPhi / total, cosPhi / total)
```

This ensures interdisciplinary questions land between their relevant domain clusters.

### Step 3: Difficulty → Radius

```
radius = BASE_RADIUS + (difficulty / 10) * RADIUS_SCALE
```

- Easy questions (1-3): close to the center of the globe
- Medium questions (4-6): mid-shell
- Hard questions (7-10): outer orbits

### Step 4: Spherical → Cartesian

```javascript
x = r * sin(phi) * cos(theta)
y = r * cos(phi)
z = r * sin(phi) * sin(theta)
```

### Step 5: Jitter

Small random offset prevents perfectly overlapping positions for similar questions.

## Color System

File: `src/utils/domainConfig.js`

### 13 Domain Colors

| Domain | Color | Emissive |
|--------|-------|----------|
| Technology | #aaffff | #0044ff |
| History | #cc8800 | #ffcc44 |
| Geography | #22cc44 | #88ff44 |
| Science | #00e5ff | #0055ff |
| Literature | #cc44aa | #ffaadd |
| Arts | #ff4db8 | #ff9ed8 |
| Music | #ff3355 | #ff88aa |
| Society | #ff7744 | #ffcc99 |
| Religion | #9944ff | #ddaaff |
| Pop Culture | #ffdd33 | #ff9955 |
| Sports | #33dd66 | #99ff88 |
| Lifestyle | #ff9955 | #ffd08a |
| Business | #ddcc00 | #44cc88 |

### Color Blending

`getBlendedColor(weights)` blends all domain colors proportionally:
- Weights are squared (emphasizes dominant domains)
- RGB channels averaged proportionally
- Returns both `color` (surface) and `emissive` (glow)

Result: Each star has a unique hue reflecting its interdisciplinary nature.

## StarNode Rendering

Each question becomes a `<mesh>` with:
- `<sphereGeometry>` — size varies slightly
- `<meshStandardMaterial>` — color + emissive for glow effect
- Hover: scale up animation
- Click: triggers zoom sequence
- Dimmed when filtered out (reduced opacity)

## Camera Animations

### Spin (Play Mode)
- Auto-rotate the globe for 1.5 seconds
- Uses `OrbitControls.autoRotate` or manual rotation

### Zoom
- Lerp camera position toward `zoomTarget` over 1.2 seconds
- Ease-out curve for smooth deceleration

### Idle
- Slow auto-rotation when not interacting
- OrbitControls for manual exploration

## Performance Considerations

- Instanced rendering for large question sets
- Frustum culling enabled by default
- Particle field uses points (not individual meshes)
- Questions loaded once, positions computed once (memoized)
