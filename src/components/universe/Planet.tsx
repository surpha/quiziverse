import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(vPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uHovered;
  uniform float uActive;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    float noise = sin(vUv.x * 8.0 + vUv.y * 6.0 + uTime * 0.1) * 0.5 + 0.5;
    vec3 baseColor = mix(uColor1, uColor2, noise);
    
    // Polar caps
    float cap = smoothstep(0.7, 1.0, abs(vNormal.y));
    baseColor = mix(baseColor, vec3(1.0), cap * 0.5);
    
    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    baseColor *= (diff * 0.8 + 0.2); // ambient

    // Hover brightness
    baseColor += uHovered * 0.2;
    
    // Active pulse
    baseColor += uActive * (sin(uTime * 4.0) * 0.3 + 0.7) * uColor1;
    
    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

interface PlanetProps {
  position: [number, number, number];
  color: string;
  secondaryColor: string;
  size: number;
  name: string;
  hasRing: boolean;
  stats: { questions: number; players: string; difficulty: string };
  isActive: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

function PlanetComponent({
  position,
  color,
  secondaryColor,
  size,
  name,
  hasRing,
  isActive,
  onClick,
  onHover
}: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Group>(null);
  
  const [hovered, setHovered] = useState(false);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(color) },
    uColor2: { value: new THREE.Color(secondaryColor) },
    uHovered: { value: 0 },
    uActive: { value: isActive ? 1 : 0 }
  }), [color, secondaryColor, isActive]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uActive.value = isActive ? 1 : 0;
    }
  }, [isActive]);

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, [color]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      // Lerp hover uniform
      materialRef.current.uniforms.uHovered.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uHovered.value,
        hovered ? 1 : 0,
        0.1
      );
    }
    if (groupRef.current) {
      const targetScale = hovered ? 1.15 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      groupRef.current.rotation.y += delta * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y -= delta * 0.2;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.3;
      particlesRef.current.rotation.z += delta * 0.1;
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    onHover(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHovered(false);
    onHover(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Core Planet */}
        <mesh 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[size, 64, 64]} />
          <shaderMaterial
            ref={materialRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
          />
        </mesh>

        {/* Atmosphere */}
        <mesh>
          <sphereGeometry args={[size * 1.08, 32, 32]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={hovered ? 0.15 : 0.06} 
            side={THREE.BackSide} 
          />
        </mesh>

        {/* Glow Sprite */}
        <sprite scale={[size * 4, size * 4, 1]}>
          <spriteMaterial 
            map={glowTexture} 
            color={color} 
            transparent 
            depthWrite={false} 
            blending={THREE.AdditiveBlending} 
            opacity={0.6}
          />
        </sprite>

        {/* Optional Ring */}
        {hasRing && (
          <mesh ref={ringRef} rotation={[Math.PI / 3, 0.2, 0]}>
            <torusGeometry args={[size * 1.6, 0.03, 8, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
          </mesh>
        )}

        {/* Orbiting particles */}
        <group ref={particlesRef}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = size * 2.2;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            return (
              <mesh key={i} position={[x, Math.sin(angle * 3) * 0.2, z]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshBasicMaterial color={secondaryColor} />
              </mesh>
            );
          })}
        </group>
      </group>

      <Html distanceFactor={12} center className="pointer-events-none">
        <div className={`transition-all duration-300 ${hovered ? 'opacity-100 scale-100' : 'opacity-40 scale-90'}`}>
          <div className="bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-white font-orbitron text-xs tracking-widest uppercase">{name}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

import { useEffect } from 'react';
export const Planet = React.memo(PlanetComponent);
