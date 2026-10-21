import { useEffect, useState } from 'react';

import { getPlacement } from '@/viewer/anatomy';

import type { BodyViewerProps } from './BodyViewer';
import BodyLayer from './BodyLayer';
import CameraRig from './CameraRig';
import OrganLayer from './OrganLayer';
import SelectedGlow from './SelectedGlow';
import SkeletonLayer from './SkeletonLayer';
import StageEnvironment from './StageEnvironment';
import ViewerLabels from './ViewerLabels';

export interface ViewerSceneProps extends BodyViewerProps {
  reducedMotion: boolean;
}

/** Skin opacity is context-sensitive: nearly clear over internal systems, solid for skin. */
function skinOpacityFor(
  variant: NonNullable<BodyViewerProps['variant']>,
  activeSystems: BodyViewerProps['activeSystems'],
  selectedOrganId: BodyViewerProps['selectedOrganId'],
  showSkin: boolean,
): number {
  if (!showSkin) return 0;
  if (selectedOrganId === 'skin') return 0.55;
  if (selectedOrganId) return variant === 'organ' ? 0.035 : 0.085;
  if (!activeSystems || activeSystems.length === 0) return variant === 'hero' ? 0.24 : 0.2;
  if (activeSystems.includes('integumentary')) return 0.62;
  if (activeSystems.length === 1 && activeSystems[0] === 'skeletal') return 0.07;
  return 0.1;
}

export default function ViewerScene({
  variant = 'hero',
  activeSystems = null,
  selectedOrganId = null,
  onSelectOrgan,
  showSkin = true,
  showSkeleton = true,
  showLabels = false,
  autoRotate = false,
  interactive = true,
  controls = true,
  resetSignal = 0,
  focusOrganId = null,
  focusSignal = 0,
  reducedMotion,
}: ViewerSceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setHoveredId(null);
  }, [activeSystems]);

  const selectedPlacement = selectedOrganId ? getPlacement(selectedOrganId) : undefined;
  // The organ page shows only the selected organ's system, with a nearly invisible wrapper.
  const effectiveSystems =
    variant === 'organ' && selectedPlacement ? [selectedPlacement.systemId] : activeSystems;
  const selectedIsSkeletal = selectedPlacement?.systemId === 'skeletal';
  const skeletonVisible =
    variant === 'organ'
      ? Boolean(showSkeleton && selectedIsSkeletal)
      : showSkeleton || !effectiveSystems || effectiveSystems.includes('skeletal');
  const skinOpacity = skinOpacityFor(variant, effectiveSystems, selectedOrganId, showSkin);
  const skinInteractive = Boolean(
    interactive && onSelectOrgan && effectiveSystems && effectiveSystems.includes('integumentary'),
  );
  const fatVisible = Boolean(effectiveSystems && effectiveSystems.includes('integumentary'));
  const pointerInteractive = Boolean(interactive && onSelectOrgan);

  const handleSelect = onSelectOrgan
    ? (organId: string | null) => {
        setHoveredId(null);
        onSelectOrgan(organId);
      }
    : undefined;

  return (
    <>
      <StageEnvironment variant={variant} />

      <CameraRig
        variant={variant}
        autoRotate={autoRotate}
        interactive={interactive}
        controls={controls}
        resetSignal={resetSignal}
        focusOrganId={focusOrganId}
        focusSignal={focusSignal}
        selectedOrganId={selectedOrganId}
        reducedMotion={reducedMotion}
      />

      <BodyLayer
        showSkin={showSkin}
        opacity={skinOpacity}
        skinInteractive={skinInteractive}
        fatVisible={fatVisible}
        selectedOrganId={selectedOrganId}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        onSelect={handleSelect}
      />

      {skeletonVisible ? (
        <SkeletonLayer
          selectedOrganId={selectedOrganId}
          hoveredId={hoveredId}
          interactive={pointerInteractive}
          dimmed={Boolean(selectedOrganId && !selectedIsSkeletal && variant !== 'organ')}
          onHover={setHoveredId}
          onSelect={handleSelect}
        />
      ) : null}

      <OrganLayer
        activeSystems={effectiveSystems}
        focusOrganId={selectedOrganId}
        muteMuscles={!effectiveSystems || effectiveSystems.length === 0}
        selectedOrganId={selectedOrganId}
        hoveredId={hoveredId}
        interactive={pointerInteractive}
        onHover={setHoveredId}
        onSelect={handleSelect}
      />

      <SelectedGlow selectedOrganId={selectedOrganId} />

      <ViewerLabels
        activeSystems={activeSystems}
        selectedOrganId={selectedOrganId}
        hoveredId={hoveredId}
        showLabels={showLabels}
      />
    </>
  );
}
