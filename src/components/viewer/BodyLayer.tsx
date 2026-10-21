import { useEffect, useMemo } from 'react';

import { getBodyGeometry, getFatGeometry } from '@/viewer/geometry';
import { createFatMaterial, createRimMaterial, createSkinMaterial } from '@/viewer/materials';

interface BodyLayerProps {
  showSkin: boolean;
  opacity: number;
  skinInteractive: boolean;
  fatVisible: boolean;
  selectedOrganId: string | null;
  hoveredId: string | null;
  onHover?: (organId: string | null) => void;
  onSelect?: (organId: string) => void;
}

/**
 * The ivory mannequin: one merged skin mesh, a fresnel rim for the glassy silhouette, and a
 * translucent subcutaneous-fat shell that belongs to the integumentary system.
 */
export default function BodyLayer({
  showSkin,
  opacity,
  skinInteractive,
  fatVisible,
  selectedOrganId,
  hoveredId,
  onHover,
  onSelect,
}: BodyLayerProps) {
  const geometry = useMemo(() => getBodyGeometry(), []);
  const fatGeometry = useMemo(() => getFatGeometry(), []);
  const skinMaterial = useMemo(() => createSkinMaterial(), []);
  const rimMaterial = useMemo(() => createRimMaterial(), []);
  const fatMaterial = useMemo(() => createFatMaterial(), []);

  useEffect(() => {
    skinMaterial.opacity = opacity;
    skinMaterial.depthWrite = opacity > 0.45;
    skinMaterial.needsUpdate = true;
  }, [skinMaterial, opacity]);

  useEffect(
    () => () => {
      skinMaterial.dispose();
      rimMaterial.dispose();
      fatMaterial.dispose();
    },
    [skinMaterial, rimMaterial, fatMaterial],
  );

  const skinSelected = selectedOrganId === 'skin';
  const skinActive = skinSelected || hoveredId === 'skin';
  useEffect(() => {
    skinMaterial.emissive.set(skinActive ? '#e0b184' : '#000000');
    skinMaterial.emissiveIntensity = skinSelected ? 0.42 : skinActive ? 0.22 : 0;
  }, [skinMaterial, skinActive, skinSelected]);

  const fatSelected = selectedOrganId === 'subcutaneous-fat';
  const fatActive = fatSelected || hoveredId === 'subcutaneous-fat';
  useEffect(() => {
    fatMaterial.emissiveIntensity = fatSelected ? 0.45 : fatActive ? 0.22 : 0.05;
    fatMaterial.opacity = fatActive ? 0.3 : 0.16;
  }, [fatMaterial, fatActive, fatSelected]);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  const handlers = skinInteractive
    ? {
        onPointerOver: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onHover?.('skin');
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onHover?.(null);
          document.body.style.cursor = '';
        },
        onClick: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onSelect?.('skin');
        },
      }
    : {};

  return (
    <group>
      {fatVisible ? <mesh geometry={fatGeometry} material={fatMaterial} renderOrder={5} /> : null}
      {showSkin && opacity > 0.015 ? (
        <>
          <mesh geometry={geometry} material={skinMaterial} renderOrder={6} {...handlers} />
          <mesh geometry={geometry} material={rimMaterial} renderOrder={7} scale={1.002} />
        </>
      ) : null}
    </group>
  );
}
