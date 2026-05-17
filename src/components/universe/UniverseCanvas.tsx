import React, { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
}

function CameraController({ cameraZ }: { cameraZ: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.z = cameraZ;
  }, [cameraZ, camera]);
  return null;
}

export function UniverseCanvas({ cameraZ, onPlanetClick, onBeaconQuestion }: UniverseCanvasProps) {
  const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
  const [webglError, setWebglError] = useState(false);

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
      <CameraController cameraZ={cameraZ} />
      
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#4488ff" distance={40} />
      
      <NebulaBackground />
      <StarField />
      <FloatingDust />
      
      <PlanetarySystem 
        activePlanetId={activePlanetId}
        onPlanetClick={(planet) => {
          setActivePlanetId(planet.id);
          onPlanetClick(planet);
        }}
      />
      <ConnectionPaths />
      
      <CenterBeacon 
        onQuestion={(planet, question) => {
          setActivePlanetId(planet.id);
          onBeaconQuestion(planet, question);
        }}
      />
      
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.12}
        minDistance={8}
        maxDistance={55}
        enablePan={false}
      />
    </Canvas>
  );
}
