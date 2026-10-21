import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import QuestionCard from '@/components/learn/QuestionCard';
import ResultSummary from '@/components/learn/ResultSummary';
import { systemsById } from '@/data';
import { isBetterQuizResult, type QuizBest } from '@/lib/progress';
import {
  formatPercent,
  formatScore,
  percentOf,
  quizRecommendations,
  scoreQuiz,
  type PreparedQuiz,
  type QuizResult,
} from '@/lib/quiz';

export interface QuizRunnerProps {
  quiz: PreparedQuiz;
  best?: QuizBest;
  onSaveResult: (quizId: string, score: number, total: number) => void;
  backHref: string;
  backLabel: string;
  lessonHref?: string;
  lessonLabel?: string;
  nextHref?: string;
  nextLabel?: string;
}

type Phase = 'intro' | 'playing' | 'result';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The whole quiz loop: a quiet introduction, one question at a time, instant
 * explanations, then a score with a review. Best scores persist locally; the
 * attempt itself is never stored or shared.
 */
export default function QuizRunner({
  quiz,
  best,
  onSaveResult,
  backHref,
  backLabel,
  lessonHref,
  lessonLabel,
  nextHref,
  nextLabel,
}: QuizRunnerProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [improved, setImproved] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const total = quiz.questions.length;
  const isFinal = quiz.systemIds.length > 1;

  const scrollToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
  }, []);

  // Reset cleanly if this component is reused for a different quiz.
  useEffect(() => {
    setPhase('intro');
    setIndex(0);
    setAnswers(quiz.questions.map(() => null));
    setRevealed(false);
    setResult(null);
    setImproved(false);
  }, [quiz.id]);

  // When the score screen appears, scroll up and put focus on its heading.
  useEffect(() => {
    if (phase !== 'result') return;
    scrollToTop();
    const heading = document.getElementById('quiz-result-heading');
    heading?.focus({ preventScroll: true });
  }, [phase, scrollToTop]);

  const start = useCallback(() => {
    setPhase('playing');
    setIndex(0);
    setAnswers(quiz.questions.map(() => null));
    setRevealed(false);
    setResult(null);
    setImproved(false);
    scrollToTop();
  }, [quiz.questions, scrollToTop]);

  const selectOption = useCallback((optionIndex: number) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[index] = optionIndex;
      return next;
    });
  }, [index]);

  const submitAnswer = useCallback(() => {
    if (answers[index] === null) return;
    setRevealed(true);
  }, [answers, index]);

  const finish = useCallback(() => {
    const scored = scoreQuiz(quiz.questions, answers, quiz.id);
    const beatBest = Boolean(best) && isBetterQuizResult(best, scored.score, scored.total);
    setResult(scored);
    setImproved(beatBest);
    onSaveResult(quiz.id, scored.score, scored.total);
    setPhase('result');
  }, [answers, best, onSaveResult, quiz.id, quiz.questions]);

  const nextQuestion = useCallback(() => {
    if (index >= total - 1) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(false);
  }, [finish, index, total]);

  if (total === 0) {
    return (
      <section className="quiz-empty">
        <p className="eyebrow">Quiz</p>
        <h1 className="h1">Questions for this quiz are still being written.</h1>
        <p className="lede">
          The content team is checking every question against the lesson it belongs to. In the meantime, the lesson is
          ready to read.
        </p>
        <div className="quiz-intro__actions">
          {lessonHref ? (
            <Link className="btn btn--primary" to={lessonHref}>
              {lessonLabel ?? 'Read the lesson'}
            </Link>
          ) : null}
          <Link className="btn btn--ghost" to={backHref}>
            {backLabel}
          </Link>
        </div>
      </section>
    );
  }

  const question = quiz.questions[Math.min(index, total - 1)];
  const bestPercent = best ? percentOf(best.score, best.total) : undefined;
  const recommendations =
    result &&
    quizRecommendations(result, {
      lessonHref,
      lessonLabel,
      nextHref,
      nextLabel,
    });
  const systemName = isFinal ? systemsById[question.systemId]?.shortName : undefined;

  return (
    <div className="quiz-runner" ref={topRef}>
      {phase !== 'intro' ? <h1 className="visually-hidden">{quiz.title}</h1> : null}

      {phase === 'intro' ? (
        <section className="quiz-intro" aria-labelledby="quiz-intro-title">
          <p className="eyebrow">{isFinal ? 'Final exam' : 'System quiz'}</p>
          <h1 id="quiz-intro-title" className="h1 quiz-intro__title">
            {quiz.title}
          </h1>
          <p className="lede quiz-intro__lede">{quiz.subtitle}</p>

          <ul className="quiz-intro__meta">
            <li>
              <strong>{total}</strong> questions
            </li>
            <li>
              <strong>No timer</strong> — take all the time you need
            </li>
            <li>
              <strong>An explanation</strong> after every answer
            </li>
          </ul>

          {best && bestPercent !== undefined ? (
            <p className="quiz-intro__best">
              Your best so far: {formatScore(best.score, best.total)} ({formatPercent(bestPercent)}). Retrying never
              replaces a better score.
            </p>
          ) : null}

          <div className="quiz-intro__actions">
            <button type="button" className="btn btn--primary" onClick={start}>
              Start quiz
            </button>
            <Link className="btn btn--ghost" to={backHref}>
              {backLabel}
            </Link>
          </div>
          <p className="quiz-intro__note">
            Nothing is timed and nothing is shared. Your best score is saved only in this browser.
          </p>
        </section>
      ) : null}

      {phase === 'playing' ? (
        <div className="quiz-play">
          <div className="quiz-play__top">
            <div className="quiz-play__progress">
              <span className="caps">
                Question {index + 1} of {total}
              </span>
              <div
                className="progress-bar"
                role="progressbar"
                aria-label="Quiz progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(((index + 1) / total) * 100)}
                aria-valuetext={`Question ${index + 1} of ${total}`}
              >
                <span style={{ width: `${((index + 1) / total) * 100}%` }} />
              </div>
            </div>
            <Link to={backHref} className="quiz-play__leave">
              Leave quiz
            </Link>
          </div>

          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            total={total}
            systemName={systemName}
            selectedIndex={answers[index] ?? null}
            revealed={revealed}
            isLast={index === total - 1}
            onSelect={selectOption}
            onSubmit={submitAnswer}
            onNext={nextQuestion}
          />
        </div>
      ) : null}

      {phase === 'result' && result ? (
        <ResultSummary
          result={result}
          title={quiz.title}
          best={best}
          improved={improved}
          onRetry={start}
          backHref={backHref}
          backLabel={backLabel}
          recommendations={recommendations ?? []}
        />
      ) : null}
    </div>
  );
}
