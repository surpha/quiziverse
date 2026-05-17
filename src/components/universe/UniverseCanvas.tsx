import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { StarField } from './StarField';
import { NebulaBackground } from './NebulaBackground';
import { FloatingDust } from './FloatingDust';
import { PlanetarySystem } from './PlanetarySystem';
import { ConnectionPaths } from './ConnectionPaths';
import { CenterBeacon } from './CenterBeacon';

interface UniverseCanvasProps {
  cameraZ: number;
  onPlanetClick: (planet: any) => void;
  onBeaconQuestion: (planet: any, question: string) => void;
  isSpinning?: boolean;
  isZooming?: boolean;
  zoomTarget?: [number, number, number] | null;
}

function CameraController({
  cameraZ,
  isZooming,
  zoomTarget,
}: {
  cameraZ: number;
  isZooming: boolean;
  zoomTarget: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const desiredPositionRef = useRef(new THREE.Vector3(0, 0, cameraZ));
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (isZooming && zoomTarget) {
      lookAtRef.current.set(zoomTarget[0], zoomTarget[1], zoomTarget[2]);
      const viewDir = lookAtRef.current.clone().normalize();
      desiredPositionRef.current.copy(lookAtRef.current).add(viewDir.multiplyScalar(7.5));

      const lerpFactor = 1 - Math.exp(-delta * 5.5);
      camera.position.lerp(desiredPositionRef.current, lerpFactor);
      camera.lookAt(lookAtRef.current);
      return;
    }

    desiredPositionRef.current.set(0, 0, cameraZ);
    lookAtRef.current.set(0, 0, 0);

    const lerpFactor = 1 - Math.exp(-delta * 3.5);
    camera.position.lerp(desiredPositionRef.current, lerpFactor);
    camera.lookAt(lookAtRef.current);
  });

  return null;
}

export function UniverseCanvas({
  cameraZ,
  onPlanetClick,
  onBeaconQuestion,
  isSpinning = false,
  isZooming = false,
  zoomTarget = null,
}: UniverseCanvasProps) {
  const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
  const [webglError, setWebglError] = useState(false);
  const rotationSpeed = isZooming ? 0 : isSpinning ? 0.9 : 0.015;

  if (webglError) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#00e5ff', fontFamily: 'Orbitron, monospace' }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>WebGL Required</div>
          <div style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}>Please use a WebGL-enabled browser to experience the cosmos.</div>
        </div>
      </div>
    );
  }

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
      camera={{ fov: 75, position: [0, 0, cameraZ], near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false, failIfMajorPerformanceCaveat: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#000008'));
      }}
      onError={() => setWebglError(true)}
    >
      <CameraController cameraZ={cameraZ} isZooming={isZooming} zoomTarget={zoomTarget} />
      
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#4488ff" distance={40} />
      
      <NebulaBackground />
      <StarField />
      <FloatingDust />
      
      <PlanetarySystem 
        activePlanetId={activePlanetId}
        rotationSpeed={rotationSpeed}
        onPlanetClick={(planet) => {
          setActivePlanetId(planet.id);
          onPlanetClick(planet);
        }}
      />
      <ConnectionPaths rotationSpeed={rotationSpeed} />
      
      <CenterBeacon 
        onQuestion={(planet, question) => {
          setActivePlanetId(planet.id);
          onBeaconQuestion(planet, question);
        }}
      />
      
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        autoRotate={!isSpinning && !isZooming}
        autoRotateSpeed={0.12}
        minDistance={8}
        maxDistance={55}
        enableRotate={!isZooming}
        enableZoom={!isZooming}
        enablePan={false}
      />
    </Canvas>
  );
}
