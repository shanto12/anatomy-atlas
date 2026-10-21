import { Environment, Lightformer } from '@react-three/drei';
import { useMemo } from 'react';

import { createFalloffTexture, createPoolTexture, createShadowTexture } from '@/viewer/geometry';
import {
  createFloorMaterial,
  createGlowSpriteMaterial,
  createPoolMaterial,
  createRingMaterial,
  createShadowMaterial,
} from '@/viewer/materials';

interface StageEnvironmentProps {
  variant: 'hero' | 'explore' | 'organ' | 'system';
}

/**
 * Museum-theatre lighting: a warm key, a cool rim, a low oxblood bounce, a procedural studio
 * environment for reflections, and a stage floor with a pool of light and a grounding shadow.
 */
export default function StageEnvironment({ variant }: StageEnvironmentProps) {
  const falloff = useMemo(() => createFalloffTexture(), []);
  const shadow = useMemo(() => createShadowTexture(), []);
  const pool = useMemo(() => createPoolTexture(), []);

  const floorMaterial = useMemo(() => createFloorMaterial(), []);
  const poolMaterial = useMemo(() => createPoolMaterial(pool), [pool]);
  const shadowMaterial = useMemo(() => createShadowMaterial(shadow), [shadow]);
  const haloMaterial = useMemo(() => createGlowSpriteMaterial('#e8bd83', falloff, variant === 'hero' ? 0.16 : 0.1), [
    falloff,
    variant,
  ]);
  const outerRingMaterial = useMemo(() => createRingMaterial('#d8b170', 0.16), []);
  const innerRingMaterial = useMemo(() => createRingMaterial('#d8b170', 0.07), []);

  return (
    <>
      {/* Core lighting */}
      <ambientLight intensity={0.24} color="#f4e6d2" />
      <hemisphereLight args={['#c6dad6', '#160f0a', 0.5]} />
      <directionalLight position={[5.5, 10.5, 7.5]} intensity={2.7} color="#ffe3bb" />
      <directionalLight position={[-7, 6.5, -5.5]} intensity={2.5} color="#93c1ca" />
      <directionalLight position={[2.5, 7.5, -8]} intensity={1.5} color="#e7b98b" />
      <spotLight
        position={[0, 11.5, 4.5]}
        angle={0.5}
        penumbra={1}
        intensity={26}
        distance={34}
        decay={2}
        color="#fff0d6"
      />
      <pointLight position={[0, 2.8, 5.5]} intensity={7} distance={13} decay={2} color="#b0453a" />

      {/* Procedural studio environment — no external HDR download. */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#070605']} />
        <Lightformer form="ring" intensity={3.2} color="#ffd9a8" position={[0, 6, -10]} scale={11} />
        <Lightformer
          form="rect"
          intensity={1.8}
          color="#9cc4c9"
          position={[-9, 4, 3]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#e8b07a"
          position={[9, 3, 2]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[10, 8, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#d9cbb2"
          position={[0, 9, 2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[12, 12, 1]}
        />
      </Environment>

      {/* Stage floor */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={floorMaterial}>
          <circleGeometry args={[5.2, 72]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={poolMaterial}>
          <circleGeometry args={[4.8, 64]} />
        </mesh>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.004, 0.08]}
          scale={[1.55, 2.15, 1]}
          material={shadowMaterial}
        >
          <circleGeometry args={[1, 48]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={outerRingMaterial}>
          <ringGeometry args={[3.38, 3.42, 96]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={innerRingMaterial}>
          <ringGeometry args={[2.42, 2.44, 96]} />
        </mesh>
      </group>

      {/* Warm atmospheric halo behind the figure */}
      <sprite position={[0, 4.6, -4.5]} scale={[13, 13, 1]} material={haloMaterial} />
    </>
  );
}
