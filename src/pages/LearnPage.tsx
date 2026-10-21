import { Link } from 'react-router-dom';

import { lessons, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function LearnPage() {
  usePageMeta({
    title: 'Guided Lessons',
    description: 'Short guided lessons that explain the systems of the human body, one organ at a time.',
    path: '/learn',
  });

  return (
    <div className="container section">
      <p className="eyebrow">Guided lessons</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        Learn the body, system by system.
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        Each lesson is a short walk through one system, with stops at the organs that matter most.
      </p>
      <div className="lesson-grid" style={{ marginTop: 48 }}>
        {systems.map((system) => (
          <Link key={system.id} to={`/learn/${system.lesson.id}`} className="lesson-card">
            <span className="caps">{system.shortName}</span>
            <h2 className="h3">{system.lesson.title}</h2>
            <p>{system.lesson.subtitle}</p>
            <span className="small">
              {system.lesson.durationMin} min · {system.lesson.steps.length} steps
            </span>
          </Link>
        ))}
      </div>
      {lessons.length === 0 ? <p className="small">Lessons are loading…</p> : null}
    </div>
  );
}
