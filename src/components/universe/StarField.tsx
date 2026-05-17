import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

export function StarField() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions] = useMemo(() => {
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const r = 80 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return [pos];
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <>
      <Stars radius={200} depth={80} count={7000} factor={5} saturation={0.6} fade speed={0.8} />
      
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#aaddff"
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>
    </>
  );
}
