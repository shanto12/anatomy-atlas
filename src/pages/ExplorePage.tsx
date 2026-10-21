import BodyViewer from '@/components/viewer/BodyViewer';
import { usePageMeta } from '@/lib/seo';

export default function ExplorePage() {
  usePageMeta({
    title: 'Body Explorer',
    description: 'Rotate, zoom, and click through a 3D human body. Explore every organ and body system.',
    path: '/explore',
  });

  return (
    <div className="explore-page">
      <div className="explore-stage">
        <BodyViewer variant="explore" interactive controls autoRotate />
      </div>
      <aside className="explore-panel">
        <p className="eyebrow">Body explorer</p>
        <h1 className="h2" style={{ marginTop: 12 }}>
          The whole body, one click at a time.
        </h1>
        <p className="small" style={{ marginTop: 12 }}>
          The full explorer — system layers, organ search, zoom controls and deep-linked organ panels — is being
          assembled.
        </p>
      </aside>
    </div>
  );
}
