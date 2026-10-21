import clsx from 'clsx';
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';

import type { SystemId } from '@/lib/types';
import { useReducedMotion } from '@/viewer/useReducedMotion';
import { detectWebGL } from '@/viewer/webgl';

import ViewerFallback from './ViewerFallback';

const ViewerCanvas = lazy(() => import('./ViewerCanvas'));

export interface BodyViewerProps {
  variant?: 'hero' | 'explore' | 'organ' | 'system';
  /** Systems to illuminate. null/undefined = all systems. */
  activeSystems?: SystemId[] | null;
  selectedOrganId?: string | null;
  onSelectOrgan?: (organId: string | null) => void;
  showSkin?: boolean;
  showSkeleton?: boolean;
  showLabels?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  controls?: boolean;
  className?: string;
  /** Increment to reset the camera to the default view. */
  resetSignal?: number;
  /** Organ id that should become the camera focus target. */
  focusOrganId?: string | null;
  /** Increment to request camera focus on focusOrganId. */
  focusSignal?: number;
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** Catches WebGL / renderer failures and swaps in the text fallback instead of a blank stage. */
class CanvasErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Anatomy Atlas 3D viewer fell back to its text mode:', error.message);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Interactive 3D human body. Owned by viewer-dev.
 *
 * The three.js scene is loaded lazily so the rest of the page can paint first. If WebGL is
 * unavailable (or the GPU context is lost) the component degrades to an accessible silhouette
 * and a list of the organs in the active systems.
 */
export default function BodyViewer({
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
  className,
  resetSignal = 0,
  focusOrganId = null,
  focusSignal = 0,
}: BodyViewerProps) {
  const reducedMotion = useReducedMotion();
  const [supported, setSupported] = useState<boolean>(() => detectWebGL());
  const [contextLost, setContextLost] = useState(false);

  // Re-check once mounted (some browsers need a moment before the GPU is ready).
  useEffect(() => {
    if (!supported) setSupported(detectWebGL());
  }, [supported]);

  const failed = !supported || contextLost;

  const fallback = (
    <ViewerFallback
      status={contextLost ? 'error' : 'unsupported'}
      variant={variant}
      activeSystems={activeSystems}
      selectedOrganId={selectedOrganId}
      onSelectOrgan={onSelectOrgan}
      interactive={interactive}
    />
  );

  return (
    <div
      className={clsx('viewer-shell', `viewer-shell--${variant}`, failed && 'is-fallback', className)}
      data-variant={variant}
      data-webgl={failed ? 'unavailable' : 'ready'}
    >
      {failed ? (
        fallback
      ) : (
        <CanvasErrorBoundary fallback={fallback}>
          <Suspense
            fallback={
              <ViewerFallback
                status="loading"
                variant={variant}
                activeSystems={activeSystems}
                selectedOrganId={selectedOrganId}
                interactive={false}
              />
            }
          >
            <ViewerCanvas
              variant={variant}
              activeSystems={activeSystems}
              selectedOrganId={selectedOrganId}
              onSelectOrgan={onSelectOrgan}
              showSkin={showSkin}
              showSkeleton={showSkeleton}
              showLabels={showLabels}
              autoRotate={autoRotate && !reducedMotion}
              interactive={interactive}
              controls={controls}
              resetSignal={resetSignal}
              focusOrganId={focusOrganId}
              focusSignal={focusSignal}
              reducedMotion={reducedMotion}
              onContextLost={() => setContextLost(true)}
            />
          </Suspense>
        </CanvasErrorBoundary>
      )}

      {!failed ? (
        <>
          <div className="viewer-vignette" aria-hidden="true" />
          <span className="visually-hidden">
            Interactive 3D human body. Use the organ list to explore every structure by name.
          </span>
        </>
      ) : null}
    </div>
  );
}
