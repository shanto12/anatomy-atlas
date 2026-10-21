import { Canvas } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';

import type { BodyViewerProps } from './BodyViewer';
import ViewerScene from './ViewerScene';

export interface ViewerCanvasProps extends BodyViewerProps {
  reducedMotion: boolean;
  onContextLost: () => void;
}

/**
 * The actual react-three-fiber canvas. It is code-split away from `BodyViewer` so three.js
 * never blocks first paint. All picking and camera work happens below this component.
 */
export default function ViewerCanvas({
  reducedMotion,
  onContextLost,
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
}: ViewerCanvasProps) {
  const lastPick = useRef(0);
  const handleSelect = useCallback(
    (organId: string | null) => {
      if (organId) lastPick.current = performance.now();
      onSelectOrgan?.(organId);
    },
    [onSelectOrgan],
  );

  return (
    <Canvas
      className="viewer-canvas"
      style={{ background: 'transparent' }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 32, near: 0.1, far: 90, position: [1.6, 4.8, 15.4] }}
      onPointerMissed={() => {
        // Deselect on a genuine background click, but never right after a pick.
        if (!interactive) return;
        if (performance.now() - lastPick.current < 300) return;
        onSelectOrgan?.(null);
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.06;
        const el = gl.domElement;
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', 'Interactive 3D human body. Drag to rotate, scroll to zoom, click an organ.');
        el.style.touchAction = 'none';

        el.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            onContextLost();
          },
          false,
        );
      }}
    >
      <ViewerScene
        variant={variant}
        activeSystems={activeSystems}
        selectedOrganId={selectedOrganId}
        onSelectOrgan={handleSelect}
        showSkin={showSkin}
        showSkeleton={showSkeleton}
        showLabels={showLabels}
        autoRotate={autoRotate}
        interactive={interactive}
        controls={controls}
        resetSignal={resetSignal}
        focusOrganId={focusOrganId}
        focusSignal={focusSignal}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
