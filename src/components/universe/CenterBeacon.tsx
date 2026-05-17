import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { PLANETS_DATA, QUESTIONS } from '@/data/questions';

interface CenterBeaconProps {
  onQuestion: (planet: any, question: string) => void;
}

export function CenterBeacon({ onQuestion }: CenterBeaconProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const ringsRef = useRef<THREE.Group>(null);
  
  const [activePlanetPosition, setActivePlanetPosition] = useState<[number, number, number] | null>(null);
  const [beamVisible, setBeamVisible] = useState(false);
  const beamOpacityRef = useRef(0);

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(136, 221, 255, 0.8)');
    grad.addColorStop(1, 'rgba(0, 136, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomPlanet = PLANETS_DATA[Math.floor(Math.random() * PLANETS_DATA.length)];
      const randomQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      
      onQuestion(randomPlanet, randomQuestion);
      setActivePlanetPosition(randomPlanet.position);
      setBeamVisible(true);
      beamOpacityRef.current = 0;
      
      setTimeout(() => {
        setBeamVisible(false);
      }, 3000);
      
    }, 8000); // Send beacon every 8s

    return () => clearInterval(interval);
  }, [onQuestion]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    
    if (coreRef.current) {
      const scale = Math.sin(t * 2) * 0.1 + 1.0;
      coreRef.current.scale.set(scale, scale, scale);
    }
    
    if (glowRef.current) {
      (glowRef.current.material as THREE.SpriteMaterial).opacity = 0.3 + Math.sin(t * 1.5) * 0.15;
    }
    
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, i) => {
        const ringTime = (t * 0.5 + i * 0.33) % 1.0;
        ring.scale.setScalar(1 + ringTime * 2);
        (ring as THREE.Mesh).material.opacity = (1 - ringTime) * 0.6;
      });
    }

    if (beamVisible) {
      beamOpacityRef.current = Math.min(0.8, beamOpacityRef.current + delta * 2);
    } else {
      beamOpacityRef.current = Math.max(0, beamOpacityRef.current - delta * 2);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#88ddff" />
      </mesh>

      <group ref={ringsRef}>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh key={i} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.5, 0.02, 16, 64]} />
            <meshBasicMaterial color="#00ffff" transparent blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>

      <sprite ref={glowRef} scale={[6, 6, 1]}>
        <spriteMaterial 
          map={glowTexture} 
          transparent 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {activePlanetPosition && beamOpacityRef.current > 0 && (
        <Line
          points={[[0, 0, 0], activePlanetPosition]}
          color="#88ddff"
          lineWidth={2}
          transparent
          opacity={beamOpacityRef.current}
        />
      )}
    </group>
  );
}
