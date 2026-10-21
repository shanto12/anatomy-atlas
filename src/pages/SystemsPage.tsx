import { Link } from 'react-router-dom';

import { systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function SystemsPage() {
  usePageMeta({
    title: 'Body Systems',
    description: 'Browse all twelve systems of the human body and the organs that make them work.',
    path: '/systems',
  });

  return (
    <div className="container section">
      <p className="eyebrow">Reference</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        Body systems
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        The body is not a pile of parts. It is a set of cooperating systems. Start with one and follow the connections.
      </p>
      <div className="system-grid" style={{ marginTop: 48 }}>
        {systems.map((system) => (
          <Link key={system.id} to={`/systems/${system.id}`} className="system-card" style={{ ['--sys' as string]: system.color }}>
            <span className="system-card__dot" />
            <h2 className="h3">{system.name}</h2>
            <p>{system.tagline}</p>
            <span className="system-card__meta">{system.organs.length} structures</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
