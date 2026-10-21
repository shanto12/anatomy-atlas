import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';

import { systemsById } from '@/data';
import type { QuizBest } from '@/lib/progress';
import {
  difficultyLabel,
  formatPercent,
  formatScore,
  gradeFeedback,
  optionLetter,
  percentOf,
  type QuizRecommendation,
  type QuizResult,
} from '@/lib/quiz';

export interface ResultSummaryProps {
  result: QuizResult;
  title: string;
  best?: QuizBest;
  improved: boolean;
  onRetry: () => void;
  backHref: string;
  backLabel: string;
  recommendations: QuizRecommendation[];
}

type ReviewFilter = 'all' | 'missed';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
}

/**
 * The end of an attempt, handled with care: a plain score, honest feedback,
 * the explanations that matter, and a way back or forward. No confetti, no shame.
 */
export default function ResultSummary({
  result,
  title,
  best,
  improved,
  onRetry,
  backHref,
  backLabel,
  recommendations,
}: ResultSummaryProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const feedback = gradeFeedback(result.percent);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - result.percent / 100);

  const visibleAnswers = useMemo(
    () => (filter === 'missed' ? result.missed : result.answers),
    [filter, result.answers, result.missed],
  );

  const bestPercent = best ? percentOf(best.score, best.total) : undefined;

  return (
    <section className="result-summary" aria-labelledby="quiz-result-heading">
      <header className="result-summary__header">
        <div className="result-ring" aria-hidden="true">
          <svg viewBox="0 0 128 128" focusable="false">
            <circle className="result-ring__track" cx="64" cy="64" r={radius} />
            <circle
              className={`result-ring__value result-ring__value--${feedback.band}`}
              cx="64"
              cy="64"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="result-ring__label">
            <span className="result-ring__percent">{formatPercent(result.percent)}</span>
            <span className="result-ring__caption">your score</span>
          </div>
        </div>

        <div className="result-summary__intro">
          <p className="eyebrow">{title}</p>
          <h2 id="quiz-result-heading" tabIndex={-1} className="h2 result-summary__headline">
            {feedback.headline}
          </h2>
          <p className="lede result-summary__message">{feedback.message}</p>
          <p className="result-summary__score-line">
            <strong>
              {formatScore(result.score, result.total)} correct
            </strong>
            <span aria-hidden="true"> · </span>
            {formatPercent(result.percent)}
          </p>
          {improved ? (
            <p className="result-summary__best result-summary__best--new">New best on this device.</p>
          ) : best && bestPercent !== undefined ? (
            <p className="result-summary__best">
              Best so far: {formatScore(best.score, best.total)} ({formatPercent(bestPercent)})
              {best.at ? ` · ${formatDate(best.at)}` : ''}
            </p>
          ) : null}
        </div>
      </header>

      <div className="result-summary__actions">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          Retry quiz
        </button>
        <Link className="btn btn--ghost" to={backHref}>
          {backLabel}
        </Link>
      </div>

      {recommendations.length > 0 ? (
        <div className="result-summary__next">
          <p className="caps">A sensible next step</p>
          <ul>
            {recommendations.map((recommendation) => (
              <li key={recommendation.href}>
                <Link to={recommendation.href} className="result-summary__next-link">
                  <span>
                    <strong>{recommendation.label}</strong>
                    <span className="result-summary__next-description">{recommendation.description}</span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="result-review">
        <div className="result-review__toolbar">
          <h3 className="h3">Review your answers</h3>
          <div className="result-review__filters" role="group" aria-label="Filter reviewed answers">
            <button
              type="button"
              className={`filter-chip${filter === 'all' ? ' is-active' : ''}`}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All answers ({result.total})
            </button>
            <button
              type="button"
              className={`filter-chip${filter === 'missed' ? ' is-active' : ''}`}
              aria-pressed={filter === 'missed'}
              onClick={() => setFilter('missed')}
            >
              Missed ({result.missed.length})
            </button>
          </div>
        </div>

        {visibleAnswers.length === 0 ? (
          <p className="result-review__empty">
            Nothing missed. Every answer was correct — read through the explanations for the ones that felt uncertain.
          </p>
        ) : (
          <ol className="result-review__list">
            {visibleAnswers.map((answer) => {
              const system = systemsById[answer.question.systemId];
              const chosen = answer.selectedIndex;
              return (
                <li
                  key={answer.question.id}
                  className={`result-review__item${answer.correct ? ' is-correct' : ' is-incorrect'}`}
                >
                  <div className="result-review__item-head">
                    <span className={`result-review__mark${answer.correct ? ' is-correct' : ' is-incorrect'}`} aria-hidden="true">
                      {answer.correct ? <Check size={15} /> : <X size={15} />}
                    </span>
                    <span className="caps">{system?.shortName ?? 'Question'}</span>
                    <span className="quiz-chip quiz-chip--sm">{difficultyLabel(answer.question.difficulty)}</span>
                  </div>

                  <h4 className="result-review__question">{answer.question.question}</h4>

                  <dl className="result-review__answers">
                    <div>
                      <dt>Your answer</dt>
                      <dd className={answer.correct ? 'is-correct' : 'is-incorrect'}>
                        {chosen === null ? (
                          'Not answered'
                        ) : (
                          <>
                            <span className="result-review__letter">{optionLetter(chosen)}</span>{' '}
                            {answer.question.options[chosen]}
                          </>
                        )}
                      </dd>
                    </div>
                    {!answer.correct ? (
                      <div>
                        <dt>Correct answer</dt>
                        <dd className="is-correct">
                          <span className="result-review__letter">{optionLetter(answer.question.answerIndex)}</span>{' '}
                          {answer.question.options[answer.question.answerIndex]}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <p className="result-review__explanation">{answer.question.explanation}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
