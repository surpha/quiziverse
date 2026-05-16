import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDomainColor } from '../utils/domainConfig'

/**
 * Option B: All nodes are uniform glowing spheres — differentiated by
 * pulse animation, flicker, halo aura, and orbital rings.
 *
 * Star "classes" by question type:
 *   straight  — Steady star: gentle pulse, no extras
 *   visual    — Ringed planet: wide orbital ring
 *   audio     — Pulsar: fast flicker + halo
 *   video     — Giant star: wide ring + halo
 *   connect   — Binary system: double orbital rings
 *   cryptic   — Variable star: slow deep pulse + flicker + halo
 *   fitb      — Thin-ring star: thin orbital ring
 *   longform  — Nebula core: very slow pulse + large halo
 *   list      — Cluster star: thin ring, fast pulse
 *   truefalse — Steady ringed: thin ring, minimal pulse
 *   bounce    — Rapid pulsar: very fast flicker
 */

const STAR_CLASS = {
  straight:  { pulseSpeed: 1.5,  pulseAmp: 0.04, ring: 'none',   flicker: false, halo: false },
  visual:    { pulseSpeed: 1.0,  pulseAmp: 0.03, ring: 'wide',   flicker: false, halo: false },
  audio:     { pulseSpeed: 3.0,  pulseAmp: 0.06, ring: 'none',   flicker: true,  halo: true  },
  video:     { pulseSpeed: 1.2,  pulseAmp: 0.03, ring: 'wide',   flicker: false, halo: true  },
  connect:   { pulseSpeed: 1.8,  pulseAmp: 0.04, ring: 'double', flicker: false, halo: false },
  cryptic:   { pulseSpeed: 0.6,  pulseAmp: 0.08, ring: 'none',   flicker: true,  halo: true  },
  fitb:      { pulseSpeed: 2.2,  pulseAmp: 0.05, ring: 'thin',   flicker: false, halo: false },
  longform:  { pulseSpeed: 0.4,  pulseAmp: 0.06, ring: 'none',   flicker: false, halo: true  },
  list:      { pulseSpeed: 2.5,  pulseAmp: 0.03, ring: 'thin',   flicker: false, halo: false },
  truefalse: { pulseSpeed: 1.0,  pulseAmp: 0.02, ring: 'thin',   flicker: false, halo: false },
  bounce:    { pulseSpeed: 5.0,  pulseAmp: 0.08, ring: 'none',   flicker: true,  halo: false },
}

function StarNode({ question, position, onSelect, dimmed = false }) {
  const coreRef = useRef()
  const haloRef = useRef()
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const [hovered, setHovered] = useState(false)

  const { color, emissive } = getDomainColor(question.weights)
  const starClass = STAR_CLASS[question.type] || STAR_CLASS.straight

  // Size by active domains
  const activeDomains = useMemo(() => {
    if (!question.weights) return 1
    return Object.values(question.weights).filter(w => w >= 4).length
  }, [question.weights])
  const sizeScale = 0.7 + (activeDomains / 12) * 0.8

  // Glow by difficulty
  const difficulty = question.difficulty || 5
  const baseGlow = 0.3 + (difficulty / 10) * 1.2

  // Has media
  const hasMedia = !!(question.mediaUrl || question.imageUrl)

  // Offset for unique timing per node
  const timeOffset = useMemo(
    () => position[0] * 3 + position[1] * 7 + position[2] * 11,
    [position]
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime + timeOffset

    if (coreRef.current) {
      // Pulse scale
      const base = dimmed ? 0.4 : sizeScale
      const pulse = hovered
        ? sizeScale * 1.35
        : base + Math.sin(t * starClass.pulseSpeed) * starClass.pulseAmp
      coreRef.current.scale.setScalar(pulse)

      // Flicker: rapid emissive variation
      if (starClass.flicker && !dimmed && coreRef.current.material) {
        const flick = 0.7 + Math.sin(t * 12) * 0.15 + Math.sin(t * 19) * 0.1
        coreRef.current.material.emissiveIntensity = baseGlow * flick
      }
    }

    // Halo breathe
    if (haloRef.current) {
      const haloScale = sizeScale * (1.8 + Math.sin(t * starClass.pulseSpeed * 0.5) * 0.15)
      haloRef.current.scale.setScalar(haloScale)
      haloRef.current.material.opacity =
        0.08 + Math.sin(t * starClass.pulseSpeed * 0.7) * 0.04
    }

    // Ring rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += 0.008
      ring1Ref.current.rotation.x = Math.sin(t * 0.3) * 0.2
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= 0.006
      ring2Ref.current.rotation.y = Math.sin(t * 0.4) * 0.3
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (!dimmed) onSelect(question)
  }

  const showRing = !dimmed && (starClass.ring !== 'none' || hasMedia)
  const showDoubleRing = !dimmed && starClass.ring === 'double'
  const ringRadius = starClass.ring === 'wide' ? 0.28 : 0.24
  const ringThickness = starClass.ring === 'wide' ? 0.02 : 0.012

  return (
    <group position={position}>
      {/* Core sphere */}
      <mesh
        ref={coreRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!dimmed) {
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : dimmed ? '#333333' : color}
          emissive={hovered ? color : dimmed ? '#111111' : emissive}
          emissiveIntensity={hovered ? 2.0 : dimmed ? 0.1 : baseGlow}
          transparent={dimmed}
          opacity={dimmed ? 0.2 : 1}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Halo — soft outer glow for certain types */}
      {starClass.halo && !dimmed && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={baseGlow * 0.5}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Primary orbital ring */}
      {showRing && (
        <mesh ref={ring1Ref} rotation={[1.2, 0.3, 0]}>
          <torusGeometry args={[ringRadius * sizeScale, ringThickness, 8, 48]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={baseGlow * 0.6}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Second ring for "double" type (connect questions) */}
      {showDoubleRing && (
        <mesh ref={ring2Ref} rotation={[0.3, 1.5, 0.8]}>
          <torusGeometry args={[0.22 * sizeScale, 0.01, 8, 48]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={baseGlow * 0.4}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  )
}

export default StarNode
