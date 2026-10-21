import { Component, lazy, Suspense, useState, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Box, Loader2 } from 'lucide-react';

import type { Organ } from '@/lib/types';

const BodyViewer = lazy(() => import('@/components/viewer/BodyViewer'));

class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D specimen unavailable:', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="organ-specimen__fallback" role="status">
          The 3D view could not load here. The written entry below covers the same ground.
        </p>
      );
    }
    return this.props.children;
  }
}

export interface OrganSpecimenProps {
  organ: Organ;
  className?: string;
}

/**
 * An optional, deliberately lazy 3D close-up of the organ a lesson step is about.
 * The reader stays text-first: the viewer is a disclosure, not a requirement.
 */
export default function OrganSpecimen({ organ, className }: OrganSpecimenProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`organ-specimen ${className ?? ''}`} aria-label={`${organ.name} in the 3D body`}>
      <p className="caps organ-specimen__caps">The organ in question</p>
      <h3 className="organ-specimen__name">{organ.name}</h3>
      <p className="organ-specimen__tagline">{organ.tagline}</p>

      <button
        type="button"
        className="btn btn--ghost btn--sm organ-specimen__toggle"
        aria-expanded={open}
        aria-controls="organ-specimen-stage"
        onClick={() => setOpen((value) => !value)}
      >
        <Box size={15} aria-hidden="true" />
        {open ? 'Hide 3D view' : 'Show it in 3D'}
      </button>

      {open ? (
        <div id="organ-specimen-stage" className="organ-specimen__stage">
          <ViewerBoundary>
            <Suspense
              fallback={
                <p className="organ-specimen__loading" role="status">
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                  Loading the 3D body…
                </p>
              }
            >
              <BodyViewer
                variant="organ"
                focusOrganId={organ.id}
                focusSignal={1}
                selectedOrganId={organ.id}
                interactive
                controls={false}
                showLabels={false}
                className="organ-specimen__viewer"
              />
            </Suspense>
          </ViewerBoundary>
        </div>
      ) : null}

      <Link to={`/organs/${organ.id}`} className="text-link organ-specimen__link">
        Read the full {organ.name} entry
      </Link>
    </aside>
  );
}
