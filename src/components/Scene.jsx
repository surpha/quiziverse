import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import StarNode from './StarNode'
import { computePositions } from '../utils/coordinateMapper'
import { getDominantDomain } from '../utils/domainConfig'
import DOMAINS from '../utils/domainConfig'

function matchesFilters(question, filters) {
  // Domain filter: check if question's dominant domain is in selected set
  if (filters.domains && filters.domains.length > 0) {
    const dominant = getDominantDomain(question.weights)
    if (!dominant || !filters.domains.includes(dominant)) return false
  }
  // Type filter: check if question's type is in selected set
  if (filters.types && filters.types.length > 0) {
    if (!filters.types.includes(question.type)) return false
  }
  return true
}

/** Majestic translucent white sun at center */
function CenterBeacon({ onClick }) {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 1.0 + Math.sin(t * 1.5) * 0.15 + Math.sin(t * 3.7) * 0.06
      meshRef.current.material.opacity = 0.85 + Math.sin(t * 0.8) * 0.05
    }
  })

  return (
    <mesh
      ref={meshRef}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      <sphereGeometry args={[1.6, 48, 48]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={1.0}
        roughness={0.1}
        metalness={0.0}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

/** Concentric wireframe spheres showing difficulty orbits */
function OrbitShells() {
  const radii = [5.0, 9.0, 13.0, 17.0, 22.0]
  return (
    <>
      {radii.map((r) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe opacity={0.03} transparent />
        </mesh>
      ))}
    </>
  )
}

/**
 * Draw faint lines connecting questions that share the same primary domain,
 * forming visual "constellations". Only connects nearest neighbors (max distance).
 */
/**
 * Curved glowing streaks connecting same-domain questions.
 * Uses CatmullRom curves with midpoint offset for organic arcs.
 */
function ConstellationLines({ questions, filters }) {
  const lines = useMemo(() => {
    // Group questions by primary domain
    const groups = {}
    for (const q of questions) {
      if (!matchesFilters(q, filters)) continue
      const dom = getDominantDomain(q.weights)
      if (!groups[dom]) groups[dom] = []
      groups[dom].push(q)
    }

    const result = []
    const maxDist = 10.0 // Wider range now that nodes are more spread

    for (const [domain, members] of Object.entries(groups)) {
      if (members.length < 2) continue
      const color = DOMAINS[domain]?.color || '#a78bfa'

      // Connect each node to its nearest neighbor in the same domain
      for (let i = 0; i < members.length; i++) {
        let bestDist = Infinity
        let bestJ = -1
        for (let j = 0; j < members.length; j++) {
          if (i === j) continue
          const dx = members[i].position[0] - members[j].position[0]
          const dy = members[i].position[1] - members[j].position[1]
          const dz = members[i].position[2] - members[j].position[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < bestDist && dist < maxDist) {
            bestDist = dist
            bestJ = j
          }
        }
        if (bestJ !== -1) {
          const key = i < bestJ ? `${i}-${bestJ}` : `${bestJ}-${i}`
          if (!result.find(l => l.key === `${domain}-${key}`)) {
            const p1 = new THREE.Vector3(...members[i].position)
            const p2 = new THREE.Vector3(...members[bestJ].position)
            // Create curved midpoint — offset toward center for an arc
            const mid = p1.clone().add(p2).multiplyScalar(0.5)
            mid.multiplyScalar(0.8) // Pull toward center for curve

            // Generate smooth curve points
            const curve = new THREE.CatmullRomCurve3([p1, mid, p2])
            const curvePoints = curve.getPoints(24)

            result.push({
              key: `${domain}-${key}`,
              positions: new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z])),
              color,
              pointCount: curvePoints.length,
            })
          }
        }
      }
    }
    return result
  }, [questions, filters])

  return (
    <>
      {lines.map(({ key, positions, color, pointCount }) => (
        <line key={key}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pointCount}
              array={positions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.35} linewidth={1} />
        </line>
      ))}
    </>
  )
}

/** Wrapper group that spins when isSpinning is true */
function SpinningGlobe({ children, isSpinning }) {
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (groupRef.current && isSpinning) {
      groupRef.current.rotation.y += delta * 4.0
      groupRef.current.rotation.x += delta * 1.5
    }
  })

  return <group ref={groupRef}>{children}</group>
}

/** Smoothly zooms camera toward a target position */
function CameraZoom({ target, active }) {
  const { camera } = useThree()
  const targetVec = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    if (!active || !target) return

    // Position camera offset from the target (slightly back)
    targetVec.current.set(target[0], target[1], target[2] + 3)

    // Lerp camera position toward target
    camera.position.lerp(targetVec.current, delta * 3.0)
    camera.lookAt(target[0], target[1], target[2])
  })

  return null
}

/** Floating dust — tiny particles drifting through space */
function FloatingDust({ count = 300 }) {
  const meshRef = useRef()

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Distribute in a shell between radius 25-60
      const r = 25 + Math.random() * 35
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [count])

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.003
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.001) * 0.02
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#8899bb"
        size={0.08}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/** Nebula clouds — soft colorful gas wisps in the background */
function NebulaClouds() {
  const cloudsData = useMemo(() => [
    { pos: [40, 20, -30], color: '#1a0533', scale: 30, rot: 0 },
    { pos: [-35, -15, -40], color: '#0a1a33', scale: 25, rot: 1.2 },
    { pos: [10, -35, 45], color: '#1a0a2a', scale: 35, rot: 2.5 },
    { pos: [-30, 25, 35], color: '#0d1a2d', scale: 28, rot: 3.8 },
  ], [])

  return (
    <>
      {cloudsData.map((cloud, i) => (
        <NebulaCloud key={i} {...cloud} />
      ))}
    </>
  )
}

const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const nebulaFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);

    // Organic noise pattern
    float n = fbm(uv * 3.0 + uTime * 0.02);
    float n2 = fbm(uv * 5.0 - uTime * 0.015);

    // Fade to edges
    float fade = smoothstep(0.5, 0.1, dist);

    // Combine
    float alpha = fade * (n * 0.5 + n2 * 0.3) * 0.15;

    gl_FragColor = vec4(uColor + vec3(n * 0.15, n2 * 0.1, n * 0.2), alpha);
  }
`

function NebulaCloud({ pos, color, scale, rot }) {
  const meshRef = useRef()
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
  }), [color])

  useFrame(({ clock, camera }) => {
    if (meshRef.current) {
      uniforms.uTime.value = clock.getElapsedTime()
      // Billboard: face camera
      meshRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <mesh ref={meshRef} position={pos} scale={[scale, scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Shooting stars — straight line streaks across the sky */
function ShootingStars({ count = 5 }) {
  const meteors = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Random start point on far sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 65
      const sx = r * Math.sin(phi) * Math.cos(theta)
      const sy = r * Math.cos(phi)
      const sz = r * Math.sin(phi) * Math.sin(theta)

      // Random straight direction (tangent to sphere)
      const dx = (Math.random() - 0.5)
      const dy = (Math.random() - 0.5)
      const dz = (Math.random() - 0.5)
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const speed = 30 + Math.random() * 40
      const tailLen = 4 + Math.random() * 6

      return {
        id: i,
        start: [sx, sy, sz],
        dir: [dx / len * speed, dy / len * speed, dz / len * speed],
        tailLen,
        offset: Math.random() * 50,
        duration: 1.2 + Math.random() * 1.0,
        interval: 12 + Math.random() * 25,
      }
    })
  }, [count])

  return (
    <>
      {meteors.map(m => (
        <ShootingStar key={m.id} config={m} />
      ))}
    </>
  )
}

function ShootingStar({ config }) {
  const lineRef = useRef()

  useFrame(({ clock }) => {
    if (!lineRef.current) return
    const t = clock.getElapsedTime()
    const cycle = ((t + config.offset) % config.interval) / config.duration

    if (cycle > 1) {
      lineRef.current.visible = false
      return
    }

    lineRef.current.visible = true

    // Head position — straight line motion
    const hx = config.start[0] + config.dir[0] * cycle
    const hy = config.start[1] + config.dir[1] * cycle
    const hz = config.start[2] + config.dir[2] * cycle

    // Tail position — trails behind along same direction
    const tailFrac = Math.max(0, cycle - config.tailLen / Math.sqrt(config.dir[0] ** 2 + config.dir[1] ** 2 + config.dir[2] ** 2))
    const tx = config.start[0] + config.dir[0] * tailFrac
    const ty = config.start[1] + config.dir[1] * tailFrac
    const tz = config.start[2] + config.dir[2] * tailFrac

    const pos = lineRef.current.geometry.attributes.position
    pos.array[0] = hx; pos.array[1] = hy; pos.array[2] = hz
    pos.array[3] = tx; pos.array[4] = ty; pos.array[5] = tz
    pos.needsUpdate = true

    // Smooth fade in then out
    const fade = cycle < 0.15 ? cycle / 0.15 : cycle > 0.85 ? (1 - cycle) / 0.15 : 1
    lineRef.current.material.opacity = Math.min(fade, 1) * 0.6
  })

  return (
    <line ref={lineRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array(6)}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ffffff" transparent opacity={0} />
    </line>
  )
}

function Scene({ onSelectQuestion, onSunClick, filters, questions, isSpinning, isZooming, zoomTarget }) {
  const positionedQuestions = useMemo(() => computePositions(questions), [questions])

  return (
    <>
      {/* Cosmic lighting */}
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={2.2} color="#ffffff" distance={80} />
      <pointLight position={[15, 10, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, -5, 8]} intensity={0.3} color="#88ccff" distance={50} />

      {/* Deep starfield background */}
      <Stars
        radius={80}
        depth={60}
        count={4000}
        factor={5}
        saturation={0.3}
        fade
        speed={0.5}
      />

      {/* Shooting stars */}
      <ShootingStars count={6} />

      {/* Nebula clouds in background */}
      <NebulaClouds />

      {/* Floating dust particles */}
      <FloatingDust count={300} />

      {/* Camera zoom animation */}
      <CameraZoom target={zoomTarget} active={isZooming} />

      {/* Globe content that spins during random play */}
      <SpinningGlobe isSpinning={isSpinning}>
        {/* Center beacon glow */}
        <CenterBeacon onClick={onSunClick} />

        {/* Orbital rings */}
        <OrbitShells />

        {/* Question nodes */}
        {positionedQuestions.map((q) => (
          <StarNode
            key={q.id}
            question={q}
            position={q.position}
            onSelect={onSelectQuestion}
            dimmed={!matchesFilters(q, filters)}
          />
        ))}
      </SpinningGlobe>

      {/* Camera controls — disabled during spin/zoom */}
      <OrbitControls
        enablePan={!isSpinning && !isZooming}
        enableZoom={!isSpinning && !isZooming}
        enableRotate={!isSpinning && !isZooming}
        enableDamping
        dampingFactor={0.05}
        autoRotate={!isSpinning && !isZooming}
        autoRotateSpeed={0.15}
        minDistance={4}
        maxDistance={90}
      />
    </>
  )
}

export default Scene
