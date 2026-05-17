import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS_DATA } from '@/data/questions';

const CONNECTIONS = [
  ['science', 'environment'],
  ['politics', 'society'],
  ['technology', 'philosophy'],
  ['literature', 'philosophy'],
  ['history', 'society'],
  ['economics', 'politics']
];

function ConnectionPath({ startId, endId }: { startId: string, endId: string }) {
  const startPlanet = PLANETS_DATA.find(p => p.id === startId);
  const endPlanet = PLANETS_DATA.find(p => p.id === endId);
  
  if (!startPlanet || !endPlanet) return null;
  
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...startPlanet.position);
    const end = new THREE.Vector3(...endPlanet.position);
    
    // Elevate the midpoint based on distance
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 4 + Math.random() * 2;
    
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [startPlanet, endPlanet]);

  const points = useMemo(() => curve.getPoints(60), [curve]);
  
  // Mixed color
  const color = new THREE.Color(startPlanet.color).lerp(new THREE.Color(endPlanet.color), 0.5);

  return (
    <group>
      <Line 
        points={points} 
        color={color} 
        lineWidth={1.5} 
        transparent 
        opacity={0.45} 
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <ConnectionParticle key={i} curve={curve} phase={i * 0.25} color={color} />
      ))}
    </group>
  );
}

function ConnectionParticle({ curve, phase, color }: { curve: THREE.CatmullRomCurve3, phase: number, color: THREE.Color }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = ((clock.elapsedTime * 0.15 + phase) % 1.0);
      const pos = curve.getPoint(t);
      meshRef.current.position.copy(pos);
      
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + Math.sin(clock.elapsedTime * 4 + phase * Math.PI * 2) * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} transparent />
    </mesh>
  );
}

export function ConnectionPaths() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Apply the same slow rotation as PlanetarySystem
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {CONNECTIONS.map(([startId, endId], i) => (
        <ConnectionPath key={i} startId={startId} endId={endId} />
      ))}
    </group>
  );
}
