import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDomainColor } from '../utils/domainConfig'

// Vertex shader — passes UVs and normal for lighting
const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader — creates planet surface pattern
const planetFragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uHover;
  uniform float uDimmed;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Simple noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Use normal-space coordinates to avoid UV seam artifacts.
    vec3 nrm = normalize(vNormal);
    vec2 surf = nrm.xy;

    // Softer latitude tint (no harsh dark striping).
    float bands = 0.5 + 0.5 * sin(nrm.y * 5.0 + uTime * 0.08);

    // Multi-layer soft noise for organic surface detail.
    float n1 = noise(surf * 3.8 + uTime * 0.04);
    float n2 = noise(surf.yx * 7.2 - uTime * 0.03);
    float n = n1 * 0.65 + n2 * 0.35;

    // Mix colors with gentler contrast.
    float mix_factor = 0.3 + bands * 0.3 + n * 0.4;
    vec3 surface = mix(uColor1, uColor2, mix_factor);

    // Polar caps (brighter at poles)
    float polar = smoothstep(0.85, 1.0, abs(vUv.y - 0.5) * 2.0);
    surface = mix(surface, vec3(1.0), polar * 0.2);

    // Soft wrap lighting
    vec3 lightDir = normalize(vec3(1.0, 0.8, 0.5));
    float diffuse = max(dot(nrm, lightDir), 0.0) * 0.25 + 0.75;
    surface *= diffuse;

    // Emissive self-glow — slightly brighter
    surface += uColor1 * 0.25;

    // Clean rim glow (Fresnel)
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.5);
    surface += uColor1 * rim * 0.5;

    // Hover brightness
    surface += uHover * 0.4;

    // Dimmed
    surface = mix(surface, vec3(0.08), uDimmed);

    gl_FragColor = vec4(surface, mix(1.0, 0.15, uDimmed));
  }
`

// Create a radial gradient texture for the glow sprite
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)')
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.25)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.05)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

const glowTexture = createGlowTexture()

// Ring config by question type
const RING_TYPE = {
  straight: 'none',
  visual: 'wide',
  audio: 'none',
  video: 'wide',
  connect: 'double',
  cryptic: 'none',
  fitb: 'thin',
  longform: 'none',
  list: 'thin',
  truefalse: 'thin',
  bounce: 'none',
  badexplain: 'none',
}

function StarNode({ question, position, onSelect, dimmed = false, attemptVerdict = null }) {
  const meshRef = useRef()
  const atmoRef = useRef()
  const ringRef = useRef()
  const ring2Ref = useRef()
  const [hovered, setHovered] = useState(false)

  const { color, emissive } = getDomainColor(question.weights)

  // Parse colors to vec3
  const color1 = useMemo(() => new THREE.Color(color), [color])
  const color2 = useMemo(() => new THREE.Color(emissive), [emissive])

  // Size by active domains
  const activeDomains = useMemo(() => {
    if (!question.weights) return 1
    return Object.values(question.weights).filter(w => w >= 4).length
  }, [question.weights])

  // Planet size scales with difficulty (harder = bigger planet)
  const difficulty = question.difficulty || 5
  const sizeScale = 0.2 + (difficulty / 10) * 0.25

  // Difficulty drives flicker speed (hard questions shimmer/pulse faster)
  const flickerSpeed = 1.0 + (difficulty / 10) * 4.0
  const flickerAmp = 0.02 + (difficulty / 10) * 0.06

  // Has media → ring
  const hasMedia = !!(question.mediaUrl || question.imageUrl)
  const ringType = RING_TYPE[question.type] || 'none'
  const showRing = !dimmed && (ringType !== 'none' || hasMedia)
  const showDoubleRing = !dimmed && ringType === 'double'

  // Offset for unique timing per node
  const timeOffset = useMemo(
    () => position[0] * 3 + position[1] * 7 + position[2] * 11,
    [position]
  )

  // Shader uniforms
  const uniforms = useMemo(() => ({
    uColor1: { value: color1 },
    uColor2: { value: color2 },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uDimmed: { value: dimmed ? 1.0 : 0.0 },
  }), [color1, color2, dimmed])

  useFrame((state) => {
    const t = state.clock.elapsedTime + timeOffset

    if (meshRef.current) {
      // Slow self-rotation
      meshRef.current.rotation.y += 0.003
      // Update time uniform
      meshRef.current.material.uniforms.uTime.value = t
      // Lerp hover
      const targetHover = hovered ? 1.0 : 0.0
      meshRef.current.material.uniforms.uHover.value +=
        (targetHover - meshRef.current.material.uniforms.uHover.value) * 0.1
      // Flicker/pulse — harder questions flicker faster
      const flicker = Math.sin(t * flickerSpeed) * flickerAmp
        + Math.sin(t * flickerSpeed * 2.3) * (flickerAmp * 0.4)
      const s = dimmed ? sizeScale * 0.5 : hovered ? sizeScale * 1.15 : sizeScale * (1.0 + flicker)
      meshRef.current.scale.setScalar(s)
    }

    if (atmoRef.current) {
      const atmoFlicker = 1.0 + Math.sin(t * flickerSpeed * 0.7) * flickerAmp * 2
      atmoRef.current.scale.setScalar(dimmed ? sizeScale * 0.55 : sizeScale * 1.1 * atmoFlicker)
    }

    // Ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.005
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= 0.004
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (!dimmed) onSelect(question)
  }

  const ringRadius = ringType === 'wide' ? 1.9 : 1.6
  const ringThickness = ringType === 'wide' ? 0.08 : 0.05

  return (
    <group position={position}>
      {/* Planet core — shader material */}
      <mesh
        ref={meshRef}
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
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={planetVertexShader}
          fragmentShader={planetFragmentShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      {/* Atmosphere — backside glow */}
      {!dimmed && (
        <mesh ref={atmoRef}>
          <sphereGeometry args={[1.3, 24, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Glow sprite — additive blending */}
      {!dimmed && (
        <sprite scale={[sizeScale * 5, sizeScale * 5, 1]}>
          <spriteMaterial
            map={glowTexture}
            color={color}
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      )}

      {/* Primary ring */}
      {showRing && (
        <mesh ref={ringRef} rotation={[1.3, 0.2, 0]} scale={[sizeScale, sizeScale, sizeScale]}>
          <torusGeometry args={[ringRadius, ringThickness, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Second ring for "double" (connect questions) */}
      {showDoubleRing && (
        <mesh ref={ring2Ref} rotation={[0.4, 1.4, 0.6]} scale={[sizeScale, sizeScale, sizeScale]}>
          <torusGeometry args={[1.5, 0.04, 8, 64]} />
          <meshBasicMaterial color={emissive} transparent opacity={0.35} />
        </mesh>
      )}

      {/* Attempt flag — green (correct) or red (incorrect/partial) */}
      {!dimmed && attemptVerdict && (
        <group position={[sizeScale * 1.2, sizeScale * 1.4, 0]} scale={[0.2, 0.2, 0.2]}>
          {/* Flag pole */}
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshBasicMaterial color="#aaaaaa" />
          </mesh>
          {/* Flag */}
          <mesh position={[0.3, 0.1, 0]}>
            <planeGeometry args={[0.6, 0.4]} />
            <meshBasicMaterial
              color={attemptVerdict === 'correct' ? '#22c55e' : '#ef4444'}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}

export default StarNode
