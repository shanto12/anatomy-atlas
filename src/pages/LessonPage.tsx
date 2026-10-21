import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getLesson, getOrgan, getSystem } from '@/data';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function LessonPage() {
  const { lessonId } = useParams();
  const lesson = getLesson(lessonId);
  const system = getSystem(lessonId?.replace('lesson-', ''));
  const [step, setStep] = useState(0);

  usePageMeta({
    title: lesson ? lesson.title : 'Lesson not found',
    description: lesson?.subtitle ?? 'A guided anatomy lesson.',
    path: `/learn/${lessonId ?? ''}`,
    noindex: !lesson,
  });

  if (!lesson) return <NotFoundPage />;

  const current = lesson.steps[step];
  const organ = current?.organId ? getOrgan(current.organId) : undefined;
  const isLast = step === lesson.steps.length - 1;

  return (
    <div className="container container--narrow section">
      <p className="eyebrow">{system?.name ?? 'Lesson'}</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        {lesson.title}
      </h1>
      <p className="lede" style={{ marginTop: 12 }}>
        {lesson.subtitle}
      </p>
      <p className="small" style={{ marginTop: 12 }}>
        Step {step + 1} of {lesson.steps.length}
      </p>
      <div style={{ marginTop: 40 }}>
        <h2 className="h2">{current.title}</h2>
        <p style={{ marginTop: 16, lineHeight: 1.7 }}>{current.body}</p>
        {current.keyPoint ? (
          <p className="lesson-keypoint" style={{ marginTop: 24 }}>
            {current.keyPoint}
          </p>
        ) : null}
        {organ ? (
          <Link to={`/organs/${organ.id}`} className="text-link" style={{ display: 'inline-block', marginTop: 20 }}>
            Explore the {organ.name} →
          </Link>
        ) : null}
      </div>
      <div className="cluster" style={{ marginTop: 48 }}>
        <button type="button" className="btn btn--ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        {isLast ? (
          <Link className="btn btn--primary" to={`/quiz/${system?.id ?? ''}`}>
            Take the quiz
          </Link>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setStep((s) => s + 1)}>
            Next step
          </button>
        )}
      </div>
    </div>
  );
}
