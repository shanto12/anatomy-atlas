import { Link, useParams } from 'react-router-dom';

import { getSystem, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function QuizPage() {
  const { systemId } = useParams();
  const system = getSystem(systemId);

  usePageMeta({
    title: system ? `${system.name} Quiz` : 'Quizzes',
    description: 'Test your anatomy knowledge with short, explained quizzes.',
    path: system ? `/quiz/${system.id}` : '/quiz',
  });

  return (
    <div className="container section">
      <p className="eyebrow">Quiz</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        {system ? `${system.name} quiz` : 'Test yourself'}
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        The full quiz engine — one question at a time, with explanations for every answer — is being assembled.
      </p>
      <div className="organ-grid" style={{ marginTop: 40 }}>
        {systems.map((s) => (
          <Link key={s.id} to={`/quiz/${s.id}`} className="organ-card">
            <h2 className="h3">{s.name}</h2>
            <p>{s.quiz.length} questions</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
