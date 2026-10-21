import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import BodyViewer from '@/components/viewer/BodyViewer';
import { siteStats, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function HomePage() {
  usePageMeta({
    title: 'Anatomy Atlas — Explore the Human Body in 3D',
    description:
      'A free interactive 3D atlas of the human body. Rotate, zoom, and explore every organ and body system, then learn with guided lessons and quizzes.',
    path: '/',
  });

  return (
    <>
      <section className="home-hero container">
        <div className="home-hero__copy">
          <p className="eyebrow">The human body, up close</p>
          <h1 className="display">
            Every part of you, <em>explained</em>.
          </h1>
          <p className="lede">
            Rotate a living map of the body. Zoom into an organ. Follow the systems that keep you alive — then test
            what you have learned.
          </p>
          <div className="cluster" style={{ marginTop: 32 }}>
            <Link className="btn btn--primary" to="/explore">
              Open the body explorer <ArrowRight size={16} />
            </Link>
            <Link className="btn btn--ghost" to="/learn">
              Start a guided lesson
            </Link>
          </div>
          <dl className="home-stats">
            <div>
              <dt>Body systems</dt>
              <dd>{siteStats.systemCount || 12}</dd>
            </div>
            <div>
              <dt>Organs & structures</dt>
              <dd>{siteStats.organCount || '—'}</dd>
            </div>
            <div>
              <dt>Guided lessons</dt>
              <dd>{siteStats.lessonCount || 12}</dd>
            </div>
          </dl>
        </div>
        <div className="home-hero__stage">
          <BodyViewer variant="hero" autoRotate interactive />
          <p className="home-hero__caption">Drag to rotate · Scroll to zoom · Click an organ</p>
        </div>
      </section>

      <section className="section container">
        <p className="eyebrow">Twelve systems, one body</p>
        <h2 className="h2" style={{ marginTop: 16, maxWidth: '18ch' }}>
          Wander from bone to breath.
        </h2>
        <div className="system-grid">
          {systems.map((system) => (
            <Link key={system.id} to={`/systems/${system.id}`} className="system-card" style={{ ['--sys' as string]: system.color }}>
              <span className="system-card__dot" />
              <h3>{system.name}</h3>
              <p>{system.tagline}</p>
              <span className="system-card__meta">{system.organs.length} structures</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="home-cta">
          <div>
            <p className="eyebrow">Learn by doing</p>
            <h2 className="h2">Understand it. Then prove it.</h2>
            <p className="lede">
              Short, illustrated lessons walk you through each system. Quizzes check what stuck — and explain every
              answer.
            </p>
          </div>
          <div className="cluster">
            <Link className="btn btn--primary" to="/learn">
              Browse lessons
            </Link>
            <Link className="btn btn--ghost" to="/quiz">
              Take a quiz
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
