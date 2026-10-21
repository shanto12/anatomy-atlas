import { Link, useParams } from 'react-router-dom';

import { getSystem } from '@/data';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function SystemPage() {
  const { systemId } = useParams();
  const system = getSystem(systemId);

  usePageMeta({
    title: system ? system.name : 'System not found',
    description: system?.tagline ?? 'Explore the systems of the human body.',
    path: `/systems/${systemId ?? ''}`,
    noindex: !system,
  });

  if (!system) return <NotFoundPage />;

  return (
    <div className="container section">
      <p className="eyebrow">{system.shortName}</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        {system.name}
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        {system.tagline}
      </p>
      <div className="cluster" style={{ marginTop: 24 }}>
        <Link className="btn btn--primary" to={`/learn/${system.lesson.id}`}>
          Take the lesson
        </Link>
        <Link className="btn btn--ghost" to={`/quiz/${system.id}`}>
          Quiz me
        </Link>
      </div>
      <p style={{ marginTop: 32, whiteSpace: 'pre-line', maxWidth: '70ch' }}>{system.summary}</p>

      <h2 className="h2" style={{ marginTop: 64 }}>
        Structures
      </h2>
      <div className="organ-grid" style={{ marginTop: 24 }}>
        {system.organs.map((organ) => (
          <Link key={organ.id} to={`/organs/${organ.id}`} className="organ-card">
            <h3>{organ.name}</h3>
            <p>{organ.tagline}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
