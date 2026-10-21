import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { ORGAN_BY_ID } from '@/viewer/anatomy';
import { createFalloffTexture, getOrganFocus, getOrganRadius } from '@/viewer/geometry';
import { createGlowSpriteMaterial } from '@/viewer/materials';

interface SelectedGlowProps {
  selectedOrganId: string | null;
}

/**
 * A soft additive halo and a tinted point light at the selected organ, so the choice reads
 * from across the room even before the label catches the eye.
 */
export default function SelectedGlow({ selectedOrganId }: SelectedGlowProps) {
  const placement = selectedOrganId ? ORGAN_BY_ID[selectedOrganId] : undefined;
  const texture = useMemo(() => createFalloffTexture(), []);
  const color = placement?.color ?? '#b23a4a';
  const material = useMemo(() => createGlowSpriteMaterial(color, texture, 0.5), [color, texture]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture],
  );

  if (!placement || !selectedOrganId) return null;

  const focus = getOrganFocus(selectedOrganId) ?? placement.at;
  const isLayerOrgan = (placement.layer ?? 'organs') !== 'organs';
  const radius = isLayerOrgan ? (placement.focusDist ?? 4) * 0.18 : getOrganRadius(selectedOrganId);
  const size = THREE.MathUtils.clamp(radius * 3.4, 0.45, 2.6);

  return (
    <group>
      <sprite position={focus} scale={[size, size, 1]} material={material} renderOrder={8} />
      <pointLight position={focus} color={placement.color} intensity={5.5} distance={3.4} decay={2} />
    </group>
  );
}
