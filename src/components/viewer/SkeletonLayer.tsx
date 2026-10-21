import { memo, useEffect, useMemo } from 'react';

import { getSkeletonMeshes } from '@/viewer/geometry';
import { createBoneMaterial, setBoneHighlight } from '@/viewer/materials';

interface SkeletonLayerProps {
  selectedOrganId: string | null;
  hoveredId: string | null;
  interactive: boolean;
  /** True while a non-skeletal organ is the focus: bones recede so it stays readable. */
  dimmed?: boolean;
  onHover?: (organId: string | null) => void;
  onSelect?: (organId: string) => void;
}

interface BoneMeshProps {
  organId: string | null;
  color: string;
  geometry: ReturnType<typeof getSkeletonMeshes>[number]['geometry'];
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  dimmed: boolean;
  onHover?: (organId: string | null) => void;
  onSelect?: (organId: string) => void;
}

const BoneMesh = memo(function BoneMesh({
  organId,
  color,
  geometry,
  selected,
  hovered,
  interactive,
  dimmed,
  onHover,
  onSelect,
}: BoneMeshProps) {
  const material = useMemo(() => {
    const bone = createBoneMaterial(color);
    if (dimmed) {
      bone.transparent = true;
      bone.opacity = 0.32;
      bone.depthWrite = false;
    }
    return bone;
  }, [color, dimmed]);
  useEffect(() => () => material.dispose(), [material]);

  const state = selected ? 'selected' : hovered ? 'hover' : 'idle';
  useEffect(() => {
    setBoneHighlight(material, state);
  }, [material, state]);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  const handlers =
    interactive && organId
      ? {
          onPointerOver: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onHover?.(organId);
            document.body.style.cursor = 'pointer';
          },
          onPointerOut: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onHover?.(null);
            document.body.style.cursor = '';
          },
          onClick: (event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onSelect?.(organId);
          },
        }
      : {};

  return <mesh geometry={geometry} material={material} {...handlers} />;
});

/** Ivory bone rig. Each group is one pickable organ (skull, femur, ribcage, …). */
export default function SkeletonLayer({
  selectedOrganId,
  hoveredId,
  interactive,
  dimmed = false,
  onHover,
  onSelect,
}: SkeletonLayerProps) {
  const meshes = useMemo(() => getSkeletonMeshes(), []);
  return (
    <group>
      {meshes.map((spec) => (
        <BoneMesh
          key={spec.organId ?? 'extra-bones'}
          organId={spec.organId}
          color={spec.color}
          geometry={spec.geometry}
          selected={Boolean(spec.organId && spec.organId === selectedOrganId)}
          hovered={Boolean(spec.organId && spec.organId === hoveredId)}
          interactive={interactive}
          dimmed={dimmed}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
