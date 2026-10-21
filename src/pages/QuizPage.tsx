import { useMemo, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Clock, GraduationCap, ListChecks } from 'lucide-react';

import QuizRunner from '@/components/learn/QuizRunner';
import { getSystem, systems } from '@/data';
import { useProgress } from '@/lib/progress';
import {
  buildFinalExam,
  buildSystemQuiz,
  FINAL_EXAM_ID,
  finalExamSize,
  formatPercent,
  formatScore,
  percentOf,
} from '@/lib/quiz';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function QuizPage() {
  const { systemId } = useParams();
  const isHub = !systemId;
  const isFinal = systemId === 'final';
  const system = getSystem(systemId);

  const { getQuizBest, saveQuizResult } = useProgress();

  const quiz = useMemo(() => {
    if (isFinal) return buildFinalExam(systems);
    if (system) return buildSystemQuiz(system);
    return null;
  }, [isFinal, system]);

  const finalBest = getQuizBest(FINAL_EXAM_ID);
  const finalCount = useMemo(() => finalExamSize(systems), []);
  const attemptedCount = systems.filter((item) => Boolean(getQuizBest(item.id))).length;

  usePageMeta({
    title: isFinal
      ? 'Final Exam'
      : system
        ? `${system.name} Quiz`
        : 'Quizzes',
    description: isFinal
      ? 'A final exam of two questions from every body system, with explanations for every answer.'
      : system
        ? `Test your knowledge of the ${system.name.toLowerCase()} with explained questions.`
        : 'Short quizzes on every body system with an explanation for every answer. No timer, no account.',
    path: systemId ? `/quiz/${systemId}` : '/quiz',
    noindex: !isHub && !isFinal && !system,
  });

  if (!isHub && !isFinal && !system) return <NotFoundPage />;

  if (quiz) {
    const nextSystemIndex = system ? systems.findIndex((item) => item.id === system.id) + 1 : -1;
    const nextSystem = nextSystemIndex > 0 ? systems[nextSystemIndex] : undefined;
    const nextHref = isFinal ? '/glossary' : nextSystem ? `/quiz/${nextSystem.id}` : '/quiz/final';
    const nextLabel = isFinal
      ? 'Explore the glossary'
      : nextSystem
        ? `Next: ${nextSystem.shortName} quiz`
        : 'Try the final exam';

    return (
      <div className={`quiz-page${system ? ' sys-accent' : ''}`}>
        <div className="container container--narrow section quiz-page__inner">
          <QuizRunner
            key={quiz.id}
            quiz={quiz}
            best={getQuizBest(quiz.id)}
            onSaveResult={saveQuizResult}
            backHref="/quiz"
            backLabel="Back to quizzes"
            lessonHref={system ? `/learn/${system.lesson.id}` : '/learn'}
            lessonLabel={system ? 'Read the lesson' : 'Review the lessons'}
            nextHref={nextHref}
            nextLabel={nextLabel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="container quiz-hub">
        <header className="quiz-hub__hero">
          <div>
            <p className="eyebrow">Quizzes</p>
            <h1 className="display quiz-hub__title">
              Test yourself,
              <br />
              <em>gently.</em>
            </h1>
            <p className="lede quiz-hub__lede">
              Short quizzes on every system, plus one final exam that gathers them all. No timer, no streak to protect —
              every answer comes with an explanation, and your best score stays in this browser.
            </p>
          </div>
          <div className="quiz-hub__side">
            <p className="quiz-hub__side-stat">
              <strong>{attemptedCount}</strong> of {systems.length} system quizzes attempted
            </p>
            <Link to="/learn" className="text-link quiz-hub__lessons-link">
              Back to lessons
            </Link>
          </div>
        </header>

        {systems.length === 0 ? (
          <div className="learn-empty">
            <h2 className="h3">The questions are being checked against the lessons.</h2>
            <p className="lede">Quizzes appear here as each system's content is finished and fact-checked.</p>
            <div className="learn-empty__actions">
              <Link className="btn btn--primary" to="/systems">
                Browse systems
              </Link>
              <Link className="btn btn--ghost" to="/learn">
                Back to lessons
              </Link>
            </div>
          </div>
        ) : (
          <>
            <Link to="/quiz/final" className="final-exam-card">
              <div className="final-exam-card__copy">
                <p className="caps final-exam-card__caps">
                  <GraduationCap size={15} aria-hidden="true" />
                  Final exam
                </p>
                <h2 className="h2 final-exam-card__title">Two questions from every system.</h2>
                <p className="final-exam-card__text">
                  One paper, mixed across {systems.length} systems — a way to see the whole map at once. Nothing is
                  timed, and you can retry as often as you like.
                </p>
                <ul className="final-exam-card__meta">
                  <li>
                    <ListChecks size={15} aria-hidden="true" />
                    {finalCount} questions
                  </li>
                  <li>
                    <Clock size={15} aria-hidden="true" />
                    No timer
                  </li>
                  <li>
                    <ArrowRight size={15} aria-hidden="true" />
                    Explanations after each answer
                  </li>
                </ul>
                {finalBest ? (
                  <p className="final-exam-card__best">
                    Best so far: {formatScore(finalBest.score, finalBest.total)} (
                    {formatPercent(percentOf(finalBest.score, finalBest.total))})
                  </p>
                ) : null}
              </div>
              <span className="btn btn--primary final-exam-card__cta">
                Start final exam
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>

            <section className="quiz-hub__systems" aria-labelledby="system-quizzes-title">
              <div className="quiz-hub__section-head">
                <h2 id="system-quizzes-title" className="h2">
                  One system at a time
                </h2>
                <p className="small">Eight questions each · retry any time · best score kept</p>
              </div>
              <ol className="quiz-hub__grid">
                {systems.map((item) => {
                  const best = getQuizBest(item.id);
                  const bestPercent = best ? percentOf(best.score, best.total) : undefined;
                  return (
                    <li key={item.id}>
                      <Link
                        to={`/quiz/${item.id}`}
                        className="quiz-hub-card"
                        style={{ '--sys': item.color } as CSSProperties}
                      >
                        <span className="quiz-hub-card__system">
                          <span className="quiz-hub-card__dot" aria-hidden="true" />
                          {item.shortName}
                        </span>
                        <h3 className="quiz-hub-card__title">{item.name}</h3>
                        <p className="quiz-hub-card__tagline">{item.tagline}</p>
                        <div className="quiz-hub-card__meta">
                          <span>{item.quiz.length} questions</span>
                          {best && bestPercent !== undefined ? (
                            <span className="quiz-hub-card__best">
                              Best {formatScore(best.score, best.total)} · {formatPercent(bestPercent)}
                            </span>
                          ) : (
                            <span className="quiz-hub-card__untried">Not tried yet</span>
                          )}
                        </div>
                        <span className="quiz-hub-card__cta">
                          Start quiz
                          <ArrowRight size={15} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>

            <p className="quiz-hub__privacy">
              Best scores are saved only in this browser. Nothing is sent anywhere, and there is no account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
