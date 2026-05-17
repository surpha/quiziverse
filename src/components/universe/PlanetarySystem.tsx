import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Planet } from './Planet';
import { PLANETS_DATA } from '@/data/questions';

interface PlanetarySystemProps {
  activePlanetId: string | null;
  onPlanetClick: (planet: any) => void;
  onPlanetHover?: (planetId: string | null) => void;
  rotationSpeed?: number;
}

export function PlanetarySystem({ activePlanetId, onPlanetClick, onPlanetHover, rotationSpeed = 0.015 }: PlanetarySystemProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {PLANETS_DATA.map((planet) => (
        <Planet
          key={planet.id}
          {...planet}
          isActive={activePlanetId === planet.id}
          onClick={() => onPlanetClick(planet)}
          onHover={(hovered) => {
            if (onPlanetHover) {
              onPlanetHover(hovered ? planet.id : null);
            }
          }}
        />
      ))}
    </group>
  );
}
