import { Link, useParams } from 'react-router-dom';

import { getOrgan, getRelatedOrgans, getSystemForOrgan } from '@/data';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function OrganPage() {
  const { organId } = useParams();
  const organ = getOrgan(organId);
  const system = organ ? getSystemForOrgan(organ) : undefined;

  usePageMeta({
    title: organ ? organ.name : 'Organ not found',
    description: organ?.tagline ?? 'Explore the organs of the human body.',
    path: `/organs/${organId ?? ''}`,
    noindex: !organ,
  });

  if (!organ) return <NotFoundPage />;

  return (
    <div className="container section">
      <p className="eyebrow">{system?.name ?? 'Anatomy'}</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        {organ.name}
      </h1>
      {organ.latin ? <p className="serif" style={{ fontStyle: 'italic', marginTop: 8 }}>{organ.latin}</p> : null}
      <p className="lede" style={{ marginTop: 20 }}>
        {organ.tagline}
      </p>
      <p style={{ marginTop: 32, whiteSpace: 'pre-line', maxWidth: '70ch' }}>{organ.summary}</p>

      <div className="organ-facts" style={{ marginTop: 40 }}>
        <div>
          <p className="caps">Location</p>
          <p>{organ.location}</p>
        </div>
        <div>
          <p className="caps">Size</p>
          <p>{organ.size}</p>
        </div>
      </div>

      <h2 className="h2" style={{ marginTop: 64 }}>
        What it does
      </h2>
      <ul className="function-list">
        {organ.functions.map((fn) => (
          <li key={fn.title}>
            <strong>{fn.title}.</strong> {fn.detail}
          </li>
        ))}
      </ul>

      <h2 className="h2" style={{ marginTop: 64 }}>
        Did you know?
      </h2>
      <ul className="function-list">
        {organ.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>

      <h2 className="h2" style={{ marginTop: 64 }}>
        Related
      </h2>
      <div className="organ-grid">
        {getRelatedOrgans(organ).map((rel) => (
          <Link key={rel.id} to={`/organs/${rel.id}`} className="organ-card">
            <h3>{rel.name}</h3>
            <p>{rel.tagline}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
