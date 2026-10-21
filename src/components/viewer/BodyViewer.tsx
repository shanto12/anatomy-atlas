import type { SystemId } from '@/lib/types';

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

/**
 * Interactive 3D human body viewer. Owned by viewer-dev.
 * This placeholder is replaced by a React Three Fiber implementation with the same public props.
 */
export default function BodyViewer({
  className,
  variant = 'hero',
  selectedOrganId,
  onSelectOrgan,
  interactive = true,
  autoRotate = false,
}: BodyViewerProps) {
  return (
    <div className={`viewer-shell viewer-shell--${variant} ${className ?? ''}`}>
      <div className="viewer-fallback" role="img" aria-label="Interactive 3D human body viewer">
        <div className="viewer-fallback__body" />
        <p className="viewer-fallback__note">
          {interactive ? 'Drag to rotate · Scroll to zoom' : '3D anatomy viewer'}
        </p>
        {selectedOrganId ? <span className="viewer-fallback__badge">{selectedOrganId}</span> : null}
        {onSelectOrgan ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSelectOrgan('heart')}>
            Preview selection
          </button>
        ) : null}
      </div>
      {autoRotate ? <span className="viewer-fallback__hint">auto-rotating</span> : null}
    </div>
  );
}
