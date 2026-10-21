import { CATALOG_ORGANS, CATALOG_ORGANS_BY_SYSTEM } from '@/viewer/catalog';
import type { SystemId } from '@/lib/types';
import type { BodyViewerProps } from './BodyViewer';

interface ViewerFallbackProps {
  status: 'loading' | 'unsupported' | 'error';
  variant: NonNullable<BodyViewerProps['variant']>;
  activeSystems?: SystemId[] | null;
  selectedOrganId?: string | null;
  onSelectOrgan?: (organId: string | null) => void;
  interactive?: boolean;
}

const STATUS_COPY: Record<ViewerFallbackProps['status'], { title: string; note: string }> = {
  loading: {
    title: 'Preparing the anatomy theatre',
    note: 'Building the body, one system at a time.',
  },
  unsupported: {
    title: 'The 3D body needs WebGL',
    note: 'Your browser could not start a WebGL canvas. Every structure is still listed below and in the explorer.',
  },
  error: {
    title: 'The 3D stage went dark',
    note: 'The graphics context was lost. You can keep exploring from the organ list below.',
  },
};

/**
 * Graceful text fallback for the 3D stage. It is a real, operable list of organs — not a
 * decorative placeholder — so the explorer still works without WebGL.
 */
export default function ViewerFallback({
  status,
  activeSystems = null,
  selectedOrganId = null,
  onSelectOrgan,
  interactive = true,
}: ViewerFallbackProps) {
  const copy = STATUS_COPY[status];
  const organs = activeSystems && activeSystems.length > 0
    ? activeSystems.flatMap((id) => CATALOG_ORGANS_BY_SYSTEM[id] ?? [])
    : CATALOG_ORGANS;
  const visible = organs.slice(0, status === 'loading' ? 0 : 12);
  const isLoading = status === 'loading';

  return (
    <div className={`viewer-fallback viewer-fallback--${status}`}>
      <div className="viewer-fallback__figure" aria-hidden="true">
        <span className="viewer-fallback__head" />
        <span className="viewer-fallback__torso" />
        <span className="viewer-fallback__limb viewer-fallback__limb--arm-l" />
        <span className="viewer-fallback__limb viewer-fallback__limb--arm-r" />
        <span className="viewer-fallback__limb viewer-fallback__limb--leg-l" />
        <span className="viewer-fallback__limb viewer-fallback__limb--leg-r" />
        <span className="viewer-fallback__heart" />
      </div>

      <div className="viewer-fallback__copy">
        <p className={`viewer-fallback__title${isLoading ? ' is-loading' : ''}`}>{copy.title}</p>
        {!isLoading ? <p className="viewer-fallback__note">{copy.note}</p> : null}
      </div>

      {visible.length > 0 && onSelectOrgan && interactive ? (
        <div className="viewer-fallback__list-wrap">
          <p className="viewer-fallback__list-label">Browse by name</p>
          <ul className="viewer-fallback__list">
            {visible.map((organ) => (
              <li key={organ.id}>
                <button
                  type="button"
                  className={`viewer-fallback__organ${organ.id === selectedOrganId ? ' is-selected' : ''}`}
                  onClick={() => onSelectOrgan(organ.id)}
                  aria-pressed={organ.id === selectedOrganId}
                >
                  <span className="viewer-fallback__dot" style={{ background: organ.systemColor }} aria-hidden="true" />
                  {organ.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="viewer-fallback__hint">
        {isLoading ? 'One moment…' : 'Rotate and zoom come back when WebGL is available.'}
      </p>
    </div>
  );
}
