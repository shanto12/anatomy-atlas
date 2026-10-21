import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, GraduationCap, ListChecks, Sparkles } from 'lucide-react';

import ProgressDashboard from '@/components/learn/ProgressDashboard';
import { lessons, systems } from '@/data';
import type { SystemId } from '@/lib/types';
import { useProgress } from '@/lib/progress';
import { usePageMeta } from '@/lib/seo';

type Filter = 'all' | SystemId;

export default function LearnPage() {
  usePageMeta({
    title: 'Guided Lessons',
    description:
      'Twelve short guided lessons through the systems of the human body, with a saved reading progress for each.',
    path: '/learn',
  });

  const { isLessonComplete, hasProgress, completedLessonCount } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');

  const totalSteps = useMemo(
    () => lessons.reduce((total, lesson) => total + lesson.steps.length, 0),
    [],
  );
  const totalMinutes = useMemo(
    () => lessons.reduce((total, lesson) => total + lesson.durationMin, 0),
    [],
  );

  const nextSystem = useMemo(() => systems.find((system) => !isLessonComplete(system.lesson.id)), [
    systems,
    isLessonComplete,
  ]);

  const visibleSystems = useMemo(
    () => (filter === 'all' ? systems : systems.filter((system) => system.id === filter)),
    [filter],
  );

  return (
    <div className="learn-page">
      <section className="container learn-hero">
        <div className="learn-hero__copy">
          <p className="eyebrow">Guided lessons</p>
          <h1 className="display learn-hero__title">
            Learn the body,
            <br />
            <em>one idea at a time.</em>
          </h1>
          <p className="lede learn-hero__lede">
            {lessons.length > 0
              ? `${lessons.length} short lessons, each a walk through one system with stops at the organs that matter most. No timer, no account — just a calm place to understand yourself.`
              : 'Short, calm walks through the systems of the human body. The first lessons are being finished now.'}
          </p>
          {lessons.length > 0 ? (
            <dl className="learn-hero__stats">
              <div>
                <dt>{lessons.length}</dt>
                <dd>lessons</dd>
              </div>
              <div>
                <dt>{totalSteps}</dt>
                <dd>steps</dd>
              </div>
              <div>
                <dt>{totalMinutes}</dt>
                <dd>minutes of reading</dd>
              </div>
            </dl>
          ) : null}
        </div>

        {nextSystem ? (
          <aside className="continue-card" aria-labelledby="continue-title">
            <p className="caps continue-card__caps">
              {hasProgress ? 'Continue learning' : 'A good place to start'}
            </p>
            <h2 id="continue-title" className="h3 continue-card__title">
              {nextSystem.lesson.title}
            </h2>
            <p className="continue-card__subtitle">{nextSystem.lesson.subtitle}</p>
            <p className="small continue-card__meta">
              {nextSystem.name} · {nextSystem.lesson.durationMin} min · {nextSystem.lesson.steps.length} steps
            </p>
            <Link className="btn btn--primary continue-card__cta" to={`/learn/${nextSystem.lesson.id}`}>
              {hasProgress ? 'Continue lesson' : 'Start lesson'}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p className="continue-card__note">
              {completedLessonCount === 0
                ? 'Read at your own pace. Progress is saved in this browser.'
                : `${completedLessonCount} of ${lessons.length} lessons completed.`}
            </p>
          </aside>
        ) : lessons.length > 0 ? (
          <aside className="continue-card continue-card--complete" aria-labelledby="continue-title">
            <p className="caps continue-card__caps">
              <Sparkles size={14} aria-hidden="true" /> Every lesson read
            </p>
            <h2 id="continue-title" className="h3 continue-card__title">
              You have walked the whole body.
            </h2>
            <p className="continue-card__subtitle">
              Gather it together with the final exam, or revisit any system from the catalog below.
            </p>
            <Link className="btn btn--primary continue-card__cta" to="/quiz/final">
              <GraduationCap size={16} aria-hidden="true" />
              Take the final exam
            </Link>
          </aside>
        ) : null}
      </section>

      {lessons.length === 0 ? (
        <section className="container section--tight">
          <div className="learn-empty">
            <h2 className="h3">The lessons are being written and fact-checked.</h2>
            <p className="lede">
              Each lesson is checked against reliable anatomy sources before it appears here. The body systems and organ
              entries are already worth exploring.
            </p>
            <div className="learn-empty__actions">
              <Link className="btn btn--primary" to="/systems">
                Browse body systems
              </Link>
              <Link className="btn btn--ghost" to="/explore">
                Explore the body
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="container learn-dashboard-section" aria-label="Your learning progress">
            <ProgressDashboard />
          </section>

          <section className="container learn-catalog" aria-labelledby="lesson-catalog-title">
            <div className="learn-catalog__head">
              <div>
                <p className="eyebrow">The catalog</p>
                <h2 id="lesson-catalog-title" className="h2 learn-catalog__title">
                  Every lesson, in order
                </h2>
              </div>
              <p className="small learn-catalog__count">
                {completedLessonCount} of {lessons.length} complete
              </p>
            </div>

            <div className="learn-filters" role="group" aria-label="Filter lessons by system">
              <button
                type="button"
                className={`filter-chip${filter === 'all' ? ' is-active' : ''}`}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All systems ({systems.length})
              </button>
              {systems.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  className={`filter-chip${filter === system.id ? ' is-active' : ''}`}
                  aria-pressed={filter === system.id}
                  onClick={() => setFilter(filter === system.id ? 'all' : system.id)}
                  style={{ '--sys': system.color } as CSSProperties}
                >
                  <span className="filter-chip__dot" aria-hidden="true" />
                  {system.shortName}
                </button>
              ))}
            </div>

            <ol className="learn-lessons">
              {visibleSystems.map((system) => {
                const position = systems.findIndex((item) => item.id === system.id) + 1;
                const completed = isLessonComplete(system.lesson.id);
                return (
                  <li key={system.id}>
                    <Link
                      to={`/learn/${system.lesson.id}`}
                      className={`learn-lesson-card${completed ? ' is-complete' : ''}`}
                      style={{ '--sys': system.color } as CSSProperties}
                    >
                      <div className="learn-lesson-card__top">
                        <span className="learn-lesson-card__number" aria-hidden="true">
                          {String(position).padStart(2, '0')}
                        </span>
                        <span className="learn-lesson-card__system">
                          <span className="learn-lesson-card__dot" aria-hidden="true" />
                          {system.name}
                        </span>
                        {completed ? (
                          <span className="learn-lesson-card__status">
                            <Check size={13} aria-hidden="true" />
                            Completed
                          </span>
                        ) : null}
                      </div>
                      <h3 className="learn-lesson-card__title">{system.lesson.title}</h3>
                      <p className="learn-lesson-card__subtitle">{system.lesson.subtitle}</p>
                      <div className="learn-lesson-card__meta">
                        <span>
                          <Clock size={14} aria-hidden="true" />
                          {system.lesson.durationMin} min
                        </span>
                        <span>
                          <ListChecks size={14} aria-hidden="true" />
                          {system.lesson.steps.length} steps
                        </span>
                        <span className="learn-lesson-card__level">
                          {system.lesson.level === 'beginner' ? 'Beginner' : 'Intermediate'}
                        </span>
                        <span className="learn-lesson-card__action" aria-hidden="true">
                          {completed ? 'Read again' : 'Read lesson'}
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="container learn-quiz-cta" aria-labelledby="learn-quiz-cta-title">
            <div>
              <p className="eyebrow">Ready to check?</p>
              <h2 id="learn-quiz-cta-title" className="h3">
                Quizzes explain every answer.
              </h2>
              <p className="small">
                Take a short quiz after a lesson, or the final exam once the whole map is familiar. Best scores are kept
                in this browser.
              </p>
            </div>
            <div className="learn-quiz-cta__actions">
              <Link className="btn btn--primary" to="/quiz">
                Browse quizzes
              </Link>
              <Link className="btn btn--ghost" to="/quiz/final">
                Final exam
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
