import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  
  void main() {
    vec2 c = vUv - 0.5;
    float dist = length(c);
    
    // Create organic noise-like pattern using sin/cos
    float noise = sin(vUv.x * 10.0 + uTime * 0.5) * cos(vUv.y * 10.0 - uTime * 0.3) * 0.5 + 0.5;
    float noise2 = cos(dist * 20.0 - uTime) * 0.5 + 0.5;
    
    float alpha = smoothstep(0.5, 0.1, dist); // radial fade
    alpha *= mix(0.4, 1.0, noise * noise2);
    
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface NebulaProps {
  position: [number, number, number];
  color: string;
  size: number;
}

function NebulaCloud({ position, color, size }: NebulaProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) }
  }), [color]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * 0.5;
    }
    if (meshRef.current) {
      // Slow rotation
      meshRef.current.rotation.z += delta * 0.05;
      // Billboard to face camera
      meshRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.12}
      />
    </mesh>
  );
}

export function NebulaBackground() {
  return (
    <group>
      <NebulaCloud position={[-60, 30, -100]} color="#3300aa" size={100} />
      <NebulaCloud position={[50, -20, -120]} color="#aa0066" size={120} />
      <NebulaCloud position={[0, -40, -90]} color="#006688" size={90} />
      <NebulaCloud position={[-30, 50, -110]} color="#0033cc" size={110} />
      <NebulaCloud position={[70, 10, -130]} color="#440088" size={100} />
    </group>
  );
}
