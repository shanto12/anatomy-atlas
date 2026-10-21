import { memo, useEffect, useMemo } from 'react';

import { ORGAN_MESHES } from '@/viewer/anatomy';
import { getOrganGeometry } from '@/viewer/geometry';
import { createOrganMaterial, setOrganHighlight } from '@/viewer/materials';
import type { OrganPlacement } from '@/viewer/types';

interface OrganLayerProps {
  activeSystems: string[] | null;
  selectedOrganId: string | null;
  hoveredId: string | null;
  interactive: boolean;
  /** Organ that should stay at full strength while everything else recedes. */
  focusOrganId?: string | null;
  /** When every system is on, muscles are veiled so internal organs stay readable. */
  muteMuscles?: boolean;
  onHover?: (organId: string | null) => void;
  onSelect?: (organId: string) => void;
}

interface OrganMeshProps {
  placement: OrganPlacement;
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  muted: boolean;
  mutedOpacity: number;
  onHover?: (organId: string | null) => void;
  onSelect?: (organId: string) => void;
}

const OrganMesh = memo(function OrganMesh({
  placement,
  selected,
  hovered,
  interactive,
  muted,
  mutedOpacity,
  onHover,
  onSelect,
}: OrganMeshProps) {
  const geometry = useMemo(() => getOrganGeometry(placement.id), [placement.id]);
  const material = useMemo(
    () =>
      createOrganMaterial(placement.color, {
        roughness: placement.roughness ?? (muted ? 0.64 : undefined),
        translucent: placement.translucent ?? (muted ? mutedOpacity : undefined),
        glow: muted ? 0.02 : placement.glow,
      }),
    [placement, muted, mutedOpacity],
  );

  useEffect(() => () => material.dispose(), [material]);

  const state = selected ? 'selected' : hovered ? 'hover' : 'idle';
  useEffect(() => {
    setOrganHighlight(material, state);
  }, [material, state]);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );

  const handlers = interactive
    ? {
        onPointerOver: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onHover?.(placement.id);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onHover?.(null);
          document.body.style.cursor = '';
        },
        onClick: (event: { stopPropagation: () => void }) => {
          event.stopPropagation();
          onSelect?.(placement.id);
        },
      }
    : {};

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={placement.translucent ? 2 : 1}
      {...handlers}
    />
  );
});

/**
 * One mesh per organ: all 95 representations, filtered by the active systems.
 * The selected organ is always drawn, even if its system is currently filtered out.
 */
export default function OrganLayer({
  activeSystems,
  selectedOrganId,
  hoveredId,
  interactive,
  focusOrganId = null,
  muteMuscles = false,
  onHover,
  onSelect,
}: OrganLayerProps) {
  const visible = useMemo(() => {
    if (!activeSystems || activeSystems.length === 0) return ORGAN_MESHES;
    return ORGAN_MESHES.filter(
      (placement) =>
        activeSystems.includes(placement.systemId) ||
        placement.id === selectedOrganId ||
        placement.id === hoveredId,
    );
  }, [activeSystems, selectedOrganId, hoveredId]);

  return (
    <group>
      {visible.map((placement) => (
        <OrganMesh
          key={placement.id}
          placement={placement}
          selected={placement.id === selectedOrganId}
          hovered={placement.id === hoveredId}
          interactive={interactive}
          muted={
            (Boolean(focusOrganId) && placement.id !== focusOrganId) ||
            (muteMuscles && placement.systemId === 'muscular' && placement.id !== selectedOrganId)
          }
          mutedOpacity={focusOrganId ? 0.26 : 0.46}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
