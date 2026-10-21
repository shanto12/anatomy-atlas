import { Link } from 'react-router-dom';

import { usePageMeta } from '@/lib/seo';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'This page could not be found. Return to the Anatomy Atlas body explorer.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="container section" style={{ textAlign: 'center' }}>
      <p className="eyebrow eyebrow--plain">404</p>
      <h1 className="display" style={{ marginTop: 16 }}>
        This part is not in the atlas.
      </h1>
      <p className="lede" style={{ margin: '20px auto 0' }}>
        The page you followed does not exist. The body, however, is still here.
      </p>
      <div className="cluster" style={{ justifyContent: 'center', marginTop: 32 }}>
        <Link className="btn btn--primary" to="/explore">
          Open the explorer
        </Link>
        <Link className="btn btn--ghost" to="/">
          Back home
        </Link>
      </div>
    </div>
  );
}
