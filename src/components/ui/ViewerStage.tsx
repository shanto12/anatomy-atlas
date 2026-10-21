import { Component, Suspense, lazy, type ReactNode } from 'react';
import clsx from 'clsx';

import type { BodyViewerProps } from '@/components/viewer/BodyViewer';
import Skeleton from './Skeleton';

/**
 * The viewer is a heavy three.js module; load it on demand so the rest of the
 * page paints immediately. The stage keeps its final dimensions while loading,
 * so there is no layout shift.
 */
const LazyBodyViewer = lazy(() => import('@/components/viewer/BodyViewer'));

interface StageBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  fallback: ReactNode;
}

class StageBoundary extends Component<StageBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Anatomy Atlas 3D stage failed:', error);
  }

  componentDidUpdate(prevProps: StageBoundaryProps) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function StageLoading({ label }: { label: string }) {
  return (
    <div className="stage__loading" role="status" aria-live="polite">
      <div className="stage__loading-figure" aria-hidden="true">
        <Skeleton width={128} height={250} className="stage__loading-silhouette" />
      </div>
      <div className="stage__loading-lines" aria-hidden="true">
        <Skeleton width={120} height={8} />
        <Skeleton width={76} height={8} />
      </div>
      <p className="stage__loading-label">{label}</p>
    </div>
  );
}

function StageUnavailable() {
  return (
    <div className="stage__error" role="alert">
      <p className="stage__error-title">The 3D model could not load.</p>
      <p className="stage__error-copy">
        This device may not support WebGL. Every structure is still listed in text below, so you can keep reading.
      </p>
    </div>
  );
}

export interface ViewerStageProps extends Omit<BodyViewerProps, 'className'> {
  /** Small museum plate in the stage corner. */
  plate?: { eyebrow?: string; title: string; meta?: string };
  /** Figure number, e.g. "Fig. 02". */
  figure?: string;
  caption?: ReactNode;
  actions?: ReactNode;
  /** Optional badge in the top-right corner (e.g. a LIVE dot). */
  topRight?: ReactNode;
  className?: string;
  viewerClassName?: string;
  /** Changing this key resets a failed stage (e.g. when navigating organ to organ). */
  resetKey?: string;
  fallback?: ReactNode;
  loadingLabel?: string;
}

/** Dark “anatomy theatre” frame around the 3D body, with loading + failure states. */
export default function ViewerStage(props: ViewerStageProps) {
  const {
    plate,
    figure,
    caption,
    actions,
    topRight,
    className,
    viewerClassName,
    resetKey,
    fallback,
    loadingLabel = 'Preparing the specimen…',
    variant = 'hero',
    ...viewerProps
  } = props;

  return (
    <div className={clsx('stage', `stage--${variant}`, className)}>
      <span className="stage__aura" aria-hidden="true" />
      <span className="stage__grid" aria-hidden="true" />
      <span className="stage__corners" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {figure ? (
        <span className="stage__figure" aria-hidden="true">
          {figure}
        </span>
      ) : null}
      {plate ? (
        <div className="stage__plate">
          {plate.eyebrow ? <p className="stage__plate-eyebrow">{plate.eyebrow}</p> : null}
          <p className="stage__plate-title">{plate.title}</p>
          {plate.meta ? <p className="stage__plate-meta">{plate.meta}</p> : null}
        </div>
      ) : null}
      {topRight ? <div className="stage__topright">{topRight}</div> : null}

      <div className="stage__viewer">
        <StageBoundary resetKey={resetKey} fallback={fallback ?? <StageUnavailable />}>
          <Suspense fallback={<StageLoading label={loadingLabel} />}>
            <LazyBodyViewer {...viewerProps} variant={variant} className={viewerClassName} />
          </Suspense>
        </StageBoundary>
      </div>

      {caption || actions ? (
        <div className="stage__foot">
          {caption ? <p className="stage__caption">{caption}</p> : null}
          {actions ? <div className="stage__actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
